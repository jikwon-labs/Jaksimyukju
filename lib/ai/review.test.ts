import { describe, expect, it } from "vitest";
import { validQuestion } from "@/lib/domain/review";
import { CASHFLOW_LESSON } from "./finance";
import { mockReviewQuestion, reviewAngle, reviewRole, REVIEW_ANGLES } from "./review";
import type { ReviewInput } from "./types";

const base: ReviewInput = {
  teacher: "온",
  lessonTitle: "현금흐름표는 왜 손익계산서와 다를까",
  core: CASHFLOW_LESSON.core,
  sections: CASHFLOW_LESSON.sections,
  level: "처음이에요",
  focus: "lesson",
  step: 0,
};

describe("mock 복습 문제", () => {
  it("결정적이고, 보기 4개 중 정답이 레슨 핵심이다", () => {
    const a = mockReviewQuestion(base);
    expect(mockReviewQuestion(base)).toEqual(a);
    expect(validQuestion(a)).toBe(true);
    expect(a.choices).toHaveLength(4);
    expect(a.choices[a.answer]).toBe(CASHFLOW_LESSON.core.trim());
  });
  it("간격마다 묻는 말과 정답 자리가 바뀔 수 있다", () => {
    const qs = [0, 1, 2, 3].map((step) => mockReviewQuestion({ ...base, step }));
    expect(new Set(qs.map((q) => q.q)).size).toBeGreaterThan(1);
    for (const q of qs) expect(validQuestion(q)).toBe(true);
  });
  it("헷갈린 개념은 그렇게 묻고, 선생님 말투가 다르다", () => {
    expect(mockReviewQuestion({ ...base, focus: "tutor" }).q).toContain("헷갈렸던");
    expect(mockReviewQuestion({ ...base, teacher: "결" }).why).toContain("입니다");
  });
  it("본문이 비어도 문제를 만든다", () => {
    expect(validQuestion(mockReviewQuestion({ ...base, core: "", sections: [] }))).toBe(true);
  });
});

describe("복습 프롬프트", () => {
  it("레슨 본문을 근거로, 간격마다 다른 각도로 묻는다", () => {
    const role = reviewRole(base);
    expect(role).toContain(CASHFLOW_LESSON.sections[0].heading);
    expect(role).toContain("4지선다");
    expect(role).toContain(REVIEW_ANGLES[0]);
    expect(reviewRole({ ...base, step: 1 })).toContain(REVIEW_ANGLES[1]);
    expect(reviewAngle(REVIEW_ANGLES.length)).toBe(REVIEW_ANGLES[0]);
  });
  it("헷갈린 개념이면 그 핵심을 바로 묻게 한다", () => {
    expect(reviewRole({ ...base, focus: "tutor" })).toContain("헷갈렸다");
    expect(reviewRole(base)).not.toContain("헷갈렸다");
  });
});
