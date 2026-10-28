"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, linkAccount } from "@/lib/auth";
import { getHour, getNow, getToday } from "@/lib/clock";
import { cleanOneLiner, type CompleteMode, isEmail } from "@/lib/domain/lesson";
import { prisma } from "@/lib/prisma";
import { completeLesson, notifyGroupDone } from "@/lib/server/lesson";

function revalidateLoop(lessonId: string) {
  revalidatePath("/home");
  revalidatePath("/curriculum");
  revalidatePath("/group");
  revalidatePath(`/lesson/${lessonId}`);
}

/** 레슨 완료(전체 또는 5분 버전) 후 완료 화면으로 간다 */
export async function completeLessonAction(lessonId: string, mode: CompleteMode): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const r = await completeLesson(user, lessonId, mode === "short" ? "short" : "full", await getToday(), await getNow());
  if (!r.ok) redirect("/home");
  revalidateLoop(lessonId);
  redirect(`/lesson/${lessonId}/complete`);
}

/** 완료 화면을 닫을 때: 오늘 배운 한 줄 저장, 그룹에 완료 알리기 */
export async function wrapUpAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const lessonId = String(formData.get("lessonId") ?? "");
  const to = formData.get("to") === "curriculum" ? "/curriculum" : "/home";
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, course: { userId: user.id } } });
  if (lesson && lesson.status !== "todo") {
    const oneLiner = cleanOneLiner(formData.get("oneLiner"));
    if (oneLiner && oneLiner !== lesson.oneLiner) {
      await prisma.lesson.update({ where: { id: lesson.id }, data: { oneLiner } });
    }
    if (formData.get("share") === "on") {
      await notifyGroupDone(user, await getToday(), await getHour(), await getNow());
    }
    revalidateLoop(lesson.id);
  }
  redirect(to);
}

/** 계정 연결(모의): 이메일만 적어 둔다. 지금까지 기록은 같은 사용자에 그대로 남는다 */
export async function linkAccountAction(email: string): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "다시 들어와 주세요" };
  if (!isEmail(email)) return { ok: false, message: "이메일 주소를 확인해 주세요" };
  await linkAccount(user.id, email.trim());
  revalidatePath("/profile");
  revalidatePath("/settings");
  return { ok: true, message: "계정을 연결했어요. 기록이 안전하게 저장돼요." };
}
