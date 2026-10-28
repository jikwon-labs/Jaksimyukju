import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, type DayKey, diffDays } from "@/lib/domain/dates";
import {
  currentStreak,
  missedStudyDays,
  replan,
  type ReplanKind,
  type ReplanResult,
  validatePause,
} from "@/lib/domain/rest";
import { loadState, pendingOrders } from "./course";
import { notifyGroup } from "./social";

export type PauseResult = { ok: true; days: DayKey[] } | { ok: false; message: string };

/** 쉬는 날을 예약하고, 그만큼 과정을 늘린다 */
export async function reservePause(user: User, today: DayKey, picked: DayKey[], reason: string | null): Promise<PauseResult> {
  const st = await loadState(user, today);
  if (!st) return { ok: false, message: "진행 중인 과정이 없어요" };
  const v = validatePause(st.cal, today, picked, st.restUsed);
  if (!v.ok) return { ok: false, message: v.reason };
  if (v.days.length === 0) return { ok: false, message: "이미 쉬는 날로 잡혀 있어요" };
  const why = reason?.trim() ? reason.trim().slice(0, 40) : null;
  await prisma.$transaction([
    prisma.restDay.createMany({
      data: v.days.map((day) => ({ userId: user.id, courseId: st.course.id, day, reason: why })),
    }),
    prisma.course.update({ where: { id: st.course.id }, data: { extraDays: { increment: v.days.length } } }),
  ]);
  return { ok: true, days: v.days };
}

/** 아직 오지 않은(오늘 포함) 쉬는 날만 취소한다 */
export async function cancelRest(user: User, today: DayKey, day: DayKey): Promise<boolean> {
  const st = await loadState(user, today);
  if (!st || diffDays(day, today) < 0) return false;
  const row = await prisma.restDay.findUnique({ where: { courseId_day: { courseId: st.course.id, day } } });
  if (!row || row.userId !== user.id) return false;
  await prisma.$transaction([
    prisma.restDay.delete({ where: { id: row.id } }),
    prisma.course.update({
      where: { id: st.course.id },
      data: { extraDays: Math.max(0, st.course.extraDays - 1) },
    }),
  ]);
  return true;
}

export interface ComebackPlan {
  missed: number;
  /** 재조정에 쓰는 개수(남은 레슨 수를 넘지 않는다) */
  n: number;
  plans: Record<ReplanKind, ReplanResult>;
  /** 공백 직전까지 이어 온 연속 기록 */
  prevStreak: number;
}

export async function comebackPlan(user: User, today: DayKey): Promise<ComebackPlan | null> {
  const st = await loadState(user, today);
  if (!st) return null;
  const gap = missedStudyDays(st.cal, st.levels, today);
  const pending = pendingOrders(st.course);
  const plans = {
    delay: replan("delay", gap.count, pending),
    squeeze: replan("squeeze", gap.count, pending),
    skip: replan("skip", gap.count, pending),
  };
  const prevStreak = gap.days[0] ? currentStreak(st.cal, st.levels, addDays(gap.days[0], -1)) : st.streak;
  return { missed: gap.count, n: Math.min(gap.count, pending.length), plans, prevStreak };
}

/** 복귀 재조정 적용. 그룹에는 "돌아왔어요"만 알린다 */
export async function applyComeback(user: User, today: DayKey, kind: ReplanKind): Promise<boolean> {
  const st = await loadState(user, today);
  if (!st || !st.comeback) return false;
  const r = replan(kind, st.missed, pendingOrders(st.course));
  const lessons = st.course.weeks.flatMap((w) => w.lessons);
  const byOrder = new Map(lessons.map((l) => [l.order, l]));
  // 이번 공백에 대해 아직 고르지 않았을 때만 적용한다(중복 제출 막기)
  const claimed = await prisma.course.updateMany({
    where: { id: st.course.id, OR: [{ comebackDay: null }, { comebackDay: { not: today } }] },
    data: { comebackDay: today, replan: kind },
  });
  if (claimed.count === 0) return false;
  const ops = [];
  if (r.extraDays > 0) {
    ops.push(prisma.course.update({ where: { id: st.course.id }, data: { extraDays: { increment: r.extraDays } } }));
  }
  for (const order of r.merge) {
    const l = byOrder.get(order);
    if (l) ops.push(prisma.lesson.update({ where: { id: l.id }, data: { status: "merged" } }));
  }
  for (const t of r.extraMinutes) {
    const l = byOrder.get(t.order);
    if (l) ops.push(prisma.lesson.update({ where: { id: l.id }, data: { extraMinutes: { increment: t.minutes } } }));
  }
  for (const order of r.summarize) {
    const l = byOrder.get(order);
    if (l) ops.push(prisma.lesson.update({ where: { id: l.id }, data: { status: "summary" } }));
  }
  await prisma.$transaction(ops);
  await notifyGroup(user, today, {
    kind: "comeback",
    title: `${user.name}님이 돌아왔어요`,
    body: "다시 같이 가요",
    href: "/group",
  });
  return true;
}
