"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser, signIn } from "@/lib/auth";
import { devToolsEnabled } from "@/lib/clock";
import { DEMO_USER_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * 기존 계정으로 이어서 하기(모의). 실제 소셜 로그인 대신 데모 사용자로 들어간다.
 * 데모 사용자가 없으면 처음부터 시작하게 한다.
 */
export async function continueAsDemo(): Promise<void> {
  // 실제 로그인(Supabase Auth)을 붙이기 전까지 개발 모드에서만 연다
  if (!devToolsEnabled()) redirect("/start/personality");
  const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
  if (!user) redirect("/start/personality");
  await signIn(user);
  redirect("/home");
}

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
