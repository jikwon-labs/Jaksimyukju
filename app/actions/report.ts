"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Input = z.object({
  lessonId: z.string().min(1).optional(),
  resourceId: z.string().min(1).optional(),
  reason: z.enum(["설명이 틀린 것 같아요", "자료 링크가 이상해요", "너무 어려워요"]),
});

/** "이상해요" 신고. 내 과정의 레슨·자료만 받는다 */
export async function reportAction(raw: { lessonId?: string; resourceId?: string; reason: string }): Promise<boolean> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return false;
  const user = await getSessionUser();
  if (!user) return false;
  const { lessonId, resourceId, reason } = parsed.data;
  if (lessonId) {
    const own = await prisma.lesson.count({ where: { id: lessonId, course: { userId: user.id } } });
    if (!own) return false;
  }
  if (resourceId) {
    const own = await prisma.resource.count({ where: { id: resourceId, lesson: { course: { userId: user.id } } } });
    if (!own) return false;
  }
  await prisma.report.create({ data: { userId: user.id, lessonId, resourceId, reason } });
  return true;
}
