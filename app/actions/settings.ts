"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, signIn, signOut } from "@/lib/auth";
import { isTeacher } from "@/lib/design/tokens";
import { prisma } from "@/lib/prisma";
import { updateSettings } from "@/lib/server/settings";

export async function saveSettingsAction(patch: unknown): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  const u = await updateSettings(user, patch);
  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/home");
  return { ok: !!u };
}

/** 선생님만 바꾸고 진도는 그대로 둔다. 쿠키도 다시 써서 다음 화면부터 색이 바뀐다 */
export async function changeTeacherAction(teacher: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user || !isTeacher(teacher)) return { ok: false };
  const u = await prisma.user.update({ where: { id: user.id }, data: { teacher } });
  await signIn(u);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/");
}
