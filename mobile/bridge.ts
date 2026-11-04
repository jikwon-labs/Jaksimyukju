// 웹과 앱 껍데기 사이의 약속. 웹 쪽은 lib/external.ts
import { parseWidgetSummary, widgetLinkPath, type WidgetSummary } from "./widget-data";

export const OPEN_EXTERNAL = "open-external";

/** 띄울 웹 주소. iOS 시뮬레이터는 맥의 localhost를 그대로 쓴다. 기기나 안드로이드 에뮬레이터는 EXPO_PUBLIC_WEB_URL로 바꾼다 */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3100";

/** 웹이 보낸 메시지가 "인앱 브라우저로 열기"면 그 https 주소, 아니면 null */
export function externalUrl(data: string): string | null {
  try {
    const m: unknown = JSON.parse(data);
    if (typeof m !== "object" || m === null) return null;
    const { type, url } = m as { type?: unknown; url?: unknown };
    return type === OPEN_EXTERNAL && typeof url === "string" && /^https:\/\//.test(url) ? url : null;
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

/**
 * 웹뷰 안에서 그대로 여는 바깥 주소. 로그인 화면은 인앱 브라우저로 넘기면 쿠키가 웹뷰와 달라
 * 돌아왔을 때 state 쿠키도 세션도 없다. Apple 로그인 웹 화면은 웹뷰 안에서 열리므로 여기 둔다
 */
const IN_WEBVIEW_HOSTS = ["appleid.apple.com"];

export function staysInWebView(url: string, webUrl: string = WEB_URL): boolean {
  if (url.startsWith(webUrl) || url.startsWith("about:")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && IN_WEBVIEW_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

// 홈 화면 위젯 약속. 웹 쪽은 lib/widget-bridge.ts, 요약 모양은 widget-data.ts
export const WIDGET_UPDATE = "widget-update";
export const WIDGET_REFRESH_EVENT = "j6-widget-refresh";

/** 웹이 보낸 메시지가 "위젯 갱신"이면 { summary }(null이면 위젯을 비운다), 아니거나 모양이 틀리면 null */
export function widgetUpdate(data: string): { summary: WidgetSummary | null } | null {
  try {
    const m: unknown = JSON.parse(data);
    if (typeof m !== "object" || m === null) return null;
    const { type, summary } = m as { type?: unknown; summary?: unknown };
    if (type !== WIDGET_UPDATE) return null;
    if (summary === null) return { summary: null };
    const parsed = parseWidgetSummary(summary);
    return parsed ? { summary: parsed } : null;
  } catch {
    return null;
  }
}

/** 앱이 다시 앞으로 왔을 때 웹에 위젯 요약을 다시 보내 달라고 하는 스크립트 */
export function widgetRefreshScript(): string {
  return `window.dispatchEvent(new Event(${JSON.stringify(WIDGET_REFRESH_EVENT)}));true;`;
}

/** 위젯이 연 주소(jaksim6://open?to=/home)를 웹뷰가 열 주소로. 위젯 주소가 아니면 null */
export function widgetOpenUrl(url: string, base: string = WEB_URL): string | null {
  const path = widgetLinkPath(url);
  return path ? base.replace(/\/$/, "") + path : null;
}
