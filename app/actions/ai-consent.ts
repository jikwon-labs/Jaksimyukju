"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { consentNext } from "@/lib/domain/ai-consent";
import { recordAiConsent, withdrawAiConsent } from "@/lib/server/ai-consent";

export async function agreeAiAction(form: FormData): Promise<void> {
  await recordAiConsent(await getSessionUser());
  redirect(consentNext(String(form.get("next") ?? "")));
}

export async function withdrawAiAction(): Promise<void> {
  await withdrawAiConsent(await getSessionUser());
  revalidatePath("/ai-consent");
  redirect("/ai-consent?from=settings&withdrawn=1");
}
