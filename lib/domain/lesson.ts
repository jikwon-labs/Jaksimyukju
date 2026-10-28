// 매일 루프: 레슨 완료 처리, 완료 화면의 연속 기록, 튜터 이해도 표시, 그룹 완료 알림 대상
import type { DayKey } from "./dates";
import { canNotify } from "./limits";
import {
  currentStreak,
  type GrassCell,
  type GrassLevel,
  longestStreak,
  type StudyCalendar,
} from "./rest";

export type CompleteMode = "full" | "short";

/** 5분 버전으로 마치면 남은 내용을 다음 레슨에 이만큼 붙인다 */
export const SHORT_CARRY_MINUTES = 5;
export const ONE_LINER_MAX = 120;

export interface CompletionPlan {
  status: "done" | "short";
  completedDay: DayKey;
  /** 처음 완료하는 것인지(알림·다음 레슨 분량 반영은 처음 한 번만) */
  firstTime: boolean;
  /** DB를 고쳐야 하는지 */
  changed: boolean;
  /** 다음 todo 레슨에 붙일 분 */
  carryToNext: number;
}

/**
 * 레슨 완료. 같은 레슨을 다시 완료해도 두 번 세지 않는다.
 * - 처음 완료: 상태를 바꾸고 오늘 날짜로 적는다. 5분 버전이면 다음 레슨에 5분을 붙인다
 * - 5분 버전으로 끝낸 레슨을 전체로 다시 끝내면 done으로 올리되 날짜와 붙인 분은 그대로 둔다
 * - 이미 done이면 아무것도 바꾸지 않는다
 */
export function planCompletion(
  prev: { status: string; completedDay: DayKey | null },
  mode: CompleteMode,
  today: DayKey,
): CompletionPlan {
  if (prev.completedDay && (prev.status === "done" || prev.status === "short")) {
    const upgrade = prev.status === "short" && mode === "full";
    return {
      status: upgrade ? "done" : (prev.status as "done" | "short"),
      completedDay: prev.completedDay,
      firstTime: false,
      changed: upgrade,
      carryToNext: 0,
    };
  }
  return {
    status: mode === "short" ? "short" : "done",
    completedDay: today,
    firstTime: true,
    changed: true,
    carryToNext: mode === "short" ? SHORT_CARRY_MINUTES : 0,
  };
}

export function cleanOneLiner(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim().slice(0, ONE_LINER_MAX);
  return t.length > 0 ? t : null;
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

export interface StreakChange {
  before: number;
  after: number;
  longestBefore: number;
  longest: number;
  /** 이전 최장 기록을 넘었을 때만. 처음 시작한 날은 경신으로 치지 않는다 */
  record: boolean;
}

/** 오늘 활동을 뺀 연속 기록과 넣은 연속 기록을 비교한다 */
export function streakChange(
  cal: StudyCalendar,
  levels: ReadonlyMap<DayKey, GrassLevel>,
  today: DayKey,
): StreakChange {
  const without = new Map(levels);
  without.delete(today);
  const before = currentStreak(cal, without, today);
  const after = currentStreak(cal, levels, today);
  const longestBefore = longestStreak(cal, without, today);
  const longest = longestStreak(cal, levels, today);
  return { before, after, longestBefore, longest, record: longestBefore > 0 && after > longestBefore };
}

export function streakHeadline(c: StreakChange): string {
  if (c.record) return "연속 학습 최장 기록 경신";
  if (c.after <= 1) return "새 연속 학습 시작";
  return "연속 학습 이어 가는 중";
}

export function streakSub(c: StreakChange): string {
  return `어제까지 ${c.before}일 · 최장 기록 ${Math.max(c.longestBefore, c.longest)}일`;
}

export const WEEK_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export interface StripCell {
  day: DayKey;
  label: string;
  kind: GrassCell["kind"];
  level: GrassLevel;
  today: boolean;
}

/** 잔디에서 오늘이 든 주(월~일) 7칸 */
export function weekStrip(grass: GrassCell[][], today: DayKey): StripCell[] {
  const col = grass.find((c) => c.some((x) => x.day === today)) ?? grass[grass.length - 1] ?? [];
  return col.map((c, i) => ({
    day: c.day,
    label: WEEK_LABELS[i] ?? "",
    kind: c.kind,
    level: c.kind === "level" || c.kind === "today" ? c.level : 0,
    today: c.day === today,
  }));
}

export type UnderstandingTone = "partial" | "almost" | "good";
export type UnderstandingValue = "이해" | "부분" | "미흡";

/**
 * 튜터 이해도 표시.
 * 이해 -> 이해함, 답을 한 번 이상 했고 부분 -> 거의 이해, 그 밖(첫 질문, 미흡) -> 부분 이해
 */
export function understandingChip(
  last: UnderstandingValue | null,
  userAnswers: number,
): { label: string; tone: UnderstandingTone } {
  if (last === "이해") return { label: "이해함", tone: "good" };
  if (last === "부분" && userAnswers > 0) return { label: "거의 이해", tone: "almost" };
  return { label: "부분 이해", tone: "partial" };
}

export const TUTOR_QUESTIONS = 2;

export function tutorStatus(opts: { thinking: boolean; done: boolean; aiTurns: number }): string {
  if (opts.thinking) return "생각하는 중";
  if (opts.done) return "이해도 확인 끝";
  const n = Math.min(Math.max(opts.aiTurns, 1), TUTOR_QUESTIONS);
  return `이해도 확인 · 질문 ${n} / ${TUTOR_QUESTIONS}`;
}

export interface NotifyRecipient {
  id: string;
  sentToday: number;
  resting: boolean;
  enabled: boolean;
  /** 오늘 같은 완료 알림을 이미 받았는지 */
  already: boolean;
}

/** 그룹 완료 알림을 받을 사람. 하루 2회, 밤 11시~아침 7시, 쉬는 중, 알림 끔을 지킨다 */
export function groupNotifyTargets(recipients: NotifyRecipient[], hour: number): string[] {
  return recipients
    .filter((r) => !r.already)
    .filter((r) => canNotify({ hour, sentToday: r.sentToday, resting: r.resting, enabled: r.enabled }).ok)
    .map((r) => r.id);
}
