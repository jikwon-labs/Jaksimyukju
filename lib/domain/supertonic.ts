// 고품질 목소리(Supertonic 2, 슈퍼톤 공개 모델)의 순수 계산.
// 원본 웹 예제(github.com/supertone-oss-archive/supertonic, web/helper.js, MIT)를 옮겼다.
// 모델 가중치는 OpenRAIL-M: 기계가 만든 음성임을 밝혀야 한다(설정 화면 안내 문구).

/** 보관소의 고정 리비전. 파일이 바뀌어도 이 앱이 받는 모델은 그대로다 */
export const SUPERTONIC_REV = "7edbcd0bba8cd579100a353a9e0b2b49cad7c875";
export const SUPERTONIC_BASE = `https://huggingface.co/supertone-oss-archive/supertonic-2/resolve/${SUPERTONIC_REV}`;

export const SUPERTONIC_ONNX = ["duration_predictor", "text_encoder", "vector_estimator", "vocoder"] as const;
export type SupertonicPart = (typeof SUPERTONIC_ONNX)[number];

export const SUPERTONIC_VOICES = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"] as const;
export type SupertonicVoice = (typeof SUPERTONIC_VOICES)[number];

export const isSupertonicVoice = (v: unknown): v is SupertonicVoice =>
  (SUPERTONIC_VOICES as readonly unknown[]).includes(v);

/** "F1" -> "여성 1" */
export function supertonicVoiceLabel(v: SupertonicVoice): string {
  return `${v[0] === "F" ? "여성" : "남성"} ${v[1]}`;
}

/** 받을 파일 전부. 크기는 진행률 계산용(서버가 길이를 안 주면 쓴다) */
export const SUPERTONIC_FILES: { path: string; bytes: number }[] = [
  { path: "onnx/tts.json", bytes: 8_699 },
  { path: "onnx/unicode_indexer.json", bytes: 262_196 },
  { path: "onnx/duration_predictor.onnx", bytes: 1_521_526 },
  { path: "onnx/text_encoder.onnx", bytes: 27_431_318 },
  { path: "onnx/vector_estimator.onnx", bytes: 132_471_364 },
  { path: "onnx/vocoder.onnx", bytes: 101_405_066 },
  ...SUPERTONIC_VOICES.map((v) => ({ path: `voice_styles/${v}.json`, bytes: 420_000 })),
];

export const SUPERTONIC_TOTAL_BYTES = SUPERTONIC_FILES.reduce((n, f) => n + f.bytes, 0);

/** "263MB" */
export function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)}MB`;
}

/** 원본 기본값. 읽는 속도 1(보통)이 1.05다 */
export const SUPERTONIC_BASE_SPEED = 1.05;
/** 잡음 제거 단계. 높을수록 좋지만 느리다(원본 예제 기본 5) */
export const SUPERTONIC_STEPS = 5;

const REPLACE: [string, string][] = [
  ["–", "-"],
  ["‑", "-"],
  ["—", "-"],
  ["_", " "],
  ["“", '"'],
  ["”", '"'],
  ["‘", "'"],
  ["’", "'"],
  ["´", "'"],
  ["`", "'"],
  ["[", " "],
  ["]", " "],
  ["|", " "],
  ["/", " "],
  ["#", " "],
  ["→", " "],
  ["←", " "],
];

/** 모델에 넣기 전 정리. 한글은 NFKD로 자모를 푼 뒤 언어 꼬리표로 감싼다 */
export function preprocessForSupertonic(text: string, lang = "ko"): string {
  let t = text.normalize("NFKD");
  t = t.replace(/\p{Extended_Pictographic}️?/gu, "");
  for (const [k, v] of REPLACE) t = t.replaceAll(k, v);
  t = t.replace(/[♥☆♡©\\]/g, "");
  t = t.replaceAll("@", " at ");
  t = t
    .replace(/ ,/g, ",")
    .replace(/ \./g, ".")
    .replace(/ !/g, "!")
    .replace(/ \?/g, "?")
    .replace(/ ;/g, ";")
    .replace(/ :/g, ":")
    .replace(/ '/g, "'");
  t = t.replace(/"{2,}/g, '"').replace(/'{2,}/g, "'");
  t = t.replace(/\s+/g, " ").trim();
  if (!/[.!?;:,'")\]}…。」』】〉》›»]$/.test(t)) t += ".";
  return `<${lang}>${t}</${lang}>`;
}

/** 글자를 모델의 번호로 바꾼다. 표에 없는 글자는 -1 */
export function textToIds(processed: string, indexer: readonly number[]): number[] {
  const ids: number[] = [];
  for (let j = 0; j < processed.length; j++) {
    const cp = processed.codePointAt(j) ?? 0;
    ids.push(cp < indexer.length ? indexer[cp] : -1);
  }
  return ids;
}

/** 길이(초)로 잠재 벡터의 칸 수를 정한다 */
export function latentLength(durationSec: number, sampleRate: number, baseChunk: number, compress: number): number {
  const wavLen = Math.floor(durationSec * sampleRate);
  const chunk = baseChunk * compress;
  return Math.max(1, Math.floor((wavLen + chunk - 1) / chunk));
}

// ---- 받기 전에 확인할 것 ----

/** 받을 파일 중 아직 없는 것의 크기 합 */
export function missingBytes(cached: readonly boolean[]): number {
  return SUPERTONIC_FILES.reduce((n, f, i) => (cached[i] ? n : n + f.bytes), 0);
}

/** 브라우저가 계산해 둔 공간에 넉넉히(1.1배) 들어가는지. 모르면 일단 받아 본다 */
export function storageRoom(est: { quota?: number; usage?: number } | null | undefined, need: number): { ok: true } | { ok: false; free: number } {
  if (!est || typeof est.quota !== "number" || typeof est.usage !== "number") return { ok: true };
  const free = Math.max(0, est.quota - est.usage);
  return free * 10 >= need * 11 ? { ok: true } : { ok: false, free };
}

/** 모바일 데이터나 데이터 절약 중인지. navigator.connection이 없는 브라우저(iOS 등)는 false */
export function isMetered(conn: { type?: string; effectiveType?: string; saveData?: boolean } | null | undefined): boolean {
  if (!conn) return false;
  if (conn.saveData === true) return true;
  if (conn.type === "cellular") return true;
  if (conn.type === "wifi" || conn.type === "ethernet") return false;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g" || conn.effectiveType === "3g";
}

// ---- 만든 소리 보관 ----

/** 같은 문장을 다시 들을 때 다시 만들지 않도록, 크기 한도 안에서 최근 것만 남긴다 */
export class SizedLru<V> {
  private map = new Map<string, { value: V; size: number }>();
  private used = 0;
  constructor(
    private readonly budget: number,
    private readonly sizeOf: (v: V) => number,
  ) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    // 다시 넣어 가장 최근으로 옮긴다
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key: string, value: V): void {
    const size = this.sizeOf(value);
    const old = this.map.get(key);
    if (old) {
      this.map.delete(key);
      this.used -= old.size;
    }
    // 하나가 한도보다 크면 담지 않는다
    if (size > this.budget) return;
    this.map.set(key, { value, size });
    this.used += size;
    for (const [k, v] of this.map) {
      if (this.used <= this.budget) break;
      this.map.delete(k);
      this.used -= v.size;
    }
  }

  clear(): void {
    this.map.clear();
    this.used = 0;
  }

  get bytes(): number {
    return this.used;
  }

  get size(): number {
    return this.map.size;
  }
}

/** 목소리·속도·문장이 같으면 같은 소리로 본다 */
export const pcmKey = (voice: SupertonicVoice, speed: number, text: string) => `${voice}|${speed}|${text}`;
