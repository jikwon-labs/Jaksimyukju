import "server-only";
import type { User } from "@prisma/client";
import type { DayKey } from "@/lib/domain/dates";
import { json, loadState, type CourseFull, type CourseState } from "./course";

export type WeekRow = CourseFull["weeks"][number];

export interface WeekAccess {
  st: CourseState;
  week: WeekRow;
  /** 진행 중 주차보다 뒤라서 아직 열리지 않았다 */
  locked: boolean;
  last: boolean;
}

/** 주차 번호로 퀴즈·마일스톤 대상 주차를 찾는다. 과정이 없으면 null, 주차가 없으면 week 없음 */
export async function weekAccess(user: User, today: DayKey, n: number): Promise<{ st: CourseState | null; access: WeekAccess | null }> {
  const st = await loadState(user, today);
  if (!st) return { st: null, access: null };
  const week = st.course.weeks.find((w) => w.index === n);
  if (!week) return { st, access: null };
  const locked = !st.view.finished && n > st.view.currentWeek;
  return { st, access: { st, week, locked, last: n === st.course.weeks.length } };
}

export function criteriaOf(week: Pick<WeekRow, "milestoneCriteria">): string[] {
  const v = json<unknown>(week.milestoneCriteria);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
