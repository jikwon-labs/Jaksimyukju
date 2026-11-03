// 읽어 주기(브라우저 내장 TTS)의 순수 계산. 화면·브라우저 API에 기대지 않는다

export const SPEECH_RATES = [0.8, 1, 1.2, 1.5] as const;
export type SpeechRate = (typeof SPEECH_RATES)[number];

export interface SpeechPrefs {
  on: boolean;
  /** 기기에 있는 목소리의 voiceURI. 비우면 기기 기본 한국어 목소리 */
  voice: string;
  rate: SpeechRate;
}

export const DEFAULT_SPEECH_PREFS: SpeechPrefs = { on: true, voice: "", rate: 1 };

/** 저장된 값이 깨져 있어도 기본값으로 돌아간다 */
export function parseSpeechPrefs(raw: string | null | undefined): SpeechPrefs {
  if (!raw) return DEFAULT_SPEECH_PREFS;
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof SpeechPrefs, unknown>>;
    return {
      on: typeof v.on === "boolean" ? v.on : DEFAULT_SPEECH_PREFS.on,
      voice: typeof v.voice === "string" ? v.voice : "",
      rate: (SPEECH_RATES as readonly unknown[]).includes(v.rate) ? (v.rate as SpeechRate) : DEFAULT_SPEECH_PREFS.rate,
    };
  } catch {
    return DEFAULT_SPEECH_PREFS;
  }
}

export function rateLabel(r: SpeechRate): string {
  return r === 1 ? "보통" : `${r}배`;
}

/** 소리 내어 읽기 어색한 기호를 걷어 낸다. 마크다운 흔적, 이모지, 화살표 등 */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\[(\d+)\]/g, "")
    .replace(/(\d)\s*~\s*(\d)/g, "$1에서 $2")
    .replace(/[→⇒➜]/g, ", ")
    .replace(/[·•]/g, ", ")
    .replace(/[*_#`>|]/g, "")
    .replace(/\p{Extended_Pictographic}️?/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n+ */g, "\n")
    .trim();
}

const MAX_CHUNK = 120;

/**
 * 문장 단위로 자른다. 크롬 일부 목소리는 15초쯤 넘는 발화를 끊어 버리고,
 * 짧게 나눠야 멈추기도 바로 듣는다. 긴 문장은 쉼표, 그다음 띄어쓰기에서 자른다.
 */
export function splitForSpeech(text: string, max = MAX_CHUNK): string[] {
  const sentences = cleanForSpeech(text)
    .split(/(?<=[.!?。])\s+|\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const s of sentences) {
    if (s.length <= max) {
      out.push(s);
      continue;
    }
    let cur = "";
    for (const part of s.split(/(?<=,)\s*/)) {
      for (const word of part.length > max ? part.split(" ") : [part]) {
        const next = cur ? `${cur} ${word}` : word;
        if (next.length > max && cur) {
          out.push(cur);
          cur = word;
        } else cur = next;
      }
    }
    if (cur) out.push(cur);
  }
  return out;
}

export interface VoiceLike {
  voiceURI: string;
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

export const isKorean = (v: Pick<VoiceLike, "lang">) => /^ko([-_]|$)/i.test(v.lang);

/** 한국어 목소리만, 같은 이름은 하나만. 기기 기본 목소리를 앞에 둔다 */
export function koreanVoices<T extends VoiceLike>(voices: readonly T[]): T[] {
  const seen = new Set<string>();
  return voices
    .filter((v) => isKorean(v) && !seen.has(v.voiceURI) && seen.add(v.voiceURI))
    .sort((a, b) => Number(!!b.default) - Number(!!a.default));
}

/** 고른 목소리가 이 기기에 없으면(다른 기기에서 고른 값 등) 첫 한국어 목소리 */
export function pickVoice<T extends VoiceLike>(voices: readonly T[], uri: string): T | null {
  const ko = koreanVoices(voices);
  return ko.find((v) => v.voiceURI === uri) ?? ko[0] ?? null;
}

/** 기기가 붙인 이름을 그대로 보여 주되, "(한국어)"·"- Korean (Korean)" 같은 언어 꼬리표는 뗀다 */
export function voiceLabel(v: Pick<VoiceLike, "name">): string {
  const out = v.name
    .replace(/\s*[(（](Korean|한국어|ko[-_]KR).*$/i, "")
    .replace(/\s*-\s*Korean\b.*$/i, "")
    .trim();
  return out || v.name;
}
