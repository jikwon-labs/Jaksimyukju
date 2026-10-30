// 루트의 vitest가 돌린다. 웹(lib/external.ts)과 앱 껍데기가 같은 메시지 약속을 쓰는지 본다
import { describe, expect, it } from "vitest";
import { OPEN_EXTERNAL as WEB_SIDE } from "../lib/external";
import { externalUrl, OPEN_EXTERNAL } from "./bridge";

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
