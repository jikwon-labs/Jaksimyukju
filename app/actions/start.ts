"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { DEMO_USER_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * 기존 계정으로 이어서 하기(모의). 실제 소셜 로그인 대신 데모 사용자로 들어간다.
 * 데모 사용자가 없으면 처음부터 시작하게 한다.
 */
export async function continueAsDemo(): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
  if (!user) redirect("/start/personality");
  await signIn(user);
  redirect("/home");
}
