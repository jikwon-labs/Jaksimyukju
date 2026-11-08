import { describe, expect, it } from "vitest";
import { canAddCourse, MAX_ACTIVE_COURSES, pickFocus } from "./courses";

const c = (id: string, status: string, day: number) => ({ id, status, createdAt: new Date(2026, 10, day) });

describe("pickFocus", () => {
  const courses = [c("a", "active", 1), c("b", "active", 3), c("f", "finished", 4), c("s", "stopped", 5)];

  it("고른 과정이 열려 있으면 그 과정", () => {
    expect(pickFocus(courses, "a")?.id).toBe("a");
    expect(pickFocus(courses, "f")?.id).toBe("f");
  });

  it("고른 과정이 없거나 그만둔 과정이면 가장 최근의 진행 중 과정", () => {
    expect(pickFocus(courses, null)?.id).toBe("b");
    expect(pickFocus(courses, "s")?.id).toBe("b");
    expect(pickFocus(courses, "gone")?.id).toBe("b");
  });

  it("진행 중이 없으면 가장 최근에 완주한 과정, 그것도 없으면 null", () => {
    expect(pickFocus([c("f1", "finished", 1), c("f2", "finished", 2)], null)?.id).toBe("f2");
    expect(pickFocus([c("s", "stopped", 1)], null)).toBeNull();
    expect(pickFocus([], "x")).toBeNull();
  });
});

describe("canAddCourse", () => {
  it(`진행 중 과정이 ${MAX_ACTIVE_COURSES}개보다 적을 때만 더할 수 있다`, () => {
    expect(canAddCourse(0).ok).toBe(true);
    expect(canAddCourse(MAX_ACTIVE_COURSES - 1).ok).toBe(true);
    expect(canAddCourse(MAX_ACTIVE_COURSES)).toEqual({ ok: false, reason: "too_many" });
  });
});
