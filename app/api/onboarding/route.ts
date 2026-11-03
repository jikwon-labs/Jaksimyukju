import { NextResponse, type NextRequest } from "next/server";
import { AiError } from "@/lib/ai/types";
import { getSessionUser } from "@/lib/auth";
import { hasAiConsent } from "@/lib/server/ai-consent";
import { OnboardingInput, startOnboarding } from "@/lib/server/onboarding";

/** 시작 흐름 마지막: 계정(게스트)과 과정을 만들고 미리보기용 요약을 돌려준다 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = OnboardingInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) },
      { status: 400 },
    );
  }
  // 주제·목표를 외부 AI로 보내기 전에 동의를 받았는지 본다(화면은 /start/preview가 먼저 보낸다)
  if (!(await hasAiConsent(await getSessionUser())))
    return NextResponse.json({ error: "consent" }, { status: 403 });
  try {
    const summary = await startOnboarding(parsed.data);
    return NextResponse.json(summary);
  } catch (e) {
    if (e instanceof AiError) {
      console.error("[onboarding] ai", e.reason, e.message);
      return NextResponse.json({ error: "ai", reason: e.reason }, { status: 502 });
    }
    console.error("[onboarding]", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
