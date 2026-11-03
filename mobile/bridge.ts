// 웹과 앱 껍데기 사이의 약속. 웹 쪽은 lib/external.ts
export const OPEN_EXTERNAL = "open-external";

/** 띄울 웹 주소. iOS 시뮬레이터는 맥의 localhost를 그대로 쓴다. 기기나 안드로이드 에뮬레이터는 EXPO_PUBLIC_WEB_URL로 바꾼다 */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3100";

/** 웹이 보낸 메시지가 "인앱 브라우저로 열기"면 그 https 주소, 아니면 null */
export function externalUrl(data: string): string | null {
  try {
    const m: unknown = JSON.parse(data);
    if (typeof m !== "object" || m === null) return null;
    const { type, url } = m as { type?: unknown; url?: unknown };
    return type === OPEN_EXTERNAL && typeof url === "string" && /^https:\/\//.test(url)
      ? url
      : null;
  } catch {
    return null;
  }
}

// 푸시 토큰 약속. 웹 쪽은 lib/push-bridge.ts
export const PUSH_REGISTER = "push-register";
export const PUSH_TOKEN_EVENT = "j6-push-token";

/** 웹이 보낸 메시지가 "푸시 토큰 달라"면 { ask }, 아니면 null */
export function pushRequest(data: string): { ask: boolean } | null {
  try {
    const m: unknown = JSON.parse(data);
    if (typeof m !== "object" || m === null) return null;
    const { type, ask } = m as { type?: unknown; ask?: unknown };
    return type === PUSH_REGISTER ? { ask: ask === true } : null;
  } catch {
    return null;
  }
}

/** 웹뷰에 토큰을 넘기는 스크립트. 토큰은 JSON으로 감싸 따옴표가 섞여도 코드가 되지 않게 한다 */
export function pushTokenScript(token: string): string {
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(PUSH_TOKEN_EVENT)}, { detail: ${JSON.stringify(token)} }));true;`;
}

/** 알림을 눌렀을 때 웹뷰가 열 주소. 서버가 실은 data.href가 앱 안 경로(/로 시작, //는 아님)일 때만 */
export function notificationUrl(data: unknown, base: string = WEB_URL): string | null {
  const href = (data as { href?: unknown } | null | undefined)?.href;
  if (typeof href !== "string" || !/^\/(?![/\\])/.test(href)) return null;
  return base.replace(/\/$/, "") + href;
}
/** 서버가 보내는 channelId와 같아야 한다(lib/domain/push.ts의 PUSH_CHANNEL) */
export const PUSH_CHANNEL = "default";

/** 웹뷰 안에서 그대로 여는 주소: 앱 주소와 빈 화면만. 로그인 화면은 웹뷰에서 열지 않는다(아래 로그인 약속) */
export function staysInWebView(url: string, webUrl: string = WEB_URL): boolean {
  return url.startsWith(webUrl) || url.startsWith("about:");
}

// 소셜 로그인 약속. 웹 쪽은 lib/app-auth-bridge.ts, 서버 흐름은 lib/domain/app-auth.ts
// 웹뷰 안 로그인은 구글이 막고, 인앱 브라우저는 쿠키가 웹뷰와 달라 돌아올 수 없어서 앱이 맡는다.
// 카카오는 카카오 SDK(카카오톡 앱), Apple·구글은 Safari 로그인 창(ASWebAuthenticationSession)으로 연다.
export const AUTH_OPEN = "auth-open";
export const AUTH_RESULT_EVENT = "j6-auth-result";
/** app.json의 scheme과 lib/domain/app-auth.ts의 APP_AUTH_REDIRECT와 같아야 한다 */
export const APP_AUTH_REDIRECT = "jaksim6://auth";

export type AuthProvider = "kakao" | "google" | "apple";
export interface AuthOpen {
  provider: AuthProvider;
  mode: "login" | "link";
  next: string;
  /** Safari 로그인 창으로 열 시작 경로(/api/auth/...). 앱 주소 밖으로는 열지 않는다 */
  path: string;
}

/** 웹이 보낸 메시지가 "로그인 열어 줘"면 그 내용, 아니면 null */
export function authOpenRequest(data: string): AuthOpen | null {
  try {
    const m: unknown = JSON.parse(data);
    if (typeof m !== "object" || m === null) return null;
    const { type, provider, mode, next, path } = m as Record<string, unknown>;
    if (type !== AUTH_OPEN) return null;
    if (provider !== "kakao" && provider !== "google" && provider !== "apple") return null;
    if (mode !== "login" && mode !== "link") return null;
    if (typeof next !== "string" || typeof path !== "string" || !path.startsWith("/api/auth/"))
      return null;
    return { provider, mode, next, path };
  } catch {
    return null;
  }
}

/** Safari 로그인 창이 돌려준 jaksim6://auth?code=... 에서 1회용 코드. 다른 주소면 null */
export function authCode(url: string): string | null {
  // URL 처리기에 따라 jaksim6://auth/?code= 처럼 빗금이 붙어 오기도 한다
  const prefix = [`${APP_AUTH_REDIRECT}?`, `${APP_AUTH_REDIRECT}/?`].find((p) => url.startsWith(p));
  if (!prefix) return null;
  return new URLSearchParams(url.slice(prefix.length)).get("code") || null;
}

/** 웹뷰에 로그인 결과를 넘기는 스크립트. 값은 JSON으로 감싸 코드가 되지 않게 한다 */
export function authResultScript(
  detail:
    | { kind: "code"; code: string }
    | { kind: "kakao"; accessToken: string; mode: string; next: string },
): string {
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(AUTH_RESULT_EVENT)}, { detail: ${JSON.stringify(detail)} }));true;`;
}

/** 카카오 SDK 오류가 사용자가 직접 취소한 것인지(그러면 Safari로 다시 열지 않는다) */
export function isKakaoCancel(e: unknown): boolean {
  const text =
    e instanceof Error ? `${e.message} ${(e as { code?: unknown }).code ?? ""}` : String(e);
  return /cancel/i.test(text);
}
