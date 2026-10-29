// 소셜 로그인(OAuth 2.0 authorization code)의 순수 함수: state 쿠키, PKCE, 공급자 응답 해석
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const PROVIDER_IDS = ["kakao", "google"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
export type OAuthMode = "login" | "link";

export const PROVIDER_LABEL: Record<ProviderId, string> = { kakao: "카카오", google: "구글" };

export interface SocialProfile {
  sub: string;
  email: string | null;
  name: string | null;
}

export interface Provider {
  id: ProviderId;
  mock: boolean;
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  clientId: string;
  clientSecret: string | null;
  scope: string | null;
  pkce: boolean;
}

export function isProviderId(v: string): v is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(v);
}

/** 콜백 주소의 앞부분. 공급자 콘솔에 등록한 주소와 같아야 해서 APP_URL을 먼저 본다 */
export function appOrigin(requestOrigin: string): string {
  return (process.env.APP_URL ?? requestOrigin).replace(/\/$/, "");
}

export function redirectUri(origin: string, id: ProviderId): string {
  return `${origin}/api/auth/${id}/callback`;
}

// ---- state 쿠키 ----

export const OAUTH_COOKIE = "j6_oauth";

const Flow = z.object({
  state: z.string().min(16),
  verifier: z.string().min(43),
  provider: z.enum(PROVIDER_IDS),
  mode: z.enum(["login", "link"]),
  next: z.string(),
});
export type OAuthFlow = z.infer<typeof Flow>;

export function newFlow(provider: ProviderId, mode: OAuthMode, next: string): OAuthFlow {
  return {
    state: randomBytes(24).toString("base64url"),
    verifier: randomBytes(48).toString("base64url"),
    provider,
    mode,
    next: safeNext(next, "/home"),
  };
}

export function encodeFlow(f: OAuthFlow): string {
  return Buffer.from(JSON.stringify(f)).toString("base64url");
}

export function decodeFlow(v: string | undefined): OAuthFlow | null {
  if (!v) return null;
  try {
    const r = Flow.safeParse(JSON.parse(Buffer.from(v, "base64url").toString("utf8")));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function sameState(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** 앱 안 경로만 허용한다(다른 사이트로 보내는 열린 리다이렉트 막기) */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function challengeOf(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function authorizeUrl(p: Provider, flow: OAuthFlow, redirect: string): string {
  const u = new URL(p.authorizeUrl);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", p.clientId);
  u.searchParams.set("redirect_uri", redirect);
  u.searchParams.set("state", flow.state);
  if (p.scope) u.searchParams.set("scope", p.scope);
  if (p.pkce) {
    u.searchParams.set("code_challenge", challengeOf(flow.verifier));
    u.searchParams.set("code_challenge_method", "S256");
  }
  return u.toString();
}

// ---- 코드 교환과 사용자 정보 ----

export class OAuthError extends Error {}

const GoogleUser = z.object({
  sub: z.string().min(1),
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
});

const KakaoUser = z.object({
  id: z.union([z.number(), z.string()]),
  kakao_account: z
    .object({
      email: z.string().optional(),
      is_email_verified: z.boolean().optional(),
      profile: z.object({ nickname: z.string().optional() }).optional(),
    })
    .optional(),
});

/** 공급자 응답을 앱의 모양으로 바꾼다. 확인되지 않은 이메일은 버린다 */
export function parseProfile(id: ProviderId, raw: unknown): SocialProfile | null {
  if (id === "google") {
    const r = GoogleUser.safeParse(raw);
    if (!r.success) return null;
    return {
      sub: r.data.sub,
      email: r.data.email && r.data.email_verified !== false ? r.data.email : null,
      name: r.data.name ?? null,
    };
  }
  const r = KakaoUser.safeParse(raw);
  if (!r.success) return null;
  const acc = r.data.kakao_account;
  return {
    sub: String(r.data.id),
    email: acc?.email && acc.is_email_verified !== false ? acc.email : null,
    name: acc?.profile?.nickname ?? null,
  };
}


/** 내 정보의 계정 줄: "카카오 · me@example.com", 연결 전이면 "게스트" */
export function accountLabel(accounts: { provider: string }[], email: string | null): string {
  const names = accounts.map((a) => (isProviderId(a.provider) ? PROVIDER_LABEL[a.provider] : null)).filter(Boolean);
  if (names.length === 0) return "게스트";
  return email ? `${names.join("·")} · ${email}` : `${names.join("·")} 연결됨`;
}
