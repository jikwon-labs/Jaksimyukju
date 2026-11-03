import "server-only";
// 카카오·구글·Apple OAuth 공급자 설정과 코드 교환. 키가 없으면 개발 모드에서만 앱 안의 가짜 공급자(/api/dev/oauth)를 쓴다.
import { z } from "zod";
import { devToolsEnabled } from "@/lib/clock";
import {
  appleClientSecret,
  OAuthError,
  parseAppleIdToken,
  parseProfile,
  type OAuthFlow,
  type Provider,
  PROVIDER_IDS,
  type ProviderId,
  type SocialProfile,
} from "@/lib/domain/oauth";

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
  apple: {
    id: "apple",
    authorizeUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    // 사용자 정보 주소가 없다. 토큰 응답의 id_token에서 번호(sub)를 읽는다
    userinfoUrl: null,
    // 이름·이메일을 요청하면 Apple이 콜백을 다른 사이트 POST(form_post)로 보내서 lax state 쿠키가 실리지 않는다.
    // 계정을 가르는 데는 번호만 있으면 되므로 아무 범위도 요청하지 않고 GET(query)으로 받는다
    scope: null,
    // 추측: 웹 흐름의 PKCE 지원을 문서에서 확인하지 못해서 state와 서명한 client secret으로 막는다
    pkce: false,
  },
};

const ENV: Record<ProviderId, { id: string; secret: string }> = {
  kakao: { id: "KAKAO_CLIENT_ID", secret: "KAKAO_CLIENT_SECRET" },
  google: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
  // Apple은 비밀 값 대신 .p8 키로 client secret을 만든다(appleSecret)
  apple: { id: "APPLE_CLIENT_ID", secret: "" },
};

const nowSec = () => Math.floor(Date.now() / 1000);

/** Apple client secret. 키 세 가지(APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY) 중 하나라도 없으면 null */
function appleSecret(clientId: string): string | null {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  if (!teamId || !keyId || !privateKey) return null;
  try {
    return appleClientSecret({ teamId, keyId, clientId, privateKey }, nowSec());
  } catch (e) {
    // 키 모양이 틀리면 시작 화면까지 터지지 않게 비밀 없이 둔다. 토큰 교환에서 실패로 돌아온다
    console.error("apple client secret failed", e instanceof Error ? e.message : e);
    return null;
  }
}

/** 키가 갖춰졌는지. Apple은 client id에 더해 서명 키 세 가지가 다 있어야 한다 */
function configured(id: ProviderId): boolean {
  if (!process.env[ENV[id].id]) return false;
  return id !== "apple" || !!(process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
}

/** 쓸 수 있는 공급자. 키가 없고 운영 빌드면 null(버튼을 숨긴다) */
export function getProvider(id: ProviderId, origin: string): Provider | null {
  const clientId = process.env[ENV[id].id];
  // E2E는 J6_FORCE_MOCK=1로 키가 있어도 가짜 공급자를 쓴다(개발 모드일 때만)
  const forceMock = process.env.J6_FORCE_MOCK === "1" && devToolsEnabled();
  if (clientId && configured(id) && !forceMock) {
    const clientSecret = id === "apple" ? appleSecret(clientId) : process.env[ENV[id].secret] || null;
    return { ...REAL[id], mock: false, clientId, clientSecret };
  }
  if (!devToolsEnabled()) return null;
  const base = `${origin}/api/dev/oauth`;
  return {
    id,
    mock: true,
    authorizeUrl: `${base}/authorize?provider=${id}`,
    tokenUrl: `${base}/token`,
    // 가짜 공급자도 Apple은 실제처럼 id_token만 준다
    userinfoUrl: REAL[id].userinfoUrl === null ? null : `${base}/userinfo?provider=${id}`,
    clientId: `dev-${id}`,
    clientSecret: null,
    scope: REAL[id].scope,
    pkce: true,
  };
}

/** 버튼을 보여 줄 공급자: 키가 있거나 개발 모드(가짜 공급자) */
export function availableProviders(): ProviderId[] {
  return PROVIDER_IDS.filter((id) => configured(id) || devToolsEnabled());
}

const Token = z.object({ access_token: z.string().min(1), id_token: z.string().optional() });

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

  if (p.userinfoUrl === null) {
    const profile = token.data.id_token ? parseAppleIdToken(token.data.id_token, p.clientId, nowSec()) : null;
    if (!profile) throw new OAuthError("id_token shape");
    return profile;
  }

  const infoRes = await fetch(p.userinfoUrl, {
    headers: { Authorization: `Bearer ${token.data.access_token}` },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!infoRes.ok) throw new OAuthError(`userinfo ${infoRes.status}`);
  const profile = parseProfile(p.id, await infoRes.json());
  if (!profile) throw new OAuthError("userinfo shape");
  return profile;
}
