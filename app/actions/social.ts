"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { prisma } from "@/lib/prisma";
import { INVITE_COOKIE } from "@/lib/domain/social";
import { getActiveCourse } from "@/lib/server/course";
import { joinByCode, regenerateInvite, setVisibility } from "@/lib/server/social";

export async function setVisibilityAction(v: "grass" | "grass_topic"): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user || (v !== "grass" && v !== "grass_topic")) return { ok: false };
  const ok = await setVisibility(user, v);
  revalidatePath("/group");
  revalidatePath("/group/invite");
  return { ok };
}

export async function regenerateInviteAction(): Promise<{ code: string; expiresAt: string } | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const g = await regenerateInvite(user);
  revalidatePath("/group/invite");
  return { code: g.inviteCode, expiresAt: g.inviteExpiresAt.toISOString() };
}

/** 초대 받기: 로그인과 과정이 있으면 바로 합류, 아니면 코드를 쿠키에 두고 시작 화면으로 */
export async function acceptInviteAction(code: string): Promise<{ ok: false; message: string } | never> {
  const user = await getSessionUser();
  const course = user ? await getActiveCourse(user.id) : null;
  if (!user || !course) {
    (await cookies()).set(INVITE_COOKIE, code, { path: "/", sameSite: "lax", maxAge: 7 * 86_400 });
    redirect(user ? "/start/personality" : "/");
  }
  const r = await joinByCode(user, code, await getToday());
  if (!r.ok) return r;
  (await cookies()).delete(INVITE_COOKIE);
  revalidatePath("/group");
  redirect("/group");
}

export async function markAllReadAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/notifications");
  revalidatePath("/home");
}

/** 알림을 열면 읽음으로 바꾸고 그 화면으로 간다 */
export async function openNotificationAction(form: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const id = String(form.get("id") ?? "");
  const n = await prisma.notification.findFirst({ where: { id, userId: user.id } });
  if (!n) redirect("/notifications");
  if (!n.readAt) await prisma.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });
  revalidatePath("/notifications");
  const href = n.href && n.href.startsWith("/") && !n.href.startsWith("//") ? n.href : "/notifications";
  redirect(href);
}
