// 루트의 vitest가 돌린다. 웹(lib/external.ts)과 앱 껍데기가 같은 메시지 약속을 쓰는지 본다
import { describe, expect, it } from "vitest";
import { OPEN_EXTERNAL as WEB_SIDE } from "../lib/external";
import { dayKeyAt } from "../lib/domain/dates";
import {
  APP_AUTH_REDIRECT as WEB_APP_AUTH_REDIRECT,
  AUTH_OPEN as WEB_AUTH_OPEN,
  AUTH_RESULT_EVENT as WEB_AUTH_RESULT_EVENT,
} from "../lib/app-auth-bridge";
import { PUSH_CHANNEL as WEB_PUSH_CHANNEL } from "../lib/domain/push";
import {
  PUSH_REGISTER as WEB_PUSH_REGISTER,
  PUSH_TOKEN_EVENT as WEB_PUSH_TOKEN_EVENT,
  requestPushToken,
} from "../lib/push-bridge";
import {
  APP_AUTH_REDIRECT,
  AUTH_OPEN,
  AUTH_RESULT_EVENT,
  authCode,
  authOpenRequest,
  authResultScript,
  externalUrl,
  isKakaoCancel,
  notificationUrl,
  OPEN_EXTERNAL,
  PUSH_CHANNEL,
  PUSH_REGISTER,
  PUSH_TOKEN_EVENT,
  pushRequest,
  pushTokenScript,
  staysInWebView,
  WIDGET_REFRESH_EVENT,
  WIDGET_UPDATE,
  widgetOpenUrl,
  widgetRefreshScript,
  widgetUpdate,
} from "./bridge";
import { cellStyle, isStale, widgetDayKey, widgetLink, widgetLinkPath, withAlpha } from "./widget-data";

describe("externalUrl", () => {
  it("웹과 같은 메시지 이름을 쓴다", () => {
    expect(OPEN_EXTERNAL).toBe(WEB_SIDE);
  });
  it("인앱 브라우저로 열 https 주소만 꺼낸다", () => {
    expect(
      externalUrl(JSON.stringify({ type: OPEN_EXTERNAL, url: "https://ko.wikipedia.org/wiki/x" })),
    ).toBe("https://ko.wikipedia.org/wiki/x");
    expect(
      externalUrl(JSON.stringify({ type: OPEN_EXTERNAL, url: "javascript:alert(1)" })),
    ).toBeNull();
    expect(externalUrl(JSON.stringify({ type: "other", url: "https://a.test" }))).toBeNull();
    expect(externalUrl("not json")).toBeNull();
    expect(externalUrl("null")).toBeNull();
  });
});

describe("푸시 토큰 약속", () => {
  it("웹과 같은 이름을 쓴다", () => {
    expect(PUSH_REGISTER).toBe(WEB_PUSH_REGISTER);
    expect(PUSH_TOKEN_EVENT).toBe(WEB_PUSH_TOKEN_EVENT);
    expect(PUSH_CHANNEL).toBe(WEB_PUSH_CHANNEL);
  });
  it("웹이 보낸 토큰 요청만 꺼낸다", () => {
    const sent: string[] = [];
    requestPushToken(true, { ReactNativeWebView: { postMessage: (m: string) => sent.push(m) } });
    expect(pushRequest(sent[0])).toEqual({ ask: true });
    expect(pushRequest(JSON.stringify({ type: PUSH_REGISTER }))).toEqual({ ask: false });
    expect(pushRequest(JSON.stringify({ type: OPEN_EXTERNAL, url: "https://a.test" }))).toBeNull();
    expect(pushRequest("nope")).toBeNull();
  });
  it("토큰 스크립트는 웹의 이벤트로 토큰을 그대로 넘긴다", () => {
    let got: unknown;
    const win = { dispatchEvent: (e: CustomEvent) => (got = { type: e.type, detail: e.detail }) };
    new Function("window", pushTokenScript('ExpoPushToken["x"]'))(win);
    expect(got).toEqual({ type: WEB_PUSH_TOKEN_EVENT, detail: 'ExpoPushToken["x"]' });
  });
});

describe("notificationUrl", () => {
  it("앱 안 경로만 웹 주소에 붙인다", () => {
    expect(notificationUrl({ href: "/home" }, "https://j6.test/")).toBe("https://j6.test/home");
    expect(notificationUrl({ href: "/group?x=1" }, "https://j6.test")).toBe(
      "https://j6.test/group?x=1",
    );
    expect(notificationUrl({ href: "//evil.test" }, "https://j6.test")).toBeNull();
    expect(notificationUrl({ href: "/\\evil.test" }, "https://j6.test")).toBeNull();
    expect(notificationUrl({ href: "https://evil.test" }, "https://j6.test")).toBeNull();
    expect(notificationUrl({ href: null }, "https://j6.test")).toBeNull();
    expect(notificationUrl(undefined, "https://j6.test")).toBeNull();
  });
});

describe("staysInWebView", () => {
  const web = "https://jaksim.example";
  it("앱 주소와 빈 화면만 웹뷰 안에서 연다(로그인 화면은 앱이 맡는다)", () => {
    expect(staysInWebView("https://jaksim.example/home", web)).toBe(true);
    expect(staysInWebView("about:blank", web)).toBe(true);
    expect(staysInWebView("https://appleid.apple.com/auth/authorize?client_id=x", web)).toBe(false);
    expect(staysInWebView("https://kauth.kakao.com/oauth/authorize", web)).toBe(false);
    expect(staysInWebView("https://ko.wikipedia.org/wiki/x", web)).toBe(false);
  });
});

describe("로그인 약속", () => {
  it("웹과 같은 이름을 쓴다", () => {
    expect(AUTH_OPEN).toBe(WEB_AUTH_OPEN);
    expect(AUTH_RESULT_EVENT).toBe(WEB_AUTH_RESULT_EVENT);
    expect(APP_AUTH_REDIRECT).toBe(WEB_APP_AUTH_REDIRECT);
  });

  it("로그인 열기 메시지만 받고, 시작 경로는 앱 안의 /api/auth/ 만 받는다", () => {
    const ok = {
      type: "auth-open",
      provider: "apple",
      mode: "link",
      next: "/settings",
      path: "/api/auth/apple/start?mode=link",
    };
    expect(authOpenRequest(JSON.stringify(ok))).toEqual({
      provider: "apple",
      mode: "link",
      next: "/settings",
      path: ok.path,
    });
    expect(authOpenRequest(JSON.stringify({ ...ok, path: "https://evil.example/" }))).toBeNull();
    expect(authOpenRequest(JSON.stringify({ ...ok, provider: "naver" }))).toBeNull();
    expect(authOpenRequest(JSON.stringify({ ...ok, mode: "x" }))).toBeNull();
    expect(
      authOpenRequest(JSON.stringify({ type: "open-external", url: "https://a.b" })),
    ).toBeNull();
    expect(authOpenRequest("not json")).toBeNull();
  });

  it("Safari 로그인 창이 돌려준 주소에서 코드를 꺼낸다", () => {
    expect(authCode("jaksim6://auth?code=abc_123")).toBe("abc_123");
    expect(authCode("jaksim6://auth/?code=abc_123")).toBe("abc_123");
    expect(authCode("jaksim6://auth?code=")).toBeNull();
    expect(authCode("jaksim6://other?code=abc")).toBeNull();
    expect(authCode("https://evil.example/?code=abc")).toBeNull();
  });

  it("결과 스크립트는 따옴표가 섞여도 코드가 되지 않는다", () => {
    const js = authResultScript({ kind: "code", code: `a");alert(1);("` });
    expect(js).toContain(JSON.stringify(`a");alert(1);("`));
    expect(js.startsWith('window.dispatchEvent(new CustomEvent("j6-auth-result"')).toBe(true);
  });

  it("카카오 취소만 취소로 본다", () => {
    expect(isKakaoCancel(new Error("user cancelled"))).toBe(true);
    expect(isKakaoCancel(new Error("KAKAO_APP_KEY is missing"))).toBe(false);
  });
});

describe("홈 화면 위젯", () => {
  it("위젯 주소는 앱 안 경로만 연다", () => {
    expect(widgetLink("/lesson/abc")).toBe("jaksim6://open?to=%2Flesson%2Fabc");
    expect(widgetLink("https://evil.test")).toBe("jaksim6://open?to=%2Fhome");
    expect(widgetLinkPath(widgetLink("/quiz/2"))).toBe("/quiz/2");
    expect(widgetOpenUrl(widgetLink("/home"), "https://j6.test/")).toBe("https://j6.test/home");
    expect(widgetOpenUrl("jaksim6://open?to=%2F%2Fevil.test", "https://j6.test")).toBeNull();
    expect(
      widgetOpenUrl("jaksim6://open?to=https%3A%2F%2Fevil.test", "https://j6.test"),
    ).toBeNull();
    expect(widgetOpenUrl("other://open?to=%2Fhome", "https://j6.test")).toBeNull();
    expect(widgetOpenUrl("https://j6.test/home", "https://j6.test")).toBeNull();
  });
  it("위젯 갱신 메시지만 꺼낸다", () => {
    expect(widgetUpdate(JSON.stringify({ type: WIDGET_UPDATE, summary: null }))).toEqual({
      summary: null,
    });
    expect(widgetUpdate(JSON.stringify({ type: WIDGET_UPDATE, summary: { v: 1 } }))).toBeNull();
    expect(widgetUpdate(JSON.stringify({ type: PUSH_REGISTER }))).toBeNull();
    expect(widgetUpdate("nope")).toBeNull();
  });
  it("앞으로 오면 웹에 갱신 이벤트를 쏜다", () => {
    let got = "";
    const win = { dispatchEvent: (e: Event) => (got = e.type) };
    new Function("window", "Event", widgetRefreshScript())(win, Event);
    expect(got).toBe(WIDGET_REFRESH_EVENT);
  });
  it("날이 바뀌면 오래된 요약으로 본다(한국 시간 자정 기준)", () => {
    const now = new Date("2026-11-04T23:59:00+09:00");
    expect(widgetDayKey(now)).toBe("2026-11-04");
    expect(isStale({ day: "2026-11-04" }, now)).toBe(false);
    expect(isStale({ day: "2026-11-04" }, new Date("2026-11-05T00:01:00+09:00"))).toBe(true);
  });
  it("기기 시간대와 상관없이 서버(getToday, Asia/Seoul)와 같은 날로 본다", () => {
    // 미국 동부 11월 4일 오전 10시 = 한국 11월 5일 0시
    const t = new Date("2026-11-04T10:00:00-05:00");
    expect(widgetDayKey(t)).toBe("2026-11-05");
    expect(widgetDayKey(t)).toBe(dayKeyAt(t, "Asia/Seoul"));
    expect(widgetDayKey(new Date("2026-11-04T14:59:59Z"))).toBe("2026-11-04");
    expect(widgetDayKey(new Date("2026-11-04T15:00:00Z"))).toBe("2026-11-05");
  });
  it("잔디 칸 색은 진하기와 오늘 표시를 따른다", () => {
    expect(withAlpha("#5B8CFF", 0.6)).toBe("#5B8CFF99");
    expect(cellStyle("4", "온", false, false)).toEqual({ fill: "#2F62D9", border: null });
    expect(cellStyle("4", "온", true, false)).toEqual({ fill: "#5B8CFF", border: null });
    expect(cellStyle("0", "결", false, true)).toEqual({ fill: null, border: "#B42E25" });
    expect(cellStyle("-", "새", false, false)).toEqual({ fill: null, border: null });
  });
});
