import "server-only";
// 쿠키 기반 게스트 세션. 나중에 Supabase Auth로 바꿀 때 이 파일만 고친다.
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { TEACHER_COOKIE } from "./theme";

export const SESSION_COOKIE = "j6_session";
const YEAR = 60 * 60 * 24 * 365;

export async function getSessionUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { id: token }, include: { user: true } });
  return session?.user ?? null;
}

/** Route Handler·Server Action에서만 부른다(쿠키 쓰기) */
export async function signIn(user: Pick<User, "id" | "teacher">): Promise<void> {
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE)?.value;
  const existing = current ? await prisma.session.findUnique({ where: { id: current } }) : null;
  if (existing?.userId !== user.id) {
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
  jar.set(TEACHER_COOKIE, encodeURIComponent(user.teacher), { sameSite: "lax", path: "/", maxAge: YEAR });
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

/**
 * 계정 연결(모의). 지금은 이메일만 적어 두고, 연결 전 기록은 같은 user 행에 그대로 남는다.
 * Supabase Auth로 바꿀 때: auth user를 만들고 이 users.id와 연결한다.
 */
export async function linkAccount(userId: string, email: string): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { email, linkedAt: new Date() } });
}

