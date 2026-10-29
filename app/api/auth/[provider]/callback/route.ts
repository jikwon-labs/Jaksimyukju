import { NextResponse, type NextRequest } from "next/server";
import { findSocialUser, getSessionUser, linkSocial, signIn } from "@/lib/auth";
import { appOrigin, decodeFlow, isProviderId, OAUTH_COOKIE, redirectUri, sameState, type OAuthFlow } from "@/lib/domain/oauth";
import { fetchProfile, getProvider } from "@/lib/server/oauth";

/** 연결은 next 경로에 ?link=결과, 로그인 실패는 첫 화면에 ?login=사유를 붙여 돌려보낸다 */
function back(req: NextRequest, flow: OAuthFlow | null, result: string): NextResponse {
  const url =
    flow?.mode === "link"
      ? new URL(flow.next, req.url)
      : new URL(result === "ok" ? (flow?.next ?? "/home") : "/", req.url);
  if (flow?.mode === "link") url.searchParams.set("link", result);
  else if (result !== "ok") url.searchParams.set("login", result);
  const res = NextResponse.redirect(url);
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
  if (!flow || flow.provider !== p.id || !state || !sameState(flow.state, state)) return back(req, null, "failed");
  if (q.get("error")) return back(req, flow, "cancel");
  const code = q.get("code");
  if (!code) return back(req, flow, "failed");

  let profile;
  try {
    profile = await fetchProfile(p, code, flow, redirectUri(origin, p.id));
  } catch (e) {
    console.error("oauth callback failed", p.id, e instanceof Error ? e.message : e);
    return back(req, flow, "failed");
  }

  if (flow.mode === "link") {
    const me = await getSessionUser();
    if (!me) return back(req, null, "failed");
    return back(req, flow, await linkSocial(me.id, p.id, profile));
  }

  const user = await findSocialUser(p.id, profile.sub);
  if (!user) return back(req, flow, "none");
  await signIn(user);
  return back(req, flow, "ok");
}
