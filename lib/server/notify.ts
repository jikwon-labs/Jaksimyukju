import "server-only";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, type DayKey } from "@/lib/domain/dates";
import { canNotify, NOTIFY_DAILY_MAX, type NotifyDecision } from "@/lib/domain/limits";

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

type Db = Pick<Prisma.TransactionClient, "notification">;

/**
 * 하루 한도 칸(capKey)을 하나 차지하며 알림을 만든다. notifyDecision으로 센 뒤 넣는 사이에
 * 다른 요청이 끼어들어도 하루 NOTIFY_DAILY_MAX개를 넘지 않는다. 칸이 다 찼거나 같은 dedupeKey가
 * 이미 있으면 false. 유일 제약 실패가 트랜잭션을 깨는 DB도 있어서 트랜잭션 밖에서 부른다.
 */
export async function createCapped(
  data: Omit<Prisma.NotificationUncheckedCreateInput, "capKey">,
  today: DayKey,
  db: Db = prisma,
): Promise<boolean> {
  for (let slot = 1; slot <= NOTIFY_DAILY_MAX; slot++) {
    try {
      await db.notification.create({ data: { ...data, capKey: `${data.userId}:${today}:${slot}` } });
      return true;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e;
      // 같은 알림이 이미 있으면 그만, 칸이 찼으면 다음 칸
      if (data.dedupeKey && (await db.notification.count({ where: { dedupeKey: data.dedupeKey } })) > 0) return false;
    }
  }
  return false;
}
