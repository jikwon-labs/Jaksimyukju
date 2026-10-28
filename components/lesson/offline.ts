"use client";
// 받아 둔 레슨(오프라인 읽기)과 연결 상태
import { useSyncExternalStore } from "react";
import type { LessonPayload } from "./LessonContent";

export const LAST_LESSON_KEY = "j6_last_lesson";
export const lessonKey = (id: string) => `j6_lesson_${id}`;

export function saveLesson(p: LessonPayload): void {
  try {
    const raw = JSON.stringify({ ...p, savedAt: new Date().toISOString() });
    localStorage.setItem(lessonKey(p.id), raw);
    localStorage.setItem(LAST_LESSON_KEY, raw);
  } catch {
    // 저장 공간이 막혀 있어도 화면은 그대로 보인다
  }
}

function isPayload(v: unknown): v is LessonPayload {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.title === "string" && !!o.body && typeof o.body === "object";
}

export function readSavedLesson(id?: string): LessonPayload | null {
  try {
    const raw = localStorage.getItem(id ? lessonKey(id) : LAST_LESSON_KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    return isPayload(v) ? v : null;
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** 서버 렌더에서는 연결된 것으로 본다 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

let lastRaw: string | null | undefined;
let lastVal: LessonPayload | null = null;

/** useSyncExternalStore용: 저장된 값이 그대로면 같은 객체를 돌려준다 */
export function lastLessonSnapshot(): LessonPayload | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LAST_LESSON_KEY);
  } catch {
    raw = null;
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastVal = readSavedLesson();
  }
  return lastVal;
}
