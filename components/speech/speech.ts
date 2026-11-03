"use client";
// 브라우저 내장 TTS(speechSynthesis). 설정은 기기마다 목소리가 달라 localStorage에 둔다
import { useSyncExternalStore } from "react";
import { DEFAULT_SPEECH_PREFS, parseSpeechPrefs, pickVoice, splitForSpeech, type SpeechPrefs } from "@/lib/domain/speech";

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

function setPlaying(id: string | null) {
  playing = id;
  emit();
}

export function stop(): void {
  run++;
  if (supported()) window.speechSynthesis.cancel();
  if (playing !== null) setPlaying(null);
}

/** 이 버튼이 읽던 중일 때만 멈춘다 */
export function stopIf(id: string): void {
  if (playing === id) stop();
}

/** 문장 단위로 이어서 읽는다. 다른 것을 읽기 시작하면 앞의 것은 멈춘다 */
export function speak(id: string, text: string, prefs: SpeechPrefs = prefsSnapshot()): void {
  if (!supported()) return;
  stop();
  const chunks = splitForSpeech(text);
  if (chunks.length === 0) return;
  const synth = window.speechSynthesis;
  const voice = pickVoice(synth.getVoices(), prefs.voice);
  const mine = ++run;
  setPlaying(id);
  try {
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = voice?.lang ?? "ko-KR";
      if (voice) u.voice = voice;
      u.rate = prefs.rate;
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
