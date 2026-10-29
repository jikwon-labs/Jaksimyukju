import "server-only";
// 카카오·구글 OAuth 공급자 설정과 코드 교환. 키가 없으면 개발 모드에서만 앱 안의 가짜 공급자(/api/dev/oauth)를 쓴다.
import { z } from "zod";
import { devToolsEnabled } from "@/lib/clock";
import { OAuthError, parseProfile, type OAuthFlow, type Provider, PROVIDER_IDS, type ProviderId, type SocialProfile } from "@/lib/domain/oauth";

const REAL: Record<ProviderId, Omit<Provider, "clientId" | "clientSecret" | "mock">> = {
  kakao: {
    id: "kakao",
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    userinfoUrl: "https://kapi.kakao.com/v2/user/me",
    // 동의 항목은 카카오 콘솔에서 정한다. 이메일은 비즈 앱에서만 받을 수 있어서 따로 요청하지 않는다
    scope: null,
    // 추측: 카카오도 PKCE를 받는다는 문서를 확인하지 못해서 state와 client secret으로만 막는다
    pkce: false,
  },
  google: {
    id: "google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userinfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    pkce: true,
  },
};

const ENV: Record<ProviderId, { id: string; secret: string }> = {
  kakao: { id: "KAKAO_CLIENT_ID", secret: "KAKAO_CLIENT_SECRET" },
  google: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
};

/** 쓸 수 있는 공급자. 키가 없고 운영 빌드면 null(버튼을 숨긴다) */
export function getProvider(id: ProviderId, origin: string): Provider | null {
  const clientId = process.env[ENV[id].id];
  if (clientId) {
    return { ...REAL[id], mock: false, clientId, clientSecret: process.env[ENV[id].secret] || null };
  }
  if (!devToolsEnabled()) return null;
  const base = `${origin}/api/dev/oauth`;
  return {
    id,
    mock: true,
    authorizeUrl: `${base}/authorize?provider=${id}`,
    tokenUrl: `${base}/token`,
    userinfoUrl: `${base}/userinfo?provider=${id}`,
    clientId: `dev-${id}`,
    clientSecret: null,
    scope: REAL[id].scope,
    pkce: true,
  };
}

/** 버튼을 보여 줄 공급자: 키가 있거나 개발 모드(가짜 공급자) */
export function availableProviders(): ProviderId[] {
  return PROVIDER_IDS.filter((id) => !!process.env[ENV[id].id] || devToolsEnabled());
}

const Token = z.object({ access_token: z.string().min(1) });

const TIMEOUT = 8000;

export async function fetchProfile(p: Provider, code: string, flow: OAuthFlow, redirect: string): Promise<SocialProfile> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
    client_id: p.clientId,
  });
  if (p.clientSecret) body.set("client_secret", p.clientSecret);
  if (p.pkce) body.set("code_verifier", flow.verifier);

  const tokenRes = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!tokenRes.ok) throw new OAuthError(`token ${tokenRes.status}`);
  const token = Token.safeParse(await tokenRes.json());
  if (!token.success) throw new OAuthError("token shape");

  const infoRes = await fetch(p.userinfoUrl, {
    headers: { Authorization: `Bearer ${token.data.access_token}` },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!infoRes.ok) throw new OAuthError(`userinfo ${infoRes.status}`);
  const profile = parseProfile(p.id, await infoRes.json());
  if (!profile) throw new OAuthError("userinfo shape");
  return profile;
}
