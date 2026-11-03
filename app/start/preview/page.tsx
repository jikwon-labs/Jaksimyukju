import { getSessionUser } from "@/lib/auth";
import { requireAiConsent } from "@/lib/server/ai-consent";
import { Preview } from "./preview.client";

export const metadata = { title: "커리큘럼 만들기 · 작심육주" };

export default async function PreviewPage() {
  // 커리큘럼은 외부 AI가 만든다. 주제·목표를 보내기 전에 안내와 동의부터
  await requireAiConsent(await getSessionUser(), "/start/preview");
  return <Preview />;
}
