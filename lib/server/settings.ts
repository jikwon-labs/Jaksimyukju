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

export async function updateSettings(user: User, patch: unknown): Promise<User | null> {
  const parsed = settingsSchema.safeParse(patch);
  if (!parsed.success) return null;
  const p = parsed.data;
  if (p.studyDays) {
    // 진행 중 과정에 요일 변경 이력을 남겨, 지난 날의 연속·복귀 판정이 바뀌지 않게 한다
    // 화면이 보여 주는 과정(진행 중 또는 방금 완주)에 이력을 남긴다
    const course = await prisma.course.findFirst({
      where: { userId: user.id, status: { in: ["active", "finished"] } },
      orderBy: { createdAt: "desc" },
    });
    if (course) {
      const today = await getToday();
      const schedule = nextSchedule(
        course.schedule as unknown as ScheduleChange[],
        course.startDate,
        parseStudyDays(user.studyDays),
        sortStudyDays(p.studyDays),
        today,
      );
      await prisma.course.update({
        where: { id: course.id },
        data: { schedule: schedule as unknown as Prisma.InputJsonValue },
      });
    }
  }
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
