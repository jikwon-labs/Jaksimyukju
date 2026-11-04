"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { answerCard, type AnswerResult } from "@/lib/server/review";

const Input = z.object({ cardId: z.string().min(1).max(64), choice: z.number().int().min(0).max(9) });

/**
 * 복습 카드 한 장 풀기. 채점과 다음 일정은 서버가 정한다.
 * 여기서는 revalidatePath를 부르지 않는다: 부르면 응답에 지금 화면(/review)을 다시 그린 결과가 같이 실려,
 * 오늘 풀 카드가 6장을 넘을 때 새로 들어온 카드의 문제를 AI로 만드는 동안 채점 응답이 기다리게 된다.
 * 홈 갱신은 마지막 장을 푼 뒤 finishReviewAction이 한 번만 한다
 */
export async function answerReviewAction(cardId: string, choice: number): Promise<AnswerResult> {
  const input = Input.safeParse({ cardId, choice });
  if (!input.success) return { ok: false, message: "보기를 다시 골라 주세요" };
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "다시 들어와 주세요" };
  return answerCard(user, input.data.cardId, input.data.choice, await getToday());
}

/** 복습 묶음을 다 푼 뒤 한 번. 홈의 "오늘 복습 n개"를 새로 그리게 한다(뒤로 가기로 돌아가도 새 숫자가 보인다) */
export async function finishReviewAction(): Promise<void> {
  if (!(await getSessionUser())) return;
  revalidatePath("/home");
}
