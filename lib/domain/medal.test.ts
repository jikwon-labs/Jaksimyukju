import { describe, expect, it } from "vitest";
import { dotDate, lastDoneDay, medalBody, medalLabel, medalSvg } from "./medal";

describe("완주 메달", () => {
  it("주 수와 '완주'를 새기고 금색으로 칠한다", () => {
    const svg = medalSvg({ weeks: 6, teacher: "온" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(">6</text>");
    expect(svg).toContain(">완주</text>");
    expect(svg).not.toContain("주 완주");
    expect(svg).toContain("#D9A92E"); // 금색
    expect(svg).toContain("#5B8CFF"); // 온 리본
  });

  it("받지 않은 메달은 회색이고 선생님 색을 쓰지 않는다", () => {
    const svg = medalSvg({ weeks: 6, teacher: "온", locked: true });
    expect(svg).not.toContain("#D9A92E");
    expect(svg).not.toContain("#5B8CFF");
    expect(medalLabel({ weeks: 6, teacher: "온", locked: true })).toBe("아직 받지 않은 완주 메달");
  });

  it("주 수는 정수로 다듬는다", () => {
    expect(medalBody({ weeks: 4.4, teacher: "새" })).toContain(">4</text>");
    expect(medalBody({ weeks: Number.NaN, teacher: "새" })).toContain(">6</text>");
    expect(medalLabel({ weeks: 4, teacher: "결" })).toBe("4주 과정 완주 메달");
  });

  it("그라데이션 id 에 접두어를 붙여 수료 카드와 화면 메달이 겹치지 않는다", () => {
    expect(medalBody({ weeks: 6, teacher: "결" }, "cert")).toContain('id="cert-gold-gyeol-rim"');
    expect(medalBody({ weeks: 6, teacher: "결" })).toContain('id="md-gold-gyeol-rim"');
  });

  it("날짜 표기와 마지막으로 마친 날", () => {
    expect(dotDate("2026-11-05")).toBe("2026.11.05");
    expect(lastDoneDay(["2026-10-01", null, "2026-11-05", undefined, "2026-10-20"], "2026-09-21")).toBe("2026-11-05");
    expect(lastDoneDay([null], "2026-09-21")).toBe("2026-09-21");
  });
});
