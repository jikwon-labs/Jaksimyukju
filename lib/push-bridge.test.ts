import { describe, expect, it } from "vitest";
import { PUSH_REGISTER, requestPushToken } from "./push-bridge";

describe("requestPushToken", () => {
  it("앱 안이면 껍데기에 토큰을 달라고 보낸다", () => {
    const sent: string[] = [];
    const win = { ReactNativeWebView: { postMessage: (m: string) => sent.push(m) } };
    expect(requestPushToken(true, win)).toBe(true);
    expect(JSON.parse(sent[0])).toEqual({ type: PUSH_REGISTER, ask: true });
  });
  it("웹이면 아무것도 보내지 않는다", () => {
    expect(requestPushToken(true, {})).toBe(false);
  });
});
