// 앱 껍데기의 소셜 로그인 약속(순수 함수). 앱 쪽은 mobile/bridge.ts
// 웹뷰 안에서는 공급자 로그인 화면을 열지 않는다: 구글은 웹뷰 로그인을 막고, 인앱 브라우저는 쿠키가 웹뷰와 달라 돌아올 수 없다.
// - 카카오: 앱이 카카오 SDK로 카카오톡 앱을 열어 액세스 토큰을 받고, 웹뷰가 그 토큰을 서버(/api/auth/app/kakao)에 넘긴다
// - Apple·구글(그리고 SDK를 못 쓰는 카카오): 앱이 Safari 로그인 창(ASWebAuthenticationSession)을 열고,
//   콜백은 jaksim6://auth?code=1회용코드 로 돌아온다. 웹뷰가 그 코드를 서버(/api/auth/app/finish)에 넘겨 세션 쿠키를 받는다
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { APP_AUTH_REDIRECT } from "../app-auth-bridge";

export { APP_AUTH_REDIRECT };

/** 로그인을 시작한 웹뷰를 묶는 쿠키. 1회용 코드는 이 쿠키를 가진 웹뷰에서만 쓸 수 있다 */
export const APP_BIND_COOKIE = "j6_app_bind";

/** 1회용 코드가 살아 있는 시간 */
export const HANDOFF_TTL_MS = 3 * 60 * 1000;

export function newSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(v: string): string {
  return createHash("sha256").update(v).digest("base64url");
}

/** sha256(secret)이 hash와 같은지(시간 차 공격을 막는 비교) */
export function matchesHash(secret: string, hash: string): boolean {
  const a = Buffer.from(sha256(secret));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** sha256 base64url 모양(43자)인지. 시작 주소의 bind 값을 거를 때 쓴다 */
export function isHash(v: string | null | undefined): v is string {
  return !!v && /^[A-Za-z0-9_-]{43}$/.test(v);
}

export function appRedirect(code: string): string {
  return `${APP_AUTH_REDIRECT}?code=${encodeURIComponent(code)}`;
}

/**
 * POST를 같은 사이트의 화면에서 보냈는지. 다른 사이트가 사용자 몰래 로그인·연결을 시키지 못하게 한다.
 * Origin의 호스트가 요청 Host와 같아야 한다(개발 서버를 맥 IP로 열어도 둘은 같다)
 */
export function sameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
