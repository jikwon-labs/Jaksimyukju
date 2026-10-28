import { describe, expect, it } from "vitest";
import { blend, contrastRatio, luminance } from "./contrast";
import { FACES } from "./faces";
import { accent, DARK_TINT_ALPHA, PALETTES, TEACHERS, TEACHER_NAMES, themeCss } from "./tokens";
import type { FaceState } from "./types";

const STATES: FaceState[] = ["base", "listen", "think", "joy", "sad"];

describe("contrastRatio", () => {
  it("검정과 흰색은 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });
  it("같은 색은 1:1이고 순서와 상관없다", () => {
    expect(contrastRatio("#5B8CFF", "#5B8CFF")).toBeCloseTo(1, 5);
    expect(contrastRatio("#111114", "#FFFFFF")).toBeCloseTo(contrastRatio("#FFFFFF", "#111114"), 5);
  });
  it("3자리 hex도 읽는다", () => {
    expect(luminance("#fff")).toBeCloseTo(1, 5);
  });
});

describe("선생님 버튼과 강조 글자 대비 4.5:1 이상", () => {
  for (const who of TEACHER_NAMES) {
    const t = TEACHERS[who];
    it(`${who} 라이트: 진한 색 버튼 + 흰 글자`, () => {
      const a = accent(t, false);
      expect(a.btnBg).toBe(t.deep);
      expect(a.btnInk).toBe("#FFFFFF");
      expect(contrastRatio(a.btnBg, a.btnInk)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(a.text, PALETTES.light.bg)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${who} 다크: 몸 색 버튼 + #111114 글자`, () => {
      const a = accent(t, true);
      expect(a.btnBg).toBe(t.body);
      expect(a.btnInk).toBe("#111114");
      expect(contrastRatio(a.btnBg, a.btnInk)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(a.text, PALETTES.dark.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(a.text, PALETTES.dark.surface)).toBeGreaterThanOrEqual(4.5);
    });
  }
  it("연한 강조 배경(칩, 콕 찌르기) 위 강조 글자도 4.5:1 이상", () => {
    for (const who of TEACHER_NAMES) {
      const t = TEACHERS[who];
      expect(contrastRatio(accent(t, false).text, t.tint), `${who} 라이트`).toBeGreaterThanOrEqual(4.5);
      for (const under of [PALETTES.dark.bg, PALETTES.dark.surface]) {
        const tint = blend(t.body, DARK_TINT_ALPHA, under);
        expect(contrastRatio(t.body, tint), `${who} 다크 ${under}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it("본문 글자와 보조 글자도 배경 대비 4.5:1 이상", () => {
    for (const p of [PALETTES.light, PALETTES.dark]) {
      expect(contrastRatio(p.ink, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.sub, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.sub, p.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("표정 데이터", () => {
  it("선생님 3명 x 표정 5개 = 15조합이 모두 있다", () => {
    let n = 0;
    for (const who of TEACHER_NAMES) {
      for (const st of STATES) {
        const f = FACES[who][st];
        expect(f, `${who}.${st}`).toBeDefined();
        expect(f.mouth.length).toBeGreaterThan(0);
        expect(f.eye.length + f.lid.length).toBeGreaterThan(0);
        expect(f.body).toBe(TEACHERS[who].body);
        expect(f.deep).toBe(TEACHERS[who].deep);
        n++;
      }
    }
    expect(n).toBe(15);
  });
  it("생각 표정만 점 세 개, 기쁨만 통통 튄다, 온의 서운함만 눈물", () => {
    for (const who of TEACHER_NAMES) {
      expect(FACES[who].think.dots).toBe("inline");
      expect(FACES[who].base.dots).toBe("none");
      expect(FACES[who].joy.move).toBe("ci-hop");
      expect(FACES[who].base.move).toBe("ci-breathe");
    }
    expect(FACES["온"].sad.tear).not.toBe("");
    expect(FACES["결"].sad.tear).toBe("");
  });
});

describe("themeCss", () => {
  it("기기 설정 다크 미디어 쿼리와 선생님별 변수를 만든다", () => {
    const css = themeCss();
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    for (const who of TEACHER_NAMES) expect(css).toContain(`[data-teacher="${who}"]`);
    expect(css).toContain("--a-btn-ink:#111114");
  });
});
