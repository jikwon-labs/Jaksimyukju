import "server-only";
// 세션(무작위 토큰 쿠키)과 소셜 계정 연결. 처음에는 게스트로 시작하고, 첫 레슨 뒤 카카오·구글 계정을 붙인다.
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { Prisma, type User } from "@prisma/client";
import type { ProviderId, SocialProfile } from "./domain/oauth";
import { prisma } from "./prisma";
import { TEACHER_COOKIE } from "./theme";

export const SESSION_COOKIE = "j6_session";
const YEAR = 60 * 60 * 24 * 365;

export async function getSessionUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  return session?.user ?? null;
}

/** Route Handler·Server Action에서만 부른다(쿠키 쓰기) */
export async function signIn(user: Pick<User, "id" | "teacher">): Promise<void> {
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE)?.value;
  const existing = current ? await prisma.session.findUnique({ where: { id: current } }) : null;
  if (existing?.userId !== user.id) {
    // 다른 사용자로 바꾸면 예전 토큰은 지운다(남은 토큰이 계속 유효하지 않게)
    if (existing) await prisma.session.delete({ where: { id: existing.id } });
    const token = randomBytes(32).toString("base64url");
    await prisma.session.create({ data: { id: token, userId: user.id } });
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: YEAR,
    });
  }
  jar.set(TEACHER_COOKIE, encodeURIComponent(user.teacher), {
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: token } });
  jar.delete(SESSION_COOKIE);
}

export async function createGuest(data: { teacher: string }): Promise<User> {
  const user = await prisma.user.create({ data: { teacher: data.teacher } });
  await signIn(user);
  return user;
}

export type LinkResult = "linked" | "already" | "taken" | "other";

/**
 * 지금 사용자(게스트)에 소셜 계정을 붙인다. 기록은 같은 user 행에 그대로 남는다.
 * - already: 이미 이 사용자에 붙어 있음
 * - taken: 그 소셜 계정이 다른 사용자 기록에 붙어 있음
 * - other: 이 사용자에 같은 공급자의 다른 계정이 이미 붙어 있음
 */
export async function linkSocial(
  userId: string,
  provider: ProviderId,
  profile: SocialProfile,
): Promise<LinkResult> {
  const found = await prisma.account.findUnique({
    where: { provider_providerUserId: { provider, providerUserId: profile.sub } },
  });
  if (found) return found.userId === userId ? "already" : "taken";
  const mine = await prisma.account.findFirst({ where: { userId, provider } });
  if (mine) return "other";
  try {
    await prisma.$transaction(async (tx) => {
      await tx.account.create({
        data: {
          provider,
          providerUserId: profile.sub,
          userId,
          email: profile.email,
          revokeToken: profile.revokeToken ?? null,
        },
      });
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      await tx.user.update({
        where: { id: userId },
        data: { linkedAt: user.linkedAt ?? new Date(), email: user.email ?? profile.email },
      });
    });
  } catch (e) {
    // 동시에 두 번 연결하면 유일 제약에 걸린다. 무엇과 부딪혔는지 다시 보고 가른다
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e;
    const again = await prisma.account.findUnique({
      where: { provider_providerUserId: { provider, providerUserId: profile.sub } },
    });
    if (again) return again.userId === userId ? "already" : "taken";
    return "other";
  }
  return "linked";
}

/** 소셜 계정에 붙은 사용자. 없으면 null */
export async function findSocialUser(provider: ProviderId, sub: string): Promise<User | null> {
  const acc = await prisma.account.findUnique({
    where: { provider_providerUserId: { provider, providerUserId: sub } },
    include: { user: true },
  });
  return acc?.user ?? null;
}
