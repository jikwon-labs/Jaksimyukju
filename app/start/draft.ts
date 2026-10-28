"use client";
// 시작 흐름 초안. 계정을 만들기 전이라 브라우저 sessionStorage에만 둔다.
import { useSyncExternalStore } from "react";
import { isTeacher } from "@/lib/design/tokens";
import type { TeacherName } from "@/lib/design/types";
import { TEACHER_COOKIE } from "@/lib/theme";
import { DEFAULT_SCHEDULE } from "./logic";

export interface Draft {
  answers: TeacherName[];
  /** 성향 질문 결과(추천 선생님) */
  reco: TeacherName | null;
  teacher: TeacherName | null;
  topic: string;
  goal: string;
  level: string;
  studyDays: number[];
  minutes: number;
  weeks: number;
  notifyTime: string;
}

const KEY = "j6_draft";

export const EMPTY_DRAFT: Draft = {
  answers: [],
  reco: null,
  teacher: null,
  topic: "",
  goal: "",
  level: "",
  ...DEFAULT_SCHEDULE,
};

const listeners = new Set<() => void>();
let cacheRaw: string | null | undefined;
let cacheVal: Draft = EMPTY_DRAFT;

function parse(raw: string | null): Draft {
  if (!raw) return EMPTY_DRAFT;
  try {
    const v = JSON.parse(raw) as Partial<Draft>;
    return {
      ...EMPTY_DRAFT,
      ...v,
      answers: Array.isArray(v.answers) ? v.answers.filter(isTeacher) : [],
      reco: isTeacher(v.reco) ? v.reco : null,
      teacher: isTeacher(v.teacher) ? v.teacher : null,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readDraft(): Draft {
  const raw = storage()?.getItem(KEY) ?? null;
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheVal = parse(raw);
  }
  return cacheVal;
}

export function writeDraft(patch: Partial<Draft>): Draft {
  const next = { ...readDraft(), ...patch };
  storage()?.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
  return next;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** 서버 렌더와 첫 하이드레이션은 빈 초안, 그 뒤 저장된 값 */
export function useDraft(): Draft {
  return useSyncExternalStore(subscribe, readDraft, () => EMPTY_DRAFT);
}

/** 고른 선생님. 고르기 전에는 추천, 추천도 없으면 온 */
export function draftTeacher(d: Draft): TeacherName {
  return d.teacher ?? d.reco ?? "온";
}

/** 강조색을 바로 바꾼다(html data-teacher + 쿠키) */
export function applyTeacher(who: TeacherName) {
  document.documentElement.dataset.teacher = who;
  document.cookie = `${TEACHER_COOKIE}=${encodeURIComponent(who)}; path=/; max-age=31536000; samesite=lax`;
}
