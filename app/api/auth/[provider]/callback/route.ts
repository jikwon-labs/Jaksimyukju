import { NextResponse, type NextRequest } from "next/server";
import { appRedirect } from "@/lib/domain/app-auth";
import {
  appOrigin,
  callbackPath,
  decodeFlow,
  isProviderId,
  OAUTH_COOKIE,
  redirectUri,
  sameState,
  type OAuthFlow,
  type SocialProfile,
} from "@/lib/domain/oauth";
import { createHandoff } from "@/lib/server/handoff";
import { fetchProfile, getProvider } from "@/lib/server/oauth";
import { finishSocial } from "@/lib/server/social-login";

function clearFlow(res: NextResponse): NextResponse {
  res.cookies.set(OAUTH_COOKIE, "", { path: "/api/auth", maxAge: 0 });
  return res;
}

/** 연결은 next 경로에 ?link=결과, 로그인 실패는 첫 화면에 ?login=사유를 붙여 돌려보낸다 */
function back(flow: OAuthFlow | null, result: string): NextResponse {
  // 개발 서버의 req.url은 localhost로 잡혀서, 폰에서 맥 IP로 열면 열 수 없는 주소로 간다. 경로만 돌려준다
  return clearFlow(
    new NextResponse(null, { status: 307, headers: { Location: callbackPath(flow, result) } }),
  );
}

/**
 * 앱 껍데기의 Safari 로그인 창에서 온 콜백. 이 창의 쿠키는 웹뷰와 달라 여기서는 로그인·연결하지 않고,
 * 결과를 1회용 코드로 남겨 jaksim6://auth 로 돌려보낸다. 웹뷰가 그 코드로 마무리한다(/api/auth/app/finish)
 */
async function backToApp(
  flow: OAuthFlow & { bind: string },
  result: string,
  profile: SocialProfile | null,
): Promise<NextResponse> {
  const code = await createHandoff(flow, result, profile);
  return clearFlow(
    new NextResponse(null, { status: 307, headers: { Location: appRedirect(code) } }),
  );
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
  if (!flow || flow.provider !== p.id || !state || !sameState(flow.state, state))
    return back(null, "failed");
  const app = flow.bind ? { ...flow, bind: flow.bind } : null;
  if (q.get("error")) return app ? backToApp(app, "cancel", null) : back(flow, "cancel");
  const code = q.get("code");
  if (!code) return app ? backToApp(app, "failed", null) : back(flow, "failed");

  let profile;
  try {
    profile = await fetchProfile(p, code, flow, redirectUri(origin, p.id));
  } catch (e) {
    console.error("oauth callback failed", p.id, e instanceof Error ? e.message : e);
    return app ? backToApp(app, "failed", null) : back(flow, "failed");
  }

  if (app) return backToApp(app, "ok", profile);
  const result = await finishSocial(p.id, profile, flow.mode);
  // 연결하려는데 세션이 없으면 처음 화면으로(예전 동작과 같다)
  return back(flow.mode === "link" && result === "failed" ? null : flow, result);
}
