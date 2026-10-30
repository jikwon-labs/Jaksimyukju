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
