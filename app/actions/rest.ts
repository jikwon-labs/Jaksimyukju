"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import type { ReplanKind } from "@/lib/domain/rest";
import { loadState } from "@/lib/server/course";
import { applyComeback, cancelRest, reservePause } from "@/lib/server/rest";

function revalidateAll() {
  for (const p of ["/pause", "/home", "/settings", "/group", "/curriculum", "/profile"]) revalidatePath(p);
}

export async function pauseAction(days: string[], reason: string | null): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "다시 들어와 주세요" };
  const clean = days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const r = await reservePause(user, await getToday(), clean, reason);
  revalidateAll();
  return r.ok ? { ok: true, message: `${r.days.length}일 쉬어 가기를 예약했어요` } : { ok: false, message: r.message };
}

export async function cancelRestAction(day: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  const ok = await cancelRest(user, await getToday(), day);
  revalidateAll();
  return { ok };
}

const KINDS: ReplanKind[] = ["delay", "squeeze", "skip"];

export async function comebackAction(form: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const kind = String(form.get("plan") ?? "") as ReplanKind;
  const to = String(form.get("to") ?? "home");
  const today = await getToday();
  if (KINDS.includes(kind)) await applyComeback(user, today, kind);
  revalidateAll();
  if (to === "short") {
    const st = await loadState(user, today);
    const step = st?.view.today;
    if (step?.kind === "lesson" && step.lessonId) redirect(`/lesson/${step.lessonId}?mode=short`);
  }
  redirect("/home");
}
