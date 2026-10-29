"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WeekEdit = z.object({
  index: z.number().int().min(1).max(12),
  title: z.string().trim().min(1).max(40),
  milestone: z.string().trim().min(1).max(80),
});

/** 미리보기에서 주차 제목과 마일스톤을 고친다(F3). 내 진행 중 과정의 주차만 바꾼다 */
export async function renameWeekAction(
  index: number,
  title: string,
  milestone: string,
): Promise<{ ok: boolean; message?: string }> {
  const input = WeekEdit.safeParse({ index, title, milestone });
  if (!input.success) return { ok: false, message: "제목과 마일스톤을 한 글자 이상 적어 주세요" };
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "다시 들어와 주세요" };
  const r = await prisma.week.updateMany({
    where: { index: input.data.index, course: { userId: user.id, status: "active" } },
    data: { goal: input.data.title, milestoneTitle: input.data.milestone },
  });
  return r.count > 0 ? { ok: true } : { ok: false, message: "주차를 찾지 못했어요" };
}
