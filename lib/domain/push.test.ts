import { describe, expect, it } from "vitest";
import { expoMessage, isExpoPushToken, pushSenderName, readExpoResponse, sendExpo } from "./push";

describe("isExpoPushToken", () => {
  it("Expo 토큰 모양만 받는다", () => {
    expect(isExpoPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abc-123]")).toBe(true);
    expect(isExpoPushToken("ExponentPushToken[]")).toBe(false);
    expect(isExpoPushToken("ExponentPushToken[a b]")).toBe(false);
    expect(isExpoPushToken("fcm-raw-token")).toBe(false);
    expect(isExpoPushToken(`ExponentPushToken[${"a".repeat(300)}]`)).toBe(false);
    expect(isExpoPushToken(null)).toBe(false);
    expect(isExpoPushToken(42)).toBe(false);
  });
});

describe("expoMessage", () => {
  it("알림을 누르면 열 주소를 data.href로 싣는다", () => {
    const m = expoMessage("ExpoPushToken[a]", { title: "온 선생님", body: "오늘 학습 시간이에요", href: "/home" });
    expect(m).toMatchObject({ to: "ExpoPushToken[a]", title: "온 선생님", body: "오늘 학습 시간이에요", data: { href: "/home" } });
    expect(m.channelId).toBe("default");
  });
});

describe("readExpoResponse", () => {
  it("티켓이 ok면 보냄", () => {
    expect(readExpoResponse(200, { data: { status: "ok", id: "t1" } })).toEqual({ ok: true });
    expect(readExpoResponse(200, { data: [{ status: "ok", id: "t1" }] })).toEqual({ ok: true });
  });
  it("DeviceNotRegistered면 토큰을 지우라고 한다", () => {
    const r = readExpoResponse(200, { data: { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } } });
    expect(r).toEqual({ ok: false, dropToken: true, reason: "DeviceNotRegistered" });
  });
  it("다른 오류는 실패지만 토큰은 남긴다", () => {
    expect(readExpoResponse(200, { data: { status: "error", details: { error: "MessageRateExceeded" } } })).toMatchObject({
      ok: false,
      dropToken: false,
    });
    expect(readExpoResponse(500, null)).toEqual({ ok: false, dropToken: false, reason: "http 500" });
    expect(readExpoResponse(200, { errors: [{ code: "VALIDATION_ERROR" }] })).toMatchObject({ ok: false, dropToken: false });
    expect(readExpoResponse(200, null)).toMatchObject({ ok: false, dropToken: false });
  });
});

describe("sendExpo", () => {
  const msg = { title: "t", body: "b", href: "/home" };
  it("JSON으로 보내고, 액세스 토큰이 있으면 Bearer로 붙인다", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return { status: 200, json: async () => ({ data: { status: "ok" } }) };
    };
    expect(await sendExpo(fetchFn, "ExpoPushToken[a]", msg, { accessToken: "sek" })).toEqual({ ok: true });
    expect(calls[0].url).toBe("https://exp.host/--/api/v2/push/send");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sek");
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({ to: "ExpoPushToken[a]", data: { href: "/home" } });
  });
  it("액세스 토큰이 없으면 authorization을 붙이지 않는다", async () => {
    let headers: Record<string, string> = {};
    await sendExpo(async (_u, init) => {
      headers = init.headers as Record<string, string>;
      return { status: 200, json: async () => ({ data: { status: "ok" } }) };
    }, "ExpoPushToken[a]", msg);
    expect(headers.authorization).toBeUndefined();
  });
  it("네트워크 오류는 던지지 않고 실패로 돌려준다", async () => {
    const r = await sendExpo(async () => {
      throw new Error("ECONNRESET");
    }, "ExpoPushToken[a]", msg);
    expect(r).toEqual({ ok: false, dropToken: false, reason: "ECONNRESET" });
  });
  it("본문이 JSON이 아니어도 실패로 돌려준다", async () => {
    const r = await sendExpo(async () => ({ status: 502, json: async () => Promise.reject(new Error("x")) }), "ExpoPushToken[a]", msg);
    expect(r).toMatchObject({ ok: false, dropToken: false });
  });
});

describe("pushSenderName", () => {
  it("운영은 expo, 그 밖은 mock. PUSH_SENDER가 이긴다", () => {
    expect(pushSenderName({ NODE_ENV: "production" })).toBe("expo");
    expect(pushSenderName({ NODE_ENV: "development" })).toBe("mock");
    expect(pushSenderName({})).toBe("mock");
    expect(pushSenderName({ NODE_ENV: "production", PUSH_SENDER: "mock" })).toBe("mock");
    expect(pushSenderName({ NODE_ENV: "development", PUSH_SENDER: "expo" })).toBe("expo");
    expect(pushSenderName({ NODE_ENV: "production", PUSH_SENDER: "fcm" })).toBe("expo");
  });
});
