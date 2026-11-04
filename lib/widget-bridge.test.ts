import { describe, expect, it } from "vitest";
import {
  WIDGET_REFRESH_EVENT as APP_REFRESH,
  WIDGET_UPDATE as APP_UPDATE,
  widgetUpdate,
} from "../mobile/bridge";
import { emptyWidgetSummary } from "./domain/widget";
import {
  sendWidgetSummary,
  syncWidget,
  WIDGET_API,
  WIDGET_REFRESH_EVENT,
  WIDGET_UPDATE,
} from "./widget-bridge";

function app() {
  const sent: string[] = [];
  return { sent, win: { ReactNativeWebView: { postMessage: (m: string) => sent.push(m) } } };
}

const summary = emptyWidgetSummary("2026-11-04", "온");

describe("위젯 약속", () => {
  it("앱 껍데기와 같은 이름을 쓴다", () => {
    expect(WIDGET_UPDATE).toBe(APP_UPDATE);
    expect(WIDGET_REFRESH_EVENT).toBe(APP_REFRESH);
  });
  it("앱 안이면 요약을 보내고, 앱은 그 메시지를 읽는다", () => {
    const { sent, win } = app();
    expect(sendWidgetSummary(summary, win)).toBe(true);
    expect(widgetUpdate(sent[0])).toEqual({ summary });
    expect(sendWidgetSummary(null, win)).toBe(true);
    expect(widgetUpdate(sent[1])).toEqual({ summary: null });
  });
  it("웹이면 아무것도 보내지 않는다", () => {
    expect(sendWidgetSummary(summary, {})).toBe(false);
  });
});

describe("syncWidget", () => {
  const ok =
    (body: unknown, status = 200) =>
    async () => ({ ok: status < 300, status, json: async () => body });

  it("요약을 받아 껍데기에 넘긴다", async () => {
    const { sent, win } = app();
    const urls: string[] = [];
    const fetcher = async (url: string) => {
      urls.push(url);
      return ok(summary)();
    };
    expect(await syncWidget(win, fetcher)).toBe(true);
    expect(urls).toEqual([WIDGET_API]);
    expect(JSON.parse(sent[0])).toEqual({ type: WIDGET_UPDATE, summary });
  });
  it("로그인이 풀렸으면 위젯을 비우라고 보낸다", async () => {
    const { sent, win } = app();
    expect(await syncWidget(win, ok({ error: "auth" }, 401))).toBe(true);
    expect(JSON.parse(sent[0])).toEqual({ type: WIDGET_UPDATE, summary: null });
  });
  it("서버 오류나 연결 끊김이면 마지막 위젯을 그대로 둔다", async () => {
    const { sent, win } = app();
    expect(await syncWidget(win, ok({}, 500))).toBe(false);
    expect(
      await syncWidget(win, async () => {
        throw new Error("offline");
      }),
    ).toBe(false);
    expect(sent).toEqual([]);
  });
  it("웹에서는 요청하지 않는다", async () => {
    let called = false;
    expect(
      await syncWidget({}, async () => {
        called = true;
        return ok(summary)();
      }),
    ).toBe(false);
    expect(called).toBe(false);
  });
});
