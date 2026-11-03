// 웹과 앱 껍데기 사이의 소셜 로그인 약속. 앱 쪽은 mobile/bridge.ts, 흐름 설명은 lib/domain/app-auth.ts
// 1) 웹 -> 앱: { type: AUTH_OPEN, provider, mode, next, path } . path는 Safari 로그인 창으로 열 시작 경로
// 2) 앱 -> 웹: window에 AUTH_RESULT_EVENT(CustomEvent). detail은
//    { kind: "code", code }                      Safari 로그인 창이 돌려준 1회용 코드
//    { kind: "kakao", accessToken, mode, next }  카카오 SDK(카카오톡 앱)가 준 토큰
import { nativeBridge } from "./external";
import type { ProviderId } from "./domain/oauth-copy";

export const AUTH_OPEN = "auth-open";
/** 앱의 URL 스킴(mobile/app.json의 scheme)으로 돌아오는 로그인 콜백 */
export const APP_AUTH_REDIRECT = "jaksim6://auth";
export const AUTH_RESULT_EVENT = "j6-auth-result";

export type AuthResult =
  | { kind: "code"; code: string }
  | { kind: "kakao"; accessToken: string; mode: "login" | "link"; next: string };

/** 버튼 주소(/api/auth/<공급자>/start?mode=..&next=..)에서 mode와 next를 읽는다 */
export function parseStartHref(href: string): { mode: "login" | "link"; next: string } {
  const u = new URL(href, "http://app.invalid");
  return {
    mode: u.searchParams.get("mode") === "link" ? "link" : "login",
    next: u.searchParams.get("next") ?? "/home",
  };
}

export function parseAuthResult(v: unknown): AuthResult | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  if (r.kind === "code" && typeof r.code === "string" && r.code)
    return { kind: "code", code: r.code };
  if (
    r.kind === "kakao" &&
    typeof r.accessToken === "string" &&
    r.accessToken &&
    (r.mode === "login" || r.mode === "link") &&
    typeof r.next === "string"
  ) {
    return { kind: "kakao", accessToken: r.accessToken, mode: r.mode, next: r.next };
  }
  return null;
}

/**
 * 앱 껍데기 안이면 로그인을 앱에 맡기고 true(링크 이동을 막는다). 웹이면 false(평소처럼 주소로 간다).
 * 먼저 서버에서 이 웹뷰의 묶음 쿠키와 시작 경로를 받는다
 */
export function startAppAuth(provider: ProviderId, href: string, win: Window = window): boolean {
  const bridge = nativeBridge(win);
  if (!bridge) return false;
  const { mode, next } = parseStartHref(href);
  void (async () => {
    try {
      const res = await fetch("/api/auth/app/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, mode, next }),
      });
      if (!res.ok) throw new Error(`start ${res.status}`);
      const { path } = (await res.json()) as { path: string };
      bridge.postMessage(JSON.stringify({ type: AUTH_OPEN, provider, mode, next, path }));
    } catch {
      win.location.assign(
        mode === "link" ? `${next}${next.includes("?") ? "&" : "?"}link=failed` : "/?login=failed",
      );
    }
  })();
  return true;
}

/** 앱이 넘겨준 결과를 서버에 보내 이 웹뷰에서 로그인·연결을 마치고, 서버가 준 경로로 간다 */
export async function finishAppAuth(r: AuthResult, win: Window = window): Promise<void> {
  const url = r.kind === "code" ? "/api/auth/app/finish" : "/api/auth/app/kakao";
  const body =
    r.kind === "code"
      ? { code: r.code }
      : { accessToken: r.accessToken, mode: r.mode, next: r.next };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { to?: string };
    if (typeof data.to === "string" && data.to.startsWith("/") && !data.to.startsWith("//")) {
      win.location.assign(data.to);
      return;
    }
  } catch {
    // 아래에서 실패로 돌려보낸다
  }
  win.location.assign("/?login=failed");
}
