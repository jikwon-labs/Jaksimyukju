import "server-only";
import type { User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { MINUTE_OPTIONS, normalizeTime } from "@/lib/domain/prefs";
import { sortStudyDays } from "@/lib/domain/dates";

export const settingsSchema = z
  .object({
    studyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    minutesPerDay: z.number().int().refine((n) => (MINUTE_OPTIONS as readonly number[]).includes(n)),
    notifyTime: z.string().regex(/^\d{2}:\d{2}$/),
    notifyNudge: z.boolean(),
    notifyTeacher: z.boolean(),
    notifyRetro: z.boolean(),
    notifyGroup: z.boolean(),
    theme: z.enum(["system", "light", "dark"]),
  })
  .partial();

export type SettingsPatch = z.infer<typeof settingsSchema>;

export async function updateSettings(user: User, patch: unknown): Promise<User | null> {
  const parsed = settingsSchema.safeParse(patch);
  if (!parsed.success) return null;
  const p = parsed.data;
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
      ...(p.theme && { theme: p.theme }),
    },
  });
}
