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
