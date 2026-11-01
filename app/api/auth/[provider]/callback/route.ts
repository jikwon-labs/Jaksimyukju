import { NextResponse, type NextRequest } from "next/server";
import { findSocialUser, getSessionUser, linkSocial, signIn } from "@/lib/auth";
import { appOrigin, callbackPath, decodeFlow, isProviderId, OAUTH_COOKIE, redirectUri, sameState, type OAuthFlow } from "@/lib/domain/oauth";
import { fetchProfile, getProvider } from "@/lib/server/oauth";

/** 연결은 next 경로에 ?link=결과, 로그인 실패는 첫 화면에 ?login=사유를 붙여 돌려보낸다 */
function back(flow: OAuthFlow | null, result: string): NextResponse {
  // 개발 서버의 req.url은 localhost로 잡혀서, 폰에서 맥 IP로 열면 열 수 없는 주소로 간다. 경로만 돌려준다
  const res = new NextResponse(null, { status: 307, headers: { Location: callbackPath(flow, result) } });
  res.cookies.set(OAUTH_COOKIE, "", { path: "/api/auth", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const q = req.nextUrl.searchParams;
  const flow = decodeFlow(req.cookies.get(OAUTH_COOKIE)?.value);
  const origin = appOrigin(req.nextUrl.origin);
  const p = isProviderId(provider) ? getProvider(provider, origin) : null;
  if (!p) return new NextResponse("not found", { status: 404 });
  // 쿠키가 없거나, 다른 공급자로 시작했거나, state가 다르면 위조로 본다
  const state = q.get("state");
  if (!flow || flow.provider !== p.id || !state || !sameState(flow.state, state)) return back(null, "failed");
  if (q.get("error")) return back(flow, "cancel");
  const code = q.get("code");
  if (!code) return back(flow, "failed");

  let profile;
  try {
    profile = await fetchProfile(p, code, flow, redirectUri(origin, p.id));
  } catch (e) {
    console.error("oauth callback failed", p.id, e instanceof Error ? e.message : e);
    return back(flow, "failed");
  }

  if (flow.mode === "link") {
    const me = await getSessionUser();
    if (!me) return back(null, "failed");
    return back(flow, await linkSocial(me.id, p.id, profile));
  }

  const user = await findSocialUser(p.id, profile.sub);
  if (!user) return back(flow, "none");
  await signIn(user);
  return back(flow, "ok");
}
