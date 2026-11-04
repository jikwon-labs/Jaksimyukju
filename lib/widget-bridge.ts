// 웹과 앱 껍데기 사이의 홈 화면 위젯 약속. 앱 쪽은 mobile/bridge.ts
// 1) 웹 -> 앱: { type: WIDGET_UPDATE, summary } . summary는 /api/widget 응답, 로그아웃 상태면 null(위젯을 비운다)
// 2) 앱 -> 웹: 앱이 다시 앞으로 오면 window에 WIDGET_REFRESH_EVENT를 쏜다. 웹은 요약을 다시 받아 보낸다
import type { WidgetSummary } from "./domain/widget";
import { nativeBridge } from "./external";

export const WIDGET_UPDATE = "widget-update";
export const WIDGET_REFRESH_EVENT = "j6-widget-refresh";
export const WIDGET_API = "/api/widget";

/** 앱 안이면 위젯 요약을 껍데기에 보내고 true, 웹이면 false */
export function sendWidgetSummary(summary: WidgetSummary | null, win: object = window): boolean {
  const bridge = nativeBridge(win);
  if (!bridge) return false;
  bridge.postMessage(JSON.stringify({ type: WIDGET_UPDATE, summary }));
  return true;
}

type Fetcher = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json">>;

/**
 * 앱 안에서만: 요약을 받아 껍데기에 넘긴다. 로그인이 풀렸으면(401) 위젯을 비우라고 보낸다.
 * 연결이 끊기거나 서버 오류면 아무것도 보내지 않는다(위젯은 마지막 요약을 그대로 둔다)
 */
export async function syncWidget(win: object = window, fetcher: Fetcher = fetch): Promise<boolean> {
  if (!nativeBridge(win)) return false;
  try {
    const res = await fetcher(WIDGET_API, { cache: "no-store", credentials: "same-origin" });
    if (res.status === 401) return sendWidgetSummary(null, win);
    if (!res.ok) return false;
    return sendWidgetSummary((await res.json()) as WidgetSummary, win);
  } catch {
    return false;
  }
}
