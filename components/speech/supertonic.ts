"use client";
// 고품질 목소리(Supertonic 2)의 화면 쪽: 받기 상태, 워커, 소리 재생
import { useSyncExternalStore } from "react";
import {
  isMetered,
  megabytes,
  missingBytes,
  pcmKey,
  SizedLru,
  storageRoom,
  SUPERTONIC_BASE,
  SUPERTONIC_BASE_SPEED,
  SUPERTONIC_FILES,
  SUPERTONIC_TOTAL_BYTES,
  type SupertonicVoice,
} from "@/lib/domain/supertonic";
import { SUPERTONIC_CACHE, type WorkerIn, type WorkerOut } from "./supertonic-protocol";

export type HqState =
  | { kind: "unknown" }
  | { kind: "unsupported" }
  | { kind: "none" }
  | { kind: "downloading"; loaded: number; total: number }
  /** persisted: 브라우저가 공간이 모자라도 지우지 않기로 했는지. 모르면 null */
  | { kind: "ready"; persisted: boolean | null }
  | { kind: "error"; message: string };

let state: HqState = { kind: "unknown" };
const listeners = new Set<() => void>();

function set(next: HqState) {
  state = next;
  listeners.forEach((l) => l());
}

/** 브라우저가 워커·Cache Storage·WebAssembly·Web Audio를 모두 지원해야 쓴다 */
export function hqSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    "caches" in window &&
    typeof WebAssembly !== "undefined" &&
    typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) !== "undefined"
  );
}

async function cachedFlags(): Promise<boolean[]> {
  const cache = await caches.open(SUPERTONIC_CACHE);
  const hits = await Promise.all(SUPERTONIC_FILES.map((f) => cache.match(`${SUPERTONIC_BASE}/${f.path}`)));
  return hits.map(Boolean);
}

/** 받은 모델이 저장공간 정리 때 지워지지 않게 보존을 요청한다. 지원하지 않으면 null */
async function persist(): Promise<boolean | null> {
  try {
    const sm = navigator.storage;
    if (!sm?.persist) return null;
    if (sm.persisted && (await sm.persisted())) return true;
    return await sm.persist();
  } catch {
    return null;
  }
}

function setReady() {
  set({ kind: "ready", persisted: null });
  void persist().then((persisted) => {
    if (state.kind === "ready") set({ kind: "ready", persisted });
  });
}

let checked = false;
async function check() {
  if (checked) return;
  checked = true;
  if (!hqSupported()) return set({ kind: "unsupported" });
  try {
    const flags = await cachedFlags();
    if (state.kind !== "unknown") return;
    if (flags.every(Boolean)) setReady();
    else set({ kind: "none" });
  } catch {
    set({ kind: "unsupported" });
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  void check();
  return () => listeners.delete(cb);
}

export function useHqState(): HqState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export const hqReady = () => state.kind === "ready";

// ---- 워커 ----

let worker: Worker | null = null;
const handlers = new Set<(m: WorkerOut) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL("./supertonic.worker.ts", import.meta.url), { type: "module" });
  w.onmessage = (ev: MessageEvent<WorkerOut>) => handlers.forEach((h) => h(ev.data));
  w.onerror = () => handlers.forEach((h) => h({ t: "error", job: -1, kind: "warm", message: "worker" }));
  worker = w;
  return w;
}

const send = (m: WorkerIn) => getWorker().postMessage(m);

handlers.add((m) => {
  if (m.t === "progress" && state.kind === "downloading") set({ kind: "downloading", loaded: m.loaded, total: m.total });
  if (m.t === "downloaded") {
    setReady();
    // 받자마자 세션을 만들어 두면 첫 듣기가 빠르다
    send({ t: "warm" });
  }
  if (m.t === "error" && m.kind === "download") set({ kind: "error", message: "내려받지 못했어요. 연결을 확인하고 다시 눌러 주세요." });
});

/** 모바일 데이터로 연결돼 있으면 받기 전에 한 번 묻는다 */
export function onMeteredConnection(): boolean {
  const nav = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { connection?: Parameters<typeof isMetered>[0] });
  return isMetered(nav?.connection);
}

let starting = false;
export async function downloadHq(): Promise<void> {
  if (state.kind === "downloading" || starting) return;
  starting = true;
  try {
    // 반쯤 받다 멈췄으면 남은 것만 받으니, 남은 크기로 공간을 본다
    let need = SUPERTONIC_TOTAL_BYTES;
    try {
      need = missingBytes(await cachedFlags());
    } catch {
      // 캐시를 못 열면 전부 받는 것으로 본다
    }
    let est: StorageEstimate | null = null;
    try {
      est = (await navigator.storage?.estimate?.()) ?? null;
    } catch {
      // 모르면 일단 받아 본다
    }
    const room = storageRoom(est, need);
    if (!room.ok) {
      set({ kind: "error", message: `저장공간이 모자라요. ${megabytes(need)}가 필요한데 ${megabytes(room.free)}만 남았어요.` });
      return;
    }
    // 받기 버튼을 누른 순간에 요청해야 허락해 주는 브라우저가 있다
    void persist();
    set({ kind: "downloading", loaded: SUPERTONIC_TOTAL_BYTES - need, total: SUPERTONIC_TOTAL_BYTES });
    send({ t: "download" });
  } finally {
    starting = false;
  }
}

export async function removeHq(): Promise<void> {
  stopHq();
  made.clear();
  worker?.terminate();
  worker = null;
  try {
    await caches.delete(SUPERTONIC_CACHE);
  } catch {
    // 지우지 못해도 화면은 지운 것으로 둔다
  }
  set({ kind: "none" });
}

/** 받아 둔 모델로 세션을 미리 만든다(레슨 화면을 열 때) */
export function warmHq(): void {
  if (hqReady()) send({ t: "warm" });
}

// ---- 재생 ----

let ctx: AudioContext | null = null;
let job = 0;
let sources: AudioBufferSourceNode[] = [];
let timers: ReturnType<typeof setTimeout>[] = [];
let active: ((m: WorkerOut) => void) | null = null;

/**
 * 만든 소리를 최근 것부터 32MB(약 3분 분량)까지 둔다.
 * 레슨을 다시 듣거나 미리 듣기를 반복할 때 바로 나온다
 */
const made = new SizedLru<{ pcm: Float32Array; sampleRate: number }>(32_000_000, (v) => v.pcm.byteLength);

/** 누른 순간(사용자 동작 안)에 불러야 iOS에서 소리가 난다 */
function audio(): AudioContext {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C();
  }
  void ctx.resume();
  return ctx;
}

export function stopHq(): void {
  if (active) handlers.delete(active);
  active = null;
  if (job > 0 && worker) send({ t: "cancel", job });
  for (const s of sources) {
    s.onended = null;
    try {
      s.stop();
    } catch {
      // 아직 시작 전인 소스
    }
  }
  sources = [];
  timers.forEach(clearTimeout);
  timers = [];
}

/**
 * 문장들을 차례로 만들어 이어서 튼다. 앞 문장을 트는 동안 다음 문장을 만든다.
 * 문장을 틀기 시작할 때 onChunk(몇 번째), 끝나면 onEnd,
 * 모델이 실패하면 틀던 소리를 멈추고 onError(지금 읽던 문장 번호. 호출한 쪽이 그 문장부터 기기 목소리로 읽는다)
 */
export function speakHq(
  chunks: string[],
  voice: SupertonicVoice,
  rate: number,
  { onChunk, onEnd, onError }: { onChunk?: (seq: number) => void; onEnd: () => void; onError: (from: number) => void },
): void {
  stopHq();
  const ac = audio();
  const mine = ++job;
  let nextAt = 0;
  let expected = 0;
  let current = 0;
  const speed = SUPERTONIC_BASE_SPEED * rate;
  const pending = new Map<number, { pcm: Float32Array; sampleRate: number }>();

  // 순서대로만 이어 붙인다
  const drain = () => {
    while (pending.has(expected)) {
      const { pcm, sampleRate } = pending.get(expected)!;
      pending.delete(expected);
      const buf = ac.createBuffer(1, pcm.length, sampleRate);
      buf.getChannelData(0).set(pcm);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);
      const at = Math.max(ac.currentTime + 0.02, nextAt);
      src.start(at);
      const seq = expected;
      timers.push(
        setTimeout(
          () => {
            if (mine !== job) return;
            current = seq;
            onChunk?.(seq);
          },
          Math.max(0, (at - ac.currentTime) * 1000),
        ),
      );
      // 문장 사이에 짧게 쉰다
      nextAt = at + buf.duration + 0.25;
      sources.push(src);
      const last = expected === chunks.length - 1;
      src.onended = () => {
        sources = sources.filter((s) => s !== src);
        if (last) {
          handlers.delete(handler);
          if (mine === job) onEnd();
        }
      };
      expected++;
    }
  };

  const handler = (m: WorkerOut) => {
    if (m.t === "error" && (m.job === mine || m.job === -1)) {
      handlers.delete(handler);
      if (mine !== job) return;
      const from = current;
      stopHq();
      onError(from);
      return;
    }
    if (m.t !== "audio" || m.job !== mine) return;
    const sound = { pcm: m.pcm, sampleRate: m.sampleRate };
    made.set(pcmKey(voice, speed, chunks[m.seq]), sound);
    pending.set(m.seq, sound);
    drain();
  };
  handlers.add(handler);
  active = handler;

  // 만들어 둔 문장은 바로 쓰고, 없는 것만 워커에 맡긴다
  let asked = false;
  chunks.forEach((text, seq) => {
    const hit = made.get(pcmKey(voice, speed, text));
    if (hit) pending.set(seq, hit);
    else {
      asked = true;
      send({ t: "synth", job: mine, seq, text, voice, speed });
    }
  });
  if (!asked) handlers.delete(handler);
  drain();
}
