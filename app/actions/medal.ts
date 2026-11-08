"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { setFocusCourse } from "@/lib/server/course";
import { markMedalSeen } from "@/lib/server/medal";

/** 메달 받기: 수여 화면을 다시 띄우지 않게 기록하고, 목적지 화면이 그 과정을 보게 한다 */
export async function claimMedalAction(courseId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user || typeof courseId !== "string" || !courseId) return;
  if (!(await markMedalSeen(user.id, courseId, await getNow()))) return;
  await setFocusCourse(user.id, courseId);
  revalidatePath("/home");
  revalidatePath("/curriculum");
  revalidatePath("/finish");
  revalidatePath("/profile");
}
