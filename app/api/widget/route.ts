import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { loadWidgetSummary } from "@/lib/server/widget";

/**
 * 홈 화면 위젯 요약(lib/domain/widget.ts). 로그인 세션 쿠키로만 읽는다.
 * 앱 껍데기 안의 웹 화면(components/WidgetSync.tsx)이 불러 껍데기에 넘긴다. 저장하지 않게 no-store로 준다.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { error: "auth" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const summary = await loadWidgetSummary(user, await getToday());
  return NextResponse.json(summary, { headers: { "Cache-Control": "private, no-store" } });
}
