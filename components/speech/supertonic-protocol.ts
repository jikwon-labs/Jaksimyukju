// 화면과 고품질 목소리 워커가 주고받는 말
import type { SupertonicVoice } from "@/lib/domain/supertonic";

/** 서비스 워커(public/sw.js)가 지우지 않도록 "j6-tts-"로 시작한다 */
export const SUPERTONIC_CACHE = "j6-tts-supertonic2";

export type WorkerIn =
  | { t: "download" }
  | { t: "warm" }
  | { t: "synth"; job: number; seq: number; text: string; voice: SupertonicVoice; speed: number }
  | { t: "cancel"; job: number };

export type WorkerOut =
  | { t: "progress"; loaded: number; total: number }
  | { t: "downloaded" }
  | { t: "warm" }
  | { t: "audio"; job: number; seq: number; pcm: Float32Array; sampleRate: number }
  | { t: "error"; job: number; kind: WorkerIn["t"]; message: string };
