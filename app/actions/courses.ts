"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { setFocusCourse, stopCourse } from "@/lib/server/course";

/** 과정을 여러 개 함께 할 때 보는 과정을 바꾸고 오늘 화면으로 간다 */
export async function focusCourseAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const id = String(formData.get("courseId") ?? "");
  const ok = await setFocusCourse(user.id, id);
  revalidatePath("/", "layout");
  redirect(ok ? "/home" : "/courses");
}

/** 진행 중 과정을 그만둔다. 기록은 지난 과정에 남는다 */
export async function stopCourseAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const id = String(formData.get("courseId") ?? "");
  const left = await stopCourse(user.id, id);
  revalidatePath("/", "layout");
  // 남은 과정이 없으면 새로 시작하게 한다
  redirect(left > 0 ? "/courses" : "/start/topic?from=add");
}
