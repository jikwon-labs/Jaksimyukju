import { describe, expect, it } from "vitest";
import { OPEN_EXTERNAL, openInApp } from "./external";

describe("openInApp", () => {
  it("웹(연결 통로 없음)이면 false, 링크가 새 탭으로 연다", () => {
    expect(openInApp("https://ko.wikipedia.org/wiki/x", {})).toBe(false);
  });
  it("앱 껍데기 안이면 URL을 넘기고 true", () => {
    const sent: string[] = [];
    const win = { ReactNativeWebView: { postMessage: (m: string) => sent.push(m) } };
    expect(openInApp("https://ko.wikipedia.org/wiki/x", win)).toBe(true);
    expect(JSON.parse(sent[0])).toEqual({ type: OPEN_EXTERNAL, url: "https://ko.wikipedia.org/wiki/x" });
  });
  it("https가 아닌 주소는 껍데기로 넘기지 않는다", () => {
    const sent: string[] = [];
    const win = { ReactNativeWebView: { postMessage: (m: string) => sent.push(m) } };
    expect(openInApp("javascript:alert(1)", win)).toBe(false);
    expect(sent).toHaveLength(0);
  });
});
