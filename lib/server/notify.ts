import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, type DayKey } from "@/lib/domain/dates";
import { canNotify, type NotifyDecision } from "@/lib/domain/limits";

export type NotifyKind = "nudge" | "teacher" | "retro" | "group" | "comeback" | "invite";

function enabledFor(user: User, kind: NotifyKind): boolean {
  if (kind === "nudge") return user.notifyNudge;
  if (kind === "teacher") return user.notifyTeacher;
  if (kind === "retro") return user.notifyRetro;
  return user.notifyGroup;
}

/** 받는 사람 기준 알림 가능 여부: 하루 2번, 밤 11시~아침 7시, 진행 중 과정의 쉬는 날, 종류별 끔 */
export async function notifyDecision(to: User, kind: NotifyKind, today: DayKey, hour: number): Promise<NotifyDecision> {
  const from = new Date(`${today}T00:00:00+09:00`);
  const until = new Date(`${addDays(today, 1)}T00:00:00+09:00`);
  const sentToday = await prisma.notification.count({ where: { userId: to.id, createdAt: { gte: from, lt: until } } });
  const resting = await prisma.restDay.count({
    where: { userId: to.id, day: today, course: { status: "active" } },
  });
  return canNotify({ hour, sentToday, resting: resting > 0, enabled: enabledFor(to, kind) });
}
