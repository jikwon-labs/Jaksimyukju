"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getHour, getToday } from "@/lib/clock";
import { NUDGE_MESSAGES } from "@/lib/domain/limits";
import { sendNudge } from "@/lib/server/group";

const HELD: Record<"quiet" | "daily_max" | "resting" | "muted", string> = {
  quiet: "밤 11시부터 아침 7시까지는 알림을 보내지 않아요",
  daily_max: "오늘은 알림을 이미 두 번 받아서 알림은 보내지 않았어요",
  resting: "쉬어 가는 중이라 알림은 보내지 않았어요",
  muted: "콕 찌르기 알림을 꺼 두어서 알림은 보내지 않았어요",
};

export async function nudgeAction(toId: string): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "다시 들어와 주세요" };
  const r = await sendNudge(user, toId, await getToday(), await getHour());
  revalidatePath("/home");
  revalidatePath("/group");
  if (!r.ok) return { ok: false, message: NUDGE_MESSAGES[r.reason] };
  if ("delivered" in r) return { ok: true, message: `콕 찔렀어요. ${HELD[r.why]}` };
  return { ok: true, message: "콕 찔렀어요" };
}
