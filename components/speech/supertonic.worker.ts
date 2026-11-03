// 고품질 목소리 워커: 모델을 받아 Cache Storage에 두고, 문장을 받아 소리(PCM)를 돌려준다.
// 화면 스레드가 멈추지 않게 받기·추론을 모두 여기서 한다.
import * as ort from "onnxruntime-web/wasm";
import {
  latentLength,
  preprocessForSupertonic,
  SUPERTONIC_BASE,
  SUPERTONIC_FILES,
  SUPERTONIC_STEPS,
  textToIds,
  type SupertonicVoice,
} from "@/lib/domain/supertonic";
import { SUPERTONIC_CACHE, type WorkerIn, type WorkerOut } from "./supertonic-protocol";

// wasm 파일은 설치한 버전과 같은 것을 CDN에서 받는다(번들에 넣지 않는다)
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`;

const post = (m: WorkerOut, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

interface Cfg {
  ae: { sample_rate: number; base_chunk_size: number };
  ttl: { chunk_compress_factor: number; latent_dim: number };
}
interface StyleJson {
  style_ttl: { dims: number[]; data: unknown };
  style_dp: { dims: number[]; data: unknown };
}

const url = (path: string) => `${SUPERTONIC_BASE}/${path}`;

/** 받아 둔 파일을 꺼내고, 없으면 받으면서 진행률을 알린다 */
async function getFile(cache: Cache, path: string, onBytes: (n: number) => void): Promise<ArrayBuffer> {
  const hit = await cache.match(url(path));
  if (hit) {
    const buf = await hit.arrayBuffer();
    onBytes(buf.byteLength);
    return buf;
  }
  const res = await fetch(url(path));
  if (!res.ok || !res.body) throw new Error(`download ${path} ${res.status}`);
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    size += value.byteLength;
    onBytes(value.byteLength);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  await cache.put(url(path), new Response(out.buffer, { headers: { "content-type": "application/octet-stream" } }));
  return out.buffer;
}

/** 모든 파일을 받아 둔다(이미 있으면 건너뛴다). 세션은 만들지 않는다 */
async function download(): Promise<void> {
  const cache = await caches.open(SUPERTONIC_CACHE);
  const total = SUPERTONIC_FILES.reduce((n, f) => n + f.bytes, 0);
  let loaded = 0;
  let last = 0;
  for (const f of SUPERTONIC_FILES) {
    if (await cache.match(url(f.path))) {
      loaded += f.bytes;
      continue;
    }
    await getFile(cache, f.path, (n) => {
      loaded += n;
      // 너무 자주 보내지 않는다(0.5%마다)
      if (loaded - last > total / 200) {
        last = loaded;
        post({ t: "progress", loaded: Math.min(loaded, total), total });
      }
    });
  }
  post({ t: "progress", loaded: total, total });
}

interface Engine {
  cfg: Cfg;
  indexer: number[];
  dp: ort.InferenceSession;
  enc: ort.InferenceSession;
  est: ort.InferenceSession;
  voc: ort.InferenceSession;
  styles: Map<SupertonicVoice, { ttl: ort.Tensor; dp: ort.Tensor }>;
}

let engine: Promise<Engine> | null = null;

/**
 * wasm(CPU)으로만 돌린다. 이 모델은 작아서 CPU로도 문장당 1초 안쪽이고,
 * WebGPU는 소프트웨어 GPU로 잡히는 기기에서 50배 넘게 느려진 적이 있다
 */
async function createSessions(bufs: ArrayBuffer[]): Promise<ort.InferenceSession[]> {
  const out: ort.InferenceSession[] = [];
  for (const b of bufs) {
    out.push(await ort.InferenceSession.create(new Uint8Array(b), { executionProviders: ["wasm"], graphOptimizationLevel: "all", logSeverityLevel: 3 }));
  }
  return out;
}

async function load(): Promise<Engine> {
  const cache = await caches.open(SUPERTONIC_CACHE);
  const noop = () => {};
  const text = async (p: string) => new TextDecoder().decode(await getFile(cache, p, noop));
  const cfg = JSON.parse(await text("onnx/tts.json")) as Cfg;
  const indexer = JSON.parse(await text("onnx/unicode_indexer.json")) as number[];
  const bufs = [];
  for (const name of ["duration_predictor", "text_encoder", "vector_estimator", "vocoder"]) {
    bufs.push(await getFile(cache, `onnx/${name}.onnx`, noop));
  }
  const [dp, enc, est, voc] = await createSessions(bufs);
  return { cfg, indexer, dp, enc, est, voc, styles: new Map() };
}

function ensureEngine(): Promise<Engine> {
  engine ??= load().catch((e) => {
    engine = null;
    throw e;
  });
  return engine;
}

async function style(e: Engine, v: SupertonicVoice) {
  const hit = e.styles.get(v);
  if (hit) return hit;
  const cache = await caches.open(SUPERTONIC_CACHE);
  const raw = await getFile(cache, `voice_styles/${v}.json`, () => {});
  const j = JSON.parse(new TextDecoder().decode(raw)) as StyleJson;
  const tensor = (s: StyleJson["style_ttl"]) =>
    new ort.Tensor("float32", Float32Array.from((s.data as number[]).flat(Infinity) as number[]), s.dims);
  const out = { ttl: tensor(j.style_ttl), dp: tensor(j.style_dp) };
  e.styles.set(v, out);
  return out;
}

/** 표준 정규분포 난수(Box-Muller) */
function randn(): number {
  const u1 = Math.max(0.0001, Math.random());
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

async function synth(text: string, voice: SupertonicVoice, speed: number): Promise<{ pcm: Float32Array; sampleRate: number }> {
  const e = await ensureEngine();
  const st = await style(e, voice);
  const ids = textToIds(preprocessForSupertonic(text), e.indexer);
  const L = ids.length;
  const textIds = new ort.Tensor("int64", BigInt64Array.from(ids, (x) => BigInt(x)), [1, L]);
  const textMask = new ort.Tensor("float32", new Float32Array(L).fill(1), [1, 1, L]);

  const { duration } = await e.dp.run({ text_ids: textIds, style_dp: st.dp, text_mask: textMask });
  const dur = (duration.data as Float32Array)[0] / speed;
  const { text_emb } = await e.enc.run({ text_ids: textIds, style_ttl: st.ttl, text_mask: textMask });

  const sr = e.cfg.ae.sample_rate;
  const T = latentLength(dur, sr, e.cfg.ae.base_chunk_size, e.cfg.ttl.chunk_compress_factor);
  const D = e.cfg.ttl.latent_dim * e.cfg.ttl.chunk_compress_factor;
  let xt = new Float32Array(D * T);
  for (let i = 0; i < xt.length; i++) xt[i] = randn();
  const latentMask = new ort.Tensor("float32", new Float32Array(T).fill(1), [1, 1, T]);
  const total = new ort.Tensor("float32", new Float32Array([SUPERTONIC_STEPS]), [1]);
  for (let step = 0; step < SUPERTONIC_STEPS; step++) {
    const out = await e.est.run({
      noisy_latent: new ort.Tensor("float32", xt, [1, D, T]),
      text_emb,
      style_ttl: st.ttl,
      latent_mask: latentMask,
      text_mask: textMask,
      current_step: new ort.Tensor("float32", new Float32Array([step]), [1]),
      total_step: total,
    });
    xt = new Float32Array(out.denoised_latent.data as Float32Array);
  }
  const { wav_tts } = await e.voc.run({ latent: new ort.Tensor("float32", xt, [1, D, T]) });
  const wav = wav_tts.data as Float32Array;
  // 뒤쪽 여백은 길이(초)만큼만 남긴다
  const pcm = wav.slice(0, Math.min(wav.length, Math.floor(sr * dur)));
  return { pcm, sampleRate: sr };
}

// ---- 요청 줄 세우기: 한 번에 하나씩, 취소된 작업은 건너뛴다 ----

let cancelledBefore = 0;
let chain: Promise<void> = Promise.resolve();

self.onmessage = (ev: MessageEvent<WorkerIn>) => {
  const m = ev.data;
  if (m.t === "cancel") {
    cancelledBefore = Math.max(cancelledBefore, m.job + 1);
    return;
  }
  chain = chain.then(async () => {
    try {
      if (m.t === "download") {
        await download();
        post({ t: "downloaded" });
      } else if (m.t === "warm") {
        await ensureEngine();
        post({ t: "warm" });
      } else if (m.t === "synth") {
        if (m.job < cancelledBefore) return;
        const { pcm, sampleRate } = await synth(m.text, m.voice, m.speed);
        if (m.job < cancelledBefore) return;
        post({ t: "audio", job: m.job, seq: m.seq, pcm, sampleRate }, [pcm.buffer]);
      }
    } catch (err) {
      post({ t: "error", job: m.t === "synth" ? m.job : -1, kind: m.t, message: err instanceof Error ? err.message : String(err) });
    }
  });
};
