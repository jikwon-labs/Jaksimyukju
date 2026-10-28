"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { getAi, type RetroCard } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { loadState, teacherOf } from "@/lib/server/course";
import { notifyGroup } from "@/lib/server/social";

function cleanAnswers(answers: unknown): string[] | null {
  if (!Array.isArray(answers) || answers.length !== 3) return null;
  const out = answers.map((a) => (typeof a === "string" ? a.trim().slice(0, 200) : ""));
  return out.every((a) => a.length > 0) ? out : null;
}

export async function roommateAction(answers: string[]): Promise<{ ok: true; card: RetroCard } | { ok: false }> {
  const user = await getSessionUser();
  const clean = cleanAnswers(answers);
  if (!user || !clean) return { ok: false };
  const st = await loadState(user, await getToday());
  if (!st) return { ok: false };
  try {
    const card = await getAi().roommate({
      teacher: teacherOf(user),
      topic: st.course.topic,
      weekIndex: st.view.currentWeek,
      answers: clean,
    });
    return { ok: true, card };
  } catch {
    return { ok: false };
  }
}

/** 회고 저장. 공유하면 다짐 한 줄만 그룹에 알린다(대화 내용은 보내지 않는다) */
export async function saveRetroAction(input: {
  answers: string[];
  pledge: string;
  shared: boolean;
}): Promise<{ ok: boolean; notified: number }> {
  const user = await getSessionUser();
  const clean = cleanAnswers(input.answers);
  const pledge = typeof input.pledge === "string" ? input.pledge.trim().slice(0, 120) : "";
  if (!user || !clean || !pledge) return { ok: false, notified: 0 };
  const today = await getToday();
  const st = await loadState(user, today);
  if (!st) return { ok: false, notified: 0 };
  await prisma.retro.create({
    data: { userId: user.id, weekIndex: st.view.currentWeek, answers: clean, pledge, shared: !!input.shared },
  });
  let notified = 0;
  if (input.shared) {
    notified = await notifyGroup(user, today, {
      kind: "group",
      title: `${user.name}님이 다음 주 다짐을 공유했어요`,
      body: pledge,
      href: "/group",
    });
  }
  revalidatePath("/home");
  return { ok: true, notified };
}
