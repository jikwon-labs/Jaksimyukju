import { describe, expect, it } from "vitest";
import { PERSONALITY_QUESTIONS, recommendTeacher } from "./personality";

describe("recommendTeacher", () => {
  it("defaults to 온 with no answers", () => {
    expect(recommendTeacher([])).toBe("온");
  });
  it("picks the majority", () => {
    expect(recommendTeacher(["온", "결", "결"])).toBe("결");
    expect(recommendTeacher(["새", "새", "온"])).toBe("새");
    expect(recommendTeacher(["결", "결", "결"])).toBe("결");
  });
  it("breaks a 1-1-1 tie with the first answer", () => {
    expect(recommendTeacher(["새", "온", "결"])).toBe("새");
    expect(recommendTeacher(["결", "새", "온"])).toBe("결");
  });
  it("uses the first answer while only partly answered", () => {
    expect(recommendTeacher(["새"])).toBe("새");
    expect(recommendTeacher(["결", "온"])).toBe("결");
  });
  it("keeps option order 온, 결, 새 for every question", () => {
    for (const q of PERSONALITY_QUESTIONS) {
      expect(q.options.map((o) => o.teacher)).toEqual(["온", "결", "새"]);
    }
  });
});
