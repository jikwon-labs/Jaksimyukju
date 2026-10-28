"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { NUDGE_MESSAGES } from "@/lib/domain/limits";
import { sendNudge } from "@/lib/server/group";

export async function nudgeAction(toId: string): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "다시 들어와 주세요" };
  const r = await sendNudge(user, toId, await getToday());
  revalidatePath("/home");
  revalidatePath("/group");
  return r.ok ? { ok: true, message: "콕 찔렀어요" } : { ok: false, message: NUDGE_MESSAGES[r.reason] };
}
