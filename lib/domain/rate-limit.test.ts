import { describe, expect, it } from "vitest";
import { clientKey, windowStart, withinLimit } from "./rate-limit";

describe("windowStart", () => {
  it("같은 창 안의 시각은 같은 시작값을, 경계를 넘으면 다음 창을 준다", () => {
    expect(windowStart(0, 1000)).toBe(0);
    expect(windowStart(999, 1000)).toBe(0);
    expect(windowStart(1000, 1000)).toBe(1000);
    expect(windowStart(2500, 1000)).toBe(2000);
  });
});

describe("withinLimit", () => {
  it("limit번째까지 허용하고 그 다음부터 막는다", () => {
    const rule = { limit: 3, windowMs: 1000 };
    expect([1, 2, 3, 4].map((c) => withinLimit(c, rule))).toEqual([true, true, true, false]);
  });
});

describe("clientKey", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
  it("x-forwarded-for 첫 값, 없으면 x-real-ip, 둘 다 없으면 unknown", () => {
    expect(clientKey(h({ "x-forwarded-for": " 1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientKey(h({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientKey(h({}))).toBe("unknown");
  });
});
