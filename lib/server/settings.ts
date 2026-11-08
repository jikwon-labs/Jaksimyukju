import "server-only";
import type { Prisma, User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { MINUTE_OPTIONS, normalizeTime } from "@/lib/domain/prefs";
import { parseStudyDays, sortStudyDays } from "@/lib/domain/dates";
import { nextSchedule, type ScheduleChange } from "@/lib/domain/rest";
import { getToday } from "@/lib/clock";

export const settingsSchema = z
  .object({
    studyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    minutesPerDay: z.number().int().refine((n) => (MINUTE_OPTIONS as readonly number[]).includes(n)),
    notifyTime: z.string().regex(/^\d{2}:\d{2}$/),
    notifyNudge: z.boolean(),
    notifyTeacher: z.boolean(),
    notifyRetro: z.boolean(),
    notifyGroup: z.boolean(),
    notifyReview: z.boolean(),
    theme: z.enum(["system", "light", "dark"]),
  })
  .partial();

export type SettingsPatch = z.infer<typeof settingsSchema>;

/**
 * 학습 요일은 사람 하나에 하나다. 바꾸면 열린 과정(진행 중·방금 완주) 모두에 요일 변경 이력을 남겨,
 * 지난 날의 연속·복귀 판정이 바뀌지 않게 한다
 */
export async function recordStudyDays(user: Pick<User, "id" | "studyDays">, next: number[], today: string) {
  const prev = parseStudyDays(user.studyDays);
  const days = sortStudyDays(next);
  if (prev.join(",") === days.join(",")) return;
  const courses = await prisma.course.findMany({ where: { userId: user.id, status: { in: ["active", "finished"] } } });
  for (const course of courses) {
    const schedule = nextSchedule(course.schedule as unknown as ScheduleChange[], course.startDate, prev, days, today);
    await prisma.course.update({
      where: { id: course.id },
      data: { schedule: schedule as unknown as Prisma.InputJsonValue },
    });
  }
}

export async function updateSettings(user: User, patch: unknown): Promise<User | null> {
  const parsed = settingsSchema.safeParse(patch);
  if (!parsed.success) return null;
  const p = parsed.data;
  if (p.studyDays) await recordStudyDays(user, p.studyDays, await getToday());
  return prisma.user.update({
    where: { id: user.id },
    data: {
      ...(p.studyDays && { studyDays: sortStudyDays(p.studyDays).join(",") }),
      ...(p.minutesPerDay !== undefined && { minutesPerDay: p.minutesPerDay }),
      ...(p.notifyTime && { notifyTime: normalizeTime(p.notifyTime) }),
      ...(p.notifyNudge !== undefined && { notifyNudge: p.notifyNudge }),
      ...(p.notifyTeacher !== undefined && { notifyTeacher: p.notifyTeacher }),
      ...(p.notifyRetro !== undefined && { notifyRetro: p.notifyRetro }),
      ...(p.notifyGroup !== undefined && { notifyGroup: p.notifyGroup }),
      ...(p.notifyReview !== undefined && { notifyReview: p.notifyReview }),
      ...(p.theme && { theme: p.theme }),
    },
  });
}
