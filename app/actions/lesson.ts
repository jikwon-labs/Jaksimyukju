"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getHour, getNow, getToday } from "@/lib/clock";
import { cleanOneLiner, cleanRating, cleanReview, type CompleteMode } from "@/lib/domain/lesson";
import { prisma } from "@/lib/prisma";
import { syncCourseStatus } from "@/lib/server/course";
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
  const today = await getToday();
  const r = await completeLesson(user, lessonId, mode === "short" ? "short" : "full", today, await getNow());
  if (!r.ok) redirect("/home");
  await syncCourseStatus(user, today);
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
    const rating = cleanRating(formData.get("rating"));
    // 후기는 지워서 저장할 수도 있으니 칸이 왔으면 빈 값도 반영한다
    const review = formData.has("review") ? cleanReview(formData.get("review")) : lesson.review;
    const data = {
      ...(oneLiner && oneLiner !== lesson.oneLiner ? { oneLiner } : {}),
      ...(rating && rating !== lesson.rating ? { rating } : {}),
      ...(review !== lesson.review ? { review } : {}),
    };
    if (Object.keys(data).length > 0) await prisma.lesson.update({ where: { id: lesson.id }, data });
    if (formData.get("share") === "on") {
      await notifyGroupDone(user, await getToday(), await getHour(), await getNow());
    }
    revalidateLoop(lesson.id);
  }
  redirect(to);
}
