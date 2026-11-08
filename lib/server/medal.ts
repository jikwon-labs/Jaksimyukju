import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lastDoneDay } from "@/lib/domain/medal";

export interface PendingMedal {
  courseId: string;
  topic: string;
  weeks: number;
  start: string; // YYYY-MM-DD
  end: string;
  cells: number;
}

export interface EarnedMedal {
  courseId: string;
  topic: string;
  weeks: number;
  end: string;
}

const select = {
  id: true,
  topic: true,
  weeksCount: true,
  startDate: true,
  lessons: { select: { completedDay: true } },
} as const;

/** 완주했지만 아직 수여 화면을 닫지 않은 과정(가장 최근 것 하나) */
export async function pendingMedal(user: Pick<User, "id">): Promise<PendingMedal | null> {
  const c = await prisma.course.findFirst({
    where: { userId: user.id, status: "finished", medalSeenAt: null },
    orderBy: [{ finishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select,
  });
  if (!c) return null;
  return {
    courseId: c.id,
    topic: c.topic,
    weeks: c.weeksCount,
    start: c.startDate,
    end: lastDoneDay(
      c.lessons.map((l) => l.completedDay),
      c.startDate,
    ),
    cells: c.lessons.length,
  };
}

/** 받은 메달(완주한 과정) 전부. 최근 완주부터 */
export async function earnedMedals(userId: string): Promise<EarnedMedal[]> {
  const cs = await prisma.course.findMany({
    where: { userId, status: "finished" },
    orderBy: [{ finishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select,
  });
  return cs.map((c) => ({
    courseId: c.id,
    topic: c.topic,
    weeks: c.weeksCount,
    end: lastDoneDay(
      c.lessons.map((l) => l.completedDay),
      c.startDate,
    ),
  }));
}

/** 수여 화면을 닫았다고 기록한다. 내 완주 과정이고 처음 닫을 때만 true */
export async function markMedalSeen(userId: string, courseId: string, now: Date): Promise<boolean> {
  const r = await prisma.course.updateMany({
    where: { id: courseId, userId, status: "finished", medalSeenAt: null },
    data: { medalSeenAt: now },
  });
  return r.count > 0;
}
