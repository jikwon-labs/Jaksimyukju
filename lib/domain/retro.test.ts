import { describe, expect, it } from "vitest";
import { RETRO_YES, retroChips, retroLines, retroPlan } from "./retro";

describe("retro", () => {
  it("has 4 lines per teacher with the short day filled in", () => {
    const l = retroLines("온", 2, "수");
    expect(l).toHaveLength(4);
    expect(l[2]).toBe(
      "수요일에 5분 버전으로라도 이어 간 덕에 연속이 끊기지 않았어요. 다음 주 수요일은 처음부터 5분 버전으로 잡아 둘까요?",
    );
    expect(retroLines("결", 2, null)[0]).toBe("2주차 정리합니다. 이번 주에 확실히 남은 건 뭡니까?");
    expect(retroLines("새", 2, null)[2]).not.toContain("null");
  });
  it("offers chips per step", () => {
    expect(retroChips(0, ["A", "B", "C"], 10)).toEqual(["A", "B", "솔직히 잘 모르겠어요"]);
    expect(retroChips(2, [], 10)).toEqual([RETRO_YES, "아니요, 10분 해 볼게요"]);
    expect(retroChips(3, [], 10)).toEqual([]);
  });
  it("turns the last answer into a plan", () => {
    const opts = { days: ["월", "화", "수", "목", "금"], shortDay: "수", minutes: 10, daysLabel: "월–금" };
    expect(retroPlan(RETRO_YES, opts)).toBe("월·화·목·금은 10분, 수요일은 5분 버전");
    expect(retroPlan("아니요, 10분 해 볼게요", opts)).toBe("월–금 매일 10분, 전체 버전으로");
    expect(retroPlan(RETRO_YES, { ...opts, shortDay: null })).toBe("월–금 힘든 날은 5분 버전으로");
    expect(retroPlan("  주말에 몰아서  ", opts)).toBe("주말에 몰아서");
  });
});
