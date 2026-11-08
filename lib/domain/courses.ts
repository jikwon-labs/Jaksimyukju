// 여러 과정 동시 진행: 지금 보는 과정 고르기와 동시 진행 한도

/** 동시에 진행할 수 있는 과정 수 */
export const MAX_ACTIVE_COURSES = 3;

/** 화면에 열려 있는 과정 상태. 진행 중이거나 방금 완주해서 아직 목적지 화면을 볼 수 있는 과정 */
export const OPEN_STATUSES = ["active", "finished"] as const;

export interface CourseRef {
  id: string;
  status: string;
  createdAt: Date;
}

/**
 * 지금 보는 과정. 고른 과정(focusId)이 열려 있으면 그것, 아니면 가장 최근에 만든 진행 중 과정,
 * 진행 중이 없으면 가장 최근에 완주한 과정
 */
export function pickFocus<T extends CourseRef>(courses: T[], focusId: string | null | undefined): T | null {
  const open = courses.filter((c) => (OPEN_STATUSES as readonly string[]).includes(c.status));
  const hit = focusId ? open.find((c) => c.id === focusId) : undefined;
  if (hit) return hit;
  const newest = (xs: T[]) => [...xs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  return newest(open.filter((c) => c.status === "active")) ?? newest(open);
}

export type AddDecision = { ok: true } | { ok: false; reason: "too_many" };

export function canAddCourse(activeCount: number): AddDecision {
  return activeCount >= MAX_ACTIVE_COURSES ? { ok: false, reason: "too_many" } : { ok: true };
}

export const ADD_MESSAGES: Record<Extract<AddDecision, { ok: false }>["reason"], string> = {
  too_many: `과정은 ${MAX_ACTIVE_COURSES}개까지 함께 할 수 있어요. 하나를 마치거나 그만두면 새로 열 수 있어요`,
};
