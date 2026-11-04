import { describe, expect, it } from "vitest";
import { clientKey, hitRate, type RateWindow } from "./rate-limit";

const RULE = { limit: 3, windowMs: 1000, maxKeys: 2 };

describe("hitRate", () => {
  it("창 안에서는 limit까지만 허용하고, 창이 지나면 다시 센다", () => {
    const s = new Map<string, RateWindow>();
    expect([0, 1, 2, 3].map((t) => hitRate(s, "a", t, RULE))).toEqual([true, true, true, false]);
    expect(hitRate(s, "a", 999, RULE)).toBe(false);
    expect(hitRate(s, "a", 1000, RULE)).toBe(true);
  });

  it("키마다 따로 센다", () => {
    const s = new Map<string, RateWindow>();
    for (let i = 0; i < 3; i++) hitRate(s, "a", 0, RULE);
    expect(hitRate(s, "a", 0, RULE)).toBe(false);
    expect(hitRate(s, "b", 0, RULE)).toBe(true);
  });

  it("키 수 상한을 넘지 않는다(끝난 창, 오래된 키부터 지운다)", () => {
    const s = new Map<string, RateWindow>();
    hitRate(s, "a", 0, RULE);
    hitRate(s, "b", 500, RULE);
    hitRate(s, "c", 1200, RULE);
    expect([...s.keys()]).toEqual(["b", "c"]);
    hitRate(s, "d", 1300, RULE);
    expect(s.size).toBe(2);
    expect(s.has("d")).toBe(true);
  });
});

describe("clientKey", () => {
  const h = (m: Record<string, string>) => ({ get: (n: string) => m[n] ?? null });
  it("x-forwarded-for 첫 값, 없으면 x-real-ip, 그것도 없으면 unknown", () => {
    expect(clientKey(h({ "x-forwarded-for": " 1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientKey(h({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientKey(h({}))).toBe("unknown");
  });
});
