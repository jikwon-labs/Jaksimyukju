import { describe, expect, it } from "vitest";
import { nickname } from "./nickname";

describe("별명", () => {
  it("겹치지 않게 차례로 붙인다", () => {
    const names = Array.from({ length: 40 }, (_, i) => nickname(i));
    expect(new Set(names).size).toBe(40);
    expect(names.includes("나")).toBe(false);
    expect(nickname(0)).toBe("하늘");
    expect(nickname(12)).toBe("하늘2");
  });
});
