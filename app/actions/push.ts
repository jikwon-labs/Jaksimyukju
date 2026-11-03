"use server";

import { getSessionUser } from "@/lib/auth";
import { savePushToken } from "@/lib/server/push";

/** 앱 껍데기가 넘겨준 기기 토큰을 지금 사용자에 붙인다 */
export async function savePushTokenAction(token: unknown): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  if (user.pushToken === token) return { ok: true };
  return { ok: await savePushToken(user.id, token) };
}
