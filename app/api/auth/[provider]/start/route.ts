import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, authorizeUrl, encodeFlow, isProviderId, newFlow, OAUTH_COOKIE, pathOf, redirectUri } from "@/lib/domain/oauth";
import { getProvider } from "@/lib/server/oauth";

const TEN_MINUTES = 60 * 10;

/** 소셜 로그인 시작: state·PKCE를 쿠키에 두고 공급자 동의 화면으로 보낸다. ?mode=login|link&next=/경로 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = appOrigin(req.nextUrl.origin);
  const p = isProviderId(provider) ? getProvider(provider, origin) : null;
  if (!p) return new NextResponse("not found", { status: 404 });
  const mode = req.nextUrl.searchParams.get("mode") === "link" ? "link" : "login";
  const flow = newFlow(p.id, mode, req.nextUrl.searchParams.get("next") ?? "/home");
  const to = authorizeUrl(p, flow, redirectUri(origin, p.id));
  // 가짜 공급자는 이 앱 안에 있다. 개발 서버의 origin은 localhost라서 폰에서도 열리게 경로만 돌려준다
  const res = p.mock ? new NextResponse(null, { status: 307, headers: { Location: pathOf(to) } }) : NextResponse.redirect(to);
  res.cookies.set(OAUTH_COOKIE, encodeFlow(flow), {
    httpOnly: true,
    // 공급자에서 돌아오는 최상위 GET에는 lax 쿠키가 실린다
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: TEN_MINUTES,
  });
  return res;
}
