import { describe, expect, it } from "vitest";
import { hostOf, monthDay } from "./format";

describe("format", () => {
  it("hostOf는 www를 떼고 잘못된 주소는 출처 미상", () => {
    expect(hostOf("https://www.youtube.com/results?q=1")).toBe("youtube.com");
    expect(hostOf("https://ko.wikipedia.org/wiki/x")).toBe("ko.wikipedia.org");
    expect(hostOf("not a url")).toBe("출처 미상");
  });
  it("monthDay는 서울 기준 날짜", () => {
    expect(monthDay(new Date("2026-10-28T16:00:00Z"))).toBe("10월 29일");
  });
});
