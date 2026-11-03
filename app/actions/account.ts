"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { AI_CONSENT_COOKIE } from "@/lib/domain/ai-consent";
import { deleteAccount } from "@/lib/server/account";
import { TEACHER_COOKIE } from "@/lib/theme";

/** 계정 삭제. "확인했어요" 체크를 해야 지운다 */
export async function deleteAccountAction(form: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (form.get("confirm") !== "yes") redirect("/settings/delete?error=confirm");
  await deleteAccount(user.id);
  const jar = await cookies();
  // 세션 행은 사용자와 함께 지워졌다. 이 기기에 남은 쿠키도 치운다
  jar.delete(SESSION_COOKIE);
  jar.delete(TEACHER_COOKIE);
  jar.delete(AI_CONSENT_COOKIE);
  redirect("/?login=deleted");
}
