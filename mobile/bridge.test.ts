// 루트의 vitest가 돌린다. 웹(lib/external.ts)과 앱 껍데기가 같은 메시지 약속을 쓰는지 본다
import { describe, expect, it } from "vitest";
import { OPEN_EXTERNAL as WEB_SIDE } from "../lib/external";
import { PUSH_CHANNEL as WEB_PUSH_CHANNEL } from "../lib/domain/push";
import { PUSH_REGISTER as WEB_PUSH_REGISTER, PUSH_TOKEN_EVENT as WEB_PUSH_TOKEN_EVENT, requestPushToken } from "../lib/push-bridge";
import { externalUrl, notificationUrl, OPEN_EXTERNAL, PUSH_CHANNEL, PUSH_REGISTER, PUSH_TOKEN_EVENT, pushRequest, pushTokenScript, staysInWebView } from "./bridge";

describe("externalUrl", () => {
  it("웹과 같은 메시지 이름을 쓴다", () => {
    expect(OPEN_EXTERNAL).toBe(WEB_SIDE);
  });
  it("인앱 브라우저로 열 https 주소만 꺼낸다", () => {
    expect(externalUrl(JSON.stringify({ type: OPEN_EXTERNAL, url: "https://ko.wikipedia.org/wiki/x" }))).toBe("https://ko.wikipedia.org/wiki/x");
    expect(externalUrl(JSON.stringify({ type: OPEN_EXTERNAL, url: "javascript:alert(1)" }))).toBeNull();
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
    expect(notificationUrl({ href: "/group?x=1" }, "https://j6.test")).toBe("https://j6.test/group?x=1");
    expect(notificationUrl({ href: "//evil.test" }, "https://j6.test")).toBeNull();
    expect(notificationUrl({ href: "/\\evil.test" }, "https://j6.test")).toBeNull();
    expect(notificationUrl({ href: "https://evil.test" }, "https://j6.test")).toBeNull();
    expect(notificationUrl({ href: null }, "https://j6.test")).toBeNull();
    expect(notificationUrl(undefined, "https://j6.test")).toBeNull();
  });
});

describe("staysInWebView", () => {
  const web = "https://jaksim.example";
  it("앱 주소와 Apple 로그인 화면만 웹뷰 안에서 연다", () => {
    expect(staysInWebView("https://jaksim.example/home", web)).toBe(true);
    expect(staysInWebView("about:blank", web)).toBe(true);
    expect(staysInWebView("https://appleid.apple.com/auth/authorize?client_id=x", web)).toBe(true);
    expect(staysInWebView("https://ko.wikipedia.org/wiki/x", web)).toBe(false);
    // 호스트 이름이 Apple처럼 보이기만 하는 주소는 넘기지 않는다
    expect(staysInWebView("https://appleid.apple.com.evil.example/", web)).toBe(false);
    expect(staysInWebView("http://appleid.apple.com/", web)).toBe(false);
    expect(staysInWebView("not a url", web)).toBe(false);
  });
});
