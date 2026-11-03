import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { AI_CONSENT_COOKIE, AI_CONSENT_VERSION, consentPath } from "@/lib/domain/ai-consent";
import { prisma } from "@/lib/prisma";

const YEAR = 60 * 60 * 24 * 365;

/** 외부 AI로 보내도 되는지: 계정에 동의 기록이 있거나, 이 기기에서 지금 판의 안내에 동의했거나 */
export async function hasAiConsent(user: Pick<User, "aiConsentAt"> | null): Promise<boolean> {
  if (user?.aiConsentAt) return true;
  return (await cookies()).get(AI_CONSENT_COOKIE)?.value === AI_CONSENT_VERSION;
}

/** 페이지에서: 동의 전이면 동의 화면으로 보낸다(돌아올 경로를 붙여) */
export async function requireAiConsent(
  user: Pick<User, "aiConsentAt"> | null,
  next: string,
): Promise<void> {
  if (!(await hasAiConsent(user))) redirect(consentPath(next));
}

/** Server Action·Route Handler에서만(쿠키 쓰기) */
export async function recordAiConsent(user: Pick<User, "id"> | null): Promise<void> {
  (await cookies()).set(AI_CONSENT_COOKIE, AI_CONSENT_VERSION, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
  if (user) await prisma.user.update({ where: { id: user.id }, data: { aiConsentAt: new Date() } });
}

/** 동의 철회. 이후 AI 기능을 쓰려면 다시 동의해야 한다 */
export async function withdrawAiConsent(user: Pick<User, "id"> | null): Promise<void> {
  (await cookies()).delete(AI_CONSENT_COOKIE);
  if (user) await prisma.user.update({ where: { id: user.id }, data: { aiConsentAt: null } });
}

/** 게스트를 만든 직후: 시작 흐름에서 쿠키로 동의했으면 계정에도 옮겨 적는다 */
export async function carryAiConsent(user: Pick<User, "id" | "aiConsentAt">): Promise<void> {
  if (user.aiConsentAt) return;
  if ((await cookies()).get(AI_CONSENT_COOKIE)?.value !== AI_CONSENT_VERSION) return;
  await prisma.user.update({ where: { id: user.id }, data: { aiConsentAt: new Date() } });
}
