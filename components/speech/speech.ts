"use client";
// 브라우저 내장 TTS(speechSynthesis). 설정은 기기마다 목소리가 달라 localStorage에 둔다
import { useSyncExternalStore } from "react";
import { DEFAULT_SPEECH_PREFS, parseSpeechPrefs, pickVoice, splitPartsForSpeech, type SpeechPrefs } from "@/lib/domain/speech";
import { hqReady, speakHq, stopHq } from "./supertonic";

export const SPEECH_KEY = "j6_tts";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === SPEECH_KEY && cb();
  window.addEventListener("storage", onStorage);
  const synth = supported() ? window.speechSynthesis : null;
  // 목소리 목록은 늦게 채워지는 브라우저가 많다
  synth?.addEventListener?.("voiceschanged", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
    synth?.removeEventListener?.("voiceschanged", cb);
  };
}

export function supported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

// ---- 설정 ----

let prefsRaw: string | null | undefined;
let prefsVal: SpeechPrefs = DEFAULT_SPEECH_PREFS;

function prefsSnapshot(): SpeechPrefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SPEECH_KEY);
  } catch {
    raw = null;
  }
  if (raw !== prefsRaw) {
    prefsRaw = raw;
    prefsVal = parseSpeechPrefs(raw);
  }
  return prefsVal;
}

export function useSpeechPrefs(): SpeechPrefs {
  return useSyncExternalStore(subscribe, prefsSnapshot, () => DEFAULT_SPEECH_PREFS);
}

export function saveSpeechPrefs(patch: Partial<SpeechPrefs>): void {
  const next = { ...prefsSnapshot(), ...patch };
  try {
    localStorage.setItem(SPEECH_KEY, JSON.stringify(next));
  } catch {
    // 저장이 막혀도 이번 화면에서는 반영한다
    prefsRaw = JSON.stringify(next);
    prefsVal = next;
  }
  if (!next.on) stop();
  emit();
}

// ---- 목소리 ----

let voicesKey = "";
let voicesVal: SpeechSynthesisVoice[] = [];
const NO_VOICES: SpeechSynthesisVoice[] = [];

function voicesSnapshot(): SpeechSynthesisVoice[] {
  if (!supported()) return NO_VOICES;
  const list = window.speechSynthesis.getVoices();
  const key = list.map((v) => v.voiceURI).join("|");
  if (key !== voicesKey) {
    voicesKey = key;
    voicesVal = list;
  }
  return voicesVal;
}

export function useVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribe, voicesSnapshot, () => NO_VOICES);
}

/** 서버 렌더와 첫 그리기에서는 false. 버튼이 깜빡 나타났다 사라지지 않게 한다 */
export function useSpeechSupported(): boolean {
  return useSyncExternalStore(subscribe, supported, () => false);
}

// ---- 재생 ----

/** 지금 읽는 버튼의 id. 한 번에 하나만 읽는다 */
let playing: string | null = null;
let run = 0;

export function usePlaying(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => playing,
    () => null,
  );
}

/** 지금 읽는 덩어리 번호(speak에 넘긴 parts의 몇 번째). 읽지 않으면 null */
let part: number | null = null;

function setPlaying(id: string | null) {
  playing = id;
  if (id === null) part = null;
  emit();
}

function setPart(p: number) {
  if (part === p) return;
  part = p;
  emit();
}

/** id인 버튼이 읽고 있을 때 지금 읽는 덩어리 번호. 화면에서 그 덩어리를 표시한다 */
export function useReadingPart(id: string): number | null {
  return useSyncExternalStore(
    subscribe,
    () => (playing === id ? part : null),
    () => null,
  );
}

export function stop(): void {
  run++;
  if (supported()) window.speechSynthesis.cancel();
  stopHq();
  if (playing !== null) setPlaying(null);
}

/** 이 버튼이 읽던 중일 때만 멈춘다 */
export function stopIf(id: string): void {
  if (playing === id) stop();
}

type Chunk = { text: string; part: number };

/**
 * 문장 단위로 이어서 읽는다. 다른 것을 읽기 시작하면 앞의 것은 멈춘다.
 * 고품질 목소리를 골라 두고 받아 뒀으면 그걸로, 아니면 기기 목소리로 읽는다.
 * text를 배열로 주면 각 항목이 화면의 한 덩어리이고, 읽는 동안 useReadingPart로 몇 번째인지 알 수 있다.
 */
export function speak(id: string, text: string | readonly string[], prefs: SpeechPrefs = prefsSnapshot()): void {
  stop();
  const chunks = splitPartsForSpeech(typeof text === "string" ? [text] : text);
  if (chunks.length === 0) return;
  if (prefs.engine === "hq" && hqReady()) {
    const mine = ++run;
    setPlaying(id);
    setPart(chunks[0].part);
    speakHq(
      chunks.map((c) => c.text),
      prefs.hqVoice,
      prefs.rate,
      {
        onChunk: (i) => mine === run && setPart(chunks[i].part),
        onEnd: () => mine === run && setPlaying(null),
        // 모델이 이 기기에서 못 돌면 읽던 문장부터 기기 목소리로 이어 읽는다
        onError: (from) => mine === run && speakDevice(id, chunks.slice(from), prefs),
      },
    );
    return;
  }
  speakDevice(id, chunks, prefs);
}

function speakDevice(id: string, chunks: Chunk[], prefs: SpeechPrefs): void {
  if (!supported()) {
    stop();
    return;
  }
  const synth = window.speechSynthesis;
  const voice = pickVoice(synth.getVoices(), prefs.voice);
  const mine = ++run;
  setPlaying(id);
  try {
    setPart(chunks[0].part);
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk.text);
      u.lang = voice?.lang ?? "ko-KR";
      if (voice) u.voice = voice;
      u.rate = prefs.rate;
      u.onstart = () => mine === run && setPart(chunk.part);
      if (i === chunks.length - 1) {
        u.onend = () => mine === run && setPlaying(null);
      }
      u.onerror = () => mine === run && stop();
      synth.speak(u);
    });
  } catch {
    // 브라우저가 목소리나 발화를 거절하면 버튼을 원래대로 돌린다
    stop();
    return;
  }
  // iOS·크롬에서 이전 cancel 직후 일시정지 상태로 남는 경우가 있다
  synth.resume();
}
