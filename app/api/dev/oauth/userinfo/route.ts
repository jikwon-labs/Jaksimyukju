import { NextResponse, type NextRequest } from "next/server";
import { devToolsEnabled } from "@/lib/clock";
import { unpack } from "../shared";

/** 공급자마다 실제 응답과 같은 모양으로 돌려준다(앱의 해석 코드를 그대로 거치게) */
export async function GET(req: NextRequest) {
  if (!devToolsEnabled()) return new NextResponse("not found", { status: 404 });
  const u = unpack(req.headers.get("authorization")?.replace(/^Bearer /, ""));
  if (!u) return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  if (u.provider === "google") {
    return NextResponse.json({ sub: u.sub, email: u.email || undefined, email_verified: true, name: u.name || undefined });
  }
  return NextResponse.json({
    id: u.sub,
    kakao_account: { email: u.email || undefined, is_email_verified: true, profile: { nickname: u.name || undefined } },
  });
}
