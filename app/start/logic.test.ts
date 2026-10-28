import { describe, expect, it } from "vitest";
import { FINANCE_TOPIC as AI_FINANCE_TOPIC } from "@/lib/ai/finance";
import { FINANCE_TOPIC, formatTime, goalChips, lessonCount, scheduleSummary, toggleDay } from "./logic";

describe("goalChips", () => {
  it("uses the mockup chips for 재무제표 읽기", () => {
    expect(goalChips("재무제표 읽기")).toEqual([
      "재무제표를 혼자 읽고 한 장으로 요약하기",
      "회사 숫자로 투자 판단 근거 세우기",
      "회의에서 재무 숫자를 설명하기",
    ]);
  });
  it("builds three chips from other topics with the right particle", () => {
    const a = goalChips("영어 회화");
    expect(a).toHaveLength(3);
    expect(a[0]).toBe("영어 회화를 혼자 해 보고 결과물 하나 만들기");
    expect(goalChips("사진 보정")[0]).toBe("사진 보정을 혼자 해 보고 결과물 하나 만들기");
    expect(goalChips("Python")[0]).toBe("Python를 혼자 해 보고 결과물 하나 만들기");
    expect(new Set(goalChips("디자인 기초")).size).toBe(3);
  });
  it("is empty for an empty topic", () => {
    expect(goalChips("  ")).toEqual([]);
  });
});

describe("scheduleSummary", () => {
  it("matches the mockup copy, counting lessons like the generator", () => {
    expect(scheduleSummary(5, 10, 6)).toEqual({
      main: "주 5일 × 10분, 6주 동안 레슨 24개",
      sub: "한 주에 50분이에요. 바쁜 날에는 5분 버전으로 대신할 수 있어요.",
    });
  });
});

describe("lessonCount", () => {
  it("leaves one day a week for the quiz and milestone", () => {
    expect(lessonCount(5, 6)).toBe(24);
    expect(lessonCount(3, 4)).toBe(8);
    expect(lessonCount(1, 2)).toBe(2);
    expect(lessonCount(0, 6)).toBe(0);
  });
});

describe("formatTime", () => {
  it("formats 24h time in Korean 12h", () => {
    expect(formatTime("21:30")).toBe("오후 9:30");
    expect(formatTime("00:05")).toBe("오전 12:05");
    expect(formatTime("12:00")).toBe("오후 12:00");
    expect(formatTime("07:15")).toBe("오전 7:15");
  });
});

describe("toggleDay", () => {
  it("adds and removes, keeping Monday-first order", () => {
    expect(toggleDay([1, 2, 3], 0)).toEqual([1, 2, 3, 0]);
    expect(toggleDay([1, 2, 3], 2)).toEqual([1, 3]);
    expect(toggleDay([0], 6)).toEqual([6, 0]);
  });
});

describe("FINANCE_TOPIC", () => {
  it("matches the AI finance topic", () => {
    expect(FINANCE_TOPIC).toBe(AI_FINANCE_TOPIC);
  });
});
