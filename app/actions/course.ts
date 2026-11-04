"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { devToolsEnabled, getToday } from "@/lib/clock";
import { AiError, getAi, type MilestoneFeedback } from "@/lib/ai";
import { MILESTONE_MAX, normalizeFeedback } from "@/lib/domain/milestone";
import { scoreQuiz } from "@/lib/domain/quiz";
import { prisma } from "@/lib/prisma";
import { quizOf, syncCourseStatus, teacherOf } from "@/lib/server/course";
import { criteriaOf, weekAccess } from "@/lib/server/progress";
import { addQuizMisses } from "@/lib/server/review";

/** 개발·E2E에서 AI 실패 화면을 보려면 이 쿠키를 1로 둔다 */
const AI_FAIL_COOKIE = "j6_ai_fail";

function refresh(week: number) {
  revalidatePath("/home");
  revalidatePath("/curriculum");
  revalidatePath("/profile");
  revalidatePath(`/quiz/${week}`);
  revalidatePath(`/milestone/${week}`);
  revalidatePath("/finish");
  revalidatePath("/review");
}

export type QuizResult = { ok: true; score: number } | { ok: false; message: string };

const QuizInput = z.object({
  week: z.number().int().min(1).max(52),
  picks: z.array(z.number().int().min(0).max(9)).max(10),
});

export async function submitQuizAction(week: number, picks: number[]): Promise<QuizResult> {
  const input = QuizInput.safeParse({ week, picks });
  if (!input.success) return { ok: false, message: "답을 다시 골라 주세요" };
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "다시 들어와 주세요" };
  const today = await getToday();
  const { access } = await weekAccess(user, today, week);
  if (!access) return { ok: false, message: "이 주차를 찾지 못했어요" };
  if (access.locked) return { ok: false, message: "아직 열리지 않은 주차예요" };
  const questions = quizOf(access.week.quiz);
  const scored = scoreQuiz(questions, picks);
  if (!scored) return { ok: false, message: "답을 다시 골라 주세요" };
  await prisma.quizAttempt.create({
    data: { weekId: access.week.id, score: scored.score, answers: scored.answers.map((a) => ({ choice: a.choice, correct: a.correct })), day: today },
  });
  // 틀린 문제는 1일 뒤 복습 카드로
  await addQuizMisses(user.id, access.st.course.id, access.week, questions, scored.answers, today);
  await syncCourseStatus(user, today);
  refresh(week);
  return { ok: true, score: scored.score };
}

export type MilestoneResult =
  | { ok: true; feedback: MilestoneFeedback; round: number; content: string }
  | { ok: false; reason: "auth" | "locked" | "empty" | "ai"; message: string };

export async function submitMilestoneAction(week: number, content: string): Promise<MilestoneResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "auth", message: "다시 들어와 주세요" };
  const text = content.trim().slice(0, MILESTONE_MAX);
  if (!text) return { ok: false, reason: "empty", message: "한 줄이라도 적어 주세요" };
  const today = await getToday();
  const { st, access } = await weekAccess(user, today, week);
  if (!st || !access) return { ok: false, reason: "locked", message: "이 주차를 찾지 못했어요" };
  if (access.locked) return { ok: false, reason: "locked", message: "아직 열리지 않은 주차예요" };
  const labels = criteriaOf(access.week);
  const round = access.week.milestones.length + 1;
  let feedback: MilestoneFeedback;
  try {
    if (devToolsEnabled() && (await cookies()).get(AI_FAIL_COOKIE)?.value === "1") {
      throw new AiError("forced failure", "network");
    }
    const raw = await getAi().milestoneFeedback({
      teacher: teacherOf(user),
      milestone: access.week.milestoneTitle,
      criteria: labels,
      content: text,
      round,
      nextWeek: access.last ? null : week + 1,
    });
    feedback = normalizeFeedback(raw, labels);
  } catch (e) {
    if (!(e instanceof AiError)) console.error("milestone feedback failed", e);
    return { ok: false, reason: "ai", message: "선생님이 잠깐 말을 놓쳤어요" };
  }
  await prisma.milestoneSubmission.create({
    data: {
      weekId: access.week.id,
      content: text,
      feedback: { ...feedback, criteria: feedback.criteria.map((c) => ({ ...c })) },
      round,
      day: today,
    },
  });
  if (feedback.passed) await syncCourseStatus(user, today);
  refresh(week);
  return { ok: true, feedback, round, content: text };
}
