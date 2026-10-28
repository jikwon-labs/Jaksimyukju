import { describe, expect, it } from "vitest";
import { certificateSvg } from "./certificate";

const input = {
  name: "지우",
  topic: "재무제표 읽기",
  goal: "재무제표를 혼자 읽고 한 장으로 요약하기",
  weeks: 6,
  lessons: 24,
  longest: 18,
  start: "2026-10-19",
  end: "2026-11-27",
  teacher: "결" as const,
};

describe("수료 카드", () => {
  it("과정 기록과 선생님 색을 담는다", () => {
    const svg = certificateSvg(input);
    expect(svg).toContain("재무제표 읽기");
    expect(svg).toContain("6주");
    expect(svg).toContain("18일");
    expect(svg).toContain("#FFE9E5"); // 결 연한 색
    expect(svg.startsWith("<svg")).toBe(true);
  });
  it("사용자 입력은 이스케이프한다", () => {
    const svg = certificateSvg({ ...input, topic: "<script>&" });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;&amp;");
  });
});
