import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DayKey } from "@/lib/domain/dates";
import { addDays } from "@/lib/domain/dates";
import { type CompleteMode, groupNotifyTargets, planCompletion } from "@/lib/domain/lesson";
import { getGroupView } from "./group";
import { createCapped } from "./notify";
import { addLessonCard } from "./review";

/** 내 과정의 레슨만 연다 */
export async function getOwnLesson(user: User, id: string) {
  return prisma.lesson.findFirst({
    where: { id, course: { userId: user.id } },
    include: {
      resources: { orderBy: { id: "asc" } },
      week: true,
      course: true,
    },
  });
}

export type OwnLesson = NonNullable<Awaited<ReturnType<typeof getOwnLesson>>>;

export async function getOwnResource(user: User, id: string) {
  return prisma.resource.findFirst({
    where: { id, lesson: { course: { userId: user.id } } },
    include: {
      lesson: { include: { resources: { orderBy: { id: "asc" } }, week: true, course: true } },
      material: { select: { source: true, kind: true } },
    },
  });
}

/** 레슨 완료. 같은 레슨을 다시 완료해도 두 번 세지 않는다 */
export async function completeLesson(
  user: User,
  lessonId: string,
  mode: CompleteMode,
  today: DayKey,
  now: Date,
): Promise<{ ok: boolean; firstTime: boolean }> {
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, course: { userId: user.id } } });
  if (!lesson) return { ok: false, firstTime: false };
  // 복귀 재조정으로 닫힌 레슨(요약으로 넘김, 다음 레슨에 합침)은 다시 읽기만 한다. 잔디를 두 번 채우지 않는다
  if (lesson.status === "merged" || lesson.status === "summary") return { ok: true, firstTime: false };
  const plan = planCompletion(lesson, mode, today);
  if (!plan.changed) return { ok: true, firstTime: false };
  const applied = await prisma.$transaction(async (tx) => {
    // 읽은 상태 그대로일 때만 바꾼다. 두 탭에서 동시에 눌러도 한 번만 반영된다
    const changed = await tx.lesson.updateMany({
      where: { id: lesson.id, status: lesson.status },
      data: {
        status: plan.status,
        completedDay: plan.completedDay,
        completedAt: plan.firstTime ? now : (lesson.completedAt ?? now),
      },
    });
    if (changed.count === 0) return false;
    if (plan.carryToNext > 0) {
      const next = await tx.lesson.findFirst({
        where: { courseId: lesson.courseId, status: "todo", order: { gt: lesson.order } },
        orderBy: { order: "asc" },
      });
      if (next) {
        await tx.lesson.update({
          where: { id: next.id },
          data: { extraMinutes: { increment: plan.carryToNext } },
        });
      }
    }
    return true;
  });
  // 마친 레슨은 1일 뒤 복습 카드가 된다(이미 있으면 그대로)
  if (applied) await addLessonCard(user.id, lesson, today);
  return { ok: true, firstTime: applied && plan.firstTime };
}

export function completionTitle(name: string): string {
  return `${name}님이 오늘 레슨을 마쳤어요`;
}

/** 그룹 동료에게 "오늘 완료"만 알린다. 하루 2회·밤 시간·쉬는 중·알림 끔·중복을 지킨다 */
export async function notifyGroupDone(user: User, today: DayKey, hour: number, now: Date): Promise<number> {
  const group = await getGroupView(user, today);
  if (!group) return 0;
  const others = group.members.filter((m) => !m.me);
  if (others.length === 0) return 0;
  const from = new Date(`${today}T00:00:00+09:00`);
  const to = new Date(`${addDays(today, 1)}T00:00:00+09:00`);
  const title = completionTitle(user.name);
  const users = await prisma.user.findMany({ where: { id: { in: others.map((m) => m.id) } } });
  const sent = await prisma.notification.findMany({
    where: { userId: { in: others.map((m) => m.id) }, createdAt: { gte: from, lt: to } },
    select: { userId: true, title: true },
  });
  const targets = groupNotifyTargets(
    others.map((m) => ({
      id: m.id,
      sentToday: sent.filter((n) => n.userId === m.id).length,
      resting: m.resting,
      enabled: users.find((u) => u.id === m.id)?.notifyGroup ?? true,
      already: sent.some((n) => n.userId === m.id && n.title === title),
    })),
    hour,
  );
  if (targets.length === 0) return 0;
  let sentCount = 0;
  for (const id of targets) {
    if (await createCapped({ userId: id, kind: "group", title, body: group.name, href: "/group", createdAt: now }, today)) sentCount++;
  }
  return sentCount;
}
