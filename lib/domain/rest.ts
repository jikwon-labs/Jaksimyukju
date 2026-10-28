// 9.4 쉼 규칙과 복귀, 9.3 잔디와 연속 학습일
import type { TeacherName } from "@/lib/design/types";
import { addDays, type DayKey, diffDays, mondayOf, weekday } from "./dates";

/** 0 안 함, 1 5분 버전, 2 레슨 완료, 3 레슨 + 튜터 확인, 4 퀴즈·마일스톤까지 */
export type GrassLevel = 0 | 1 | 2 | 3 | 4;

export interface ScheduleChange {
  from: DayKey;
  days: number[];
}

export interface StudyCalendar {
  startDate: DayKey;
  studyDays: number[]; // 0=일 ~ 6=토 (지금 요일)
  restDays: ReadonlySet<DayKey>;
  /** 학습 요일 변경 이력. 지난 날은 그때 정해 둔 요일로 판정한다 */
  schedule?: ScheduleChange[];
}

export type DayKind = "study" | "off" | "rest";

/** 그날 적용되던 학습 요일 */
export function studyDaysOn(cal: StudyCalendar, day: DayKey): number[] {
  let days = cal.studyDays;
  let best: DayKey | null = null;
  for (const c of cal.schedule ?? []) {
    if (diffDays(day, c.from) >= 0 && (best === null || diffDays(c.from, best) > 0)) {
      best = c.from;
      days = c.days;
    }
  }
  return days;
}

export function dayKind(cal: StudyCalendar, day: DayKey): DayKind {
  if (cal.restDays.has(day)) return "rest";
  return studyDaysOn(cal, day).includes(weekday(day)) ? "study" : "off";
}

/** 학습 요일을 바꿀 때 이력에 더할 항목. 처음 바꾸면 그 전 요일을 시작일부터로 먼저 남긴다 */
export function nextSchedule(
  current: ScheduleChange[],
  startDate: DayKey,
  oldDays: number[],
  newDays: number[],
  today: DayKey,
): ScheduleChange[] {
  const base = current.length ? current : [{ from: startDate, days: oldDays }];
  return [...base.filter((c) => c.from !== today), { from: today, days: newDays }];
}

export interface ActivityInput {
  day: DayKey;
  kind: "short" | "lesson" | "lesson_tutor" | "quiz" | "milestone";
}

const LEVEL: Record<ActivityInput["kind"], GrassLevel> = {
  short: 1,
  lesson: 2,
  lesson_tutor: 3,
  quiz: 4,
  milestone: 4,
};

/** 날짜별로 가장 진한 단계만 남긴다 */
export function activityLevels(items: ActivityInput[]): Map<DayKey, GrassLevel> {
  const m = new Map<DayKey, GrassLevel>();
  for (const it of items) {
    const lv = LEVEL[it.kind];
    if ((m.get(it.day) ?? 0) < lv) m.set(it.day, lv);
  }
  return m;
}

/**
 * 현재 연속 학습일.
 * - 학습한 날은 +1 (5분 버전 포함, 학습 요일이 아닌 날에 해도 +1)
 * - 학습 요일이 아닌 날과 예약한 쉼은 건너뛴다(끊지 않는다)
 * - 오늘이 학습일인데 아직 안 했으면 끊지 않고 어제부터 센다
 * - 학습일을 하루라도 비우면 거기서 끊긴다
 */
export function currentStreak(
  cal: StudyCalendar,
  levels: ReadonlyMap<DayKey, GrassLevel>,
  today: DayKey,
): number {
  let streak = 0;
  for (let d = today; diffDays(d, cal.startDate) >= 0; d = addDays(d, -1)) {
    if ((levels.get(d) ?? 0) > 0) {
      streak++;
      continue;
    }
    if (d === today) continue;
    if (dayKind(cal, d) !== "study") continue;
    break;
  }
  return streak;
}

export function longestStreak(
  cal: StudyCalendar,
  levels: ReadonlyMap<DayKey, GrassLevel>,
  today: DayKey,
): number {
  let best = 0;
  let run = 0;
  for (let d = cal.startDate; diffDays(today, d) >= 0; d = addDays(d, 1)) {
    if ((levels.get(d) ?? 0) > 0) {
      run++;
      best = Math.max(best, run);
    } else if (d !== today && dayKind(cal, d) === "study") {
      run = 0;
    }
  }
  return best;
}

/** 어제부터 거꾸로, 학습 없이 빈 학습일이 몇 개 이어졌는지. 쉬는 날·학습 요일 아닌 날은 세지 않는다 */
export function missedStudyDays(
  cal: StudyCalendar,
  levels: ReadonlyMap<DayKey, GrassLevel>,
  today: DayKey,
): { count: number; days: DayKey[] } {
  const days: DayKey[] = [];
  for (let d = addDays(today, -1); diffDays(d, cal.startDate) >= 0; d = addDays(d, -1)) {
    if ((levels.get(d) ?? 0) > 0) break;
    if (dayKind(cal, d) === "study") days.push(d);
  }
  return { count: days.length, days: days.reverse() };
}

export const COMEBACK_THRESHOLD = 2;

/**
 * 복귀 화면을 띄울지. 학습일 기준 2일 이상 비었고, 이번 공백에 대해 아직 재조정을 고르지 않았을 때.
 * handledDay: 마지막으로 복귀 화면에서 재조정을 고른 날
 */
export function needsComeback(
  cal: StudyCalendar,
  levels: ReadonlyMap<DayKey, GrassLevel>,
  today: DayKey,
  handledDay: DayKey | null,
): boolean {
  if ((levels.get(today) ?? 0) > 0) return false;
  const { count, days } = missedStudyDays(cal, levels, today);
  if (count < COMEBACK_THRESHOLD) return false;
  if (handledDay && diffDays(handledDay, days[0]) >= 0) return false;
  return true;
}

export type ReplanKind = "delay" | "squeeze" | "skip";

export const REPLAN_BY_TEACHER: Record<TeacherName, ReplanKind> = {
  온: "delay",
  결: "squeeze",
  새: "skip",
};

export interface ReplanResult {
  kind: ReplanKind;
  /** 과정에 더해지는 학습일 */
  extraDays: number;
  /** 뒤 레슨에 붙는 분 */
  extraMinutes: { order: number; minutes: number }[];
  /** 뒤 레슨에 합쳐져 따로 하지 않는 밀린 레슨 */
  merge: number[];
  /** 3분 요약 카드로 바꿀 밀린 레슨 */
  summarize: number[];
}

/**
 * 재조정 3가지. pendingOrders는 아직 안 한 레슨 order(오름차순).
 * - 미루기: 과정이 밀린 학습일만큼 늘고 하루 분량은 그대로
 * - 압축하기: 기간 그대로. 밀린 레슨 N개를 그 뒤 레슨 N개에 5분씩 붙여 합친다
 * - 요약으로 넘기기: 밀린 레슨을 3분 요약 카드로 대신하고 바로 오늘 칸으로 간다
 */
export function replan(kind: ReplanKind, missed: number, pendingOrders: number[]): ReplanResult {
  const n = Math.min(Math.max(0, missed), pendingOrders.length);
  const empty = { extraDays: 0, extraMinutes: [], merge: [], summarize: [] };
  if (kind === "delay") return { ...empty, kind, extraDays: n };
  const behind = pendingOrders.slice(0, n);
  if (kind === "squeeze") {
    const targets = pendingOrders.slice(n, n * 2);
    const merge = behind.slice(0, targets.length);
    return {
      ...empty,
      kind,
      extraMinutes: targets.map((order) => ({ order, minutes: 5 })),
      merge,
    };
  }
  return { ...empty, kind, summarize: behind };
}

export const PAUSE_LIMIT = 10;

export function pauseRemaining(used: number): number {
  return Math.max(0, PAUSE_LIMIT - used);
}

/** 미리 쉴 수 있는 범위: 오늘부터 이만큼 뒤까지(이번 주 + 다음 주) */
export const PAUSE_AHEAD_DAYS = 13;

/** 쉬어 가기 예약 검사: 학습일만, 오늘부터 2주 안, 한도 안에서 */
export function validatePause(
  cal: StudyCalendar,
  today: DayKey,
  picked: DayKey[],
  used: number,
): { ok: true; days: DayKey[] } | { ok: false; reason: string } {
  const days = [...new Set(picked)].sort();
  if (days.length === 0) return { ok: false, reason: "쉴 날을 골라 주세요" };
  for (const d of days) {
    if (diffDays(d, today) < 0) return { ok: false, reason: "지난 날은 고를 수 없어요" };
    if (diffDays(d, today) > PAUSE_AHEAD_DAYS) return { ok: false, reason: "다음 주까지만 미리 쉴 수 있어요" };
    if (dayKind(cal, d) === "off") return { ok: false, reason: "학습일만 고를 수 있어요" };
  }
  const fresh = days.filter((d) => !cal.restDays.has(d));
  if (used + fresh.length > PAUSE_LIMIT)
    return { ok: false, reason: `한 과정에서 최대 ${PAUSE_LIMIT}일까지 쉬어 갈 수 있어요` };
  return { ok: true, days: fresh };
}

export type GrassCell =
  | { day: DayKey; kind: "level"; level: GrassLevel }
  | { day: DayKey; kind: "today"; level: GrassLevel }
  | { day: DayKey; kind: "off" | "rest" | "future" };

/**
 * 잔디: 세로 7칸(월~일) x 가로 주. 과정 시작 주 월요일부터 weeks주.
 */
export function grassGrid(
  cal: StudyCalendar,
  levels: ReadonlyMap<DayKey, GrassLevel>,
  today: DayKey,
  weeks: number,
): GrassCell[][] {
  const start = mondayOf(cal.startDate);
  const cols: GrassCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: GrassCell[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, w * 7 + i);
      const lv = levels.get(day) ?? 0;
      const kind = dayKind(cal, day);
      if (day === today) col.push({ day, kind: "today", level: lv });
      else if (diffDays(day, today) > 0) col.push({ day, kind: kind === "study" ? "future" : kind });
      else if (lv > 0) col.push({ day, kind: "level", level: lv });
      else if (kind !== "study") col.push({ day, kind });
      else if (diffDays(day, cal.startDate) < 0) col.push({ day, kind: "off" });
      else col.push({ day, kind: "level", level: 0 });
    }
    cols.push(col);
  }
  return cols;
}
