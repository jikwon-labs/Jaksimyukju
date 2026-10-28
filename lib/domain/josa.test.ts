import { describe, expect, it } from "vitest";
import { hasBatchim, ro } from "./josa";

describe("조사 로/으로", () => {
  it("받침에 따라 고른다", () => {
    expect(ro("잔디만")).toBe("잔디만으로");
    expect(ro("잔디와 주제")).toBe("잔디와 주제로");
    expect(ro("서울")).toBe("서울로"); // ㄹ 받침은 "로"
    expect(ro("ABC")).toBe("ABC로");
    expect(hasBatchim("결")).toBe(true);
    expect(hasBatchim("새")).toBe(false);
  });
});

describe("조사 을/를, 이/가, 은/는", () => {
  it("받침에 따라 고른다", async () => {
    const { eul, iga, eun } = await import("./josa");
    expect(eul("영어 회화")).toBe("영어 회화를");
    expect(eul("사진 보정")).toBe("사진 보정을");
    expect(iga("감가상각")).toBe("감가상각이");
    expect(iga("요리")).toBe("요리가");
    expect(eun("마일스톤")).toBe("마일스톤은");
    expect(eun("퀴즈")).toBe("퀴즈는");
  });
});
