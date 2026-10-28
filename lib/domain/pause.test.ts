import { describe, expect, it } from "vitest";
import {
  comebackGreet,
  hasFinal,
  josa,
  lastWeekStrip,
  pauseCalendar,
  pauseDayLabel,
  presetDays,
  replanDesc,
  stripLabel,
} from "./pause";
import type { GrassLevel, StudyCalendar } from "./rest";

const cal = (rest: string[] = []): StudyCalendar => ({
  startDate: "2026-10-19",
  studyDays: [1, 2, 3, 4, 5],
  restDays: new Set(rest),
});

describe("pauseCalendar", () => {
  it("shows this and next week study days, past disabled", () => {
    const w = pauseCalendar(cal(["2026-11-03"]), "2026-10-29");
    expect(w.map((x) => x.label)).toEqual(["이번 주", "다음 주"]);
    expect(w[0].days.map((d) => d.date)).toEqual([26, 27, 28, 29, 30]);
    expect(w[0].days.map((d) => d.past)).toEqual([true, true, true, false, false]);
    expect(w[1].days.map((d) => d.date)).toEqual([2, 3, 4, 5, 6]);
    expect(w[1].days[1].reserved).toBe(true);
  });
  it("only includes the user's study weekdays", () => {
    const w = pauseCalendar({ ...cal(), studyDays: [1, 3, 5] }, "2026-10-29");
    expect(w[0].days.map((d) => d.wd)).toEqual(["월", "수", "금"]);
  });
  it("presets skip past and reserved days", () => {
    const w = pauseCalendar(cal(["2026-11-03"]), "2026-10-29");
    expect(presetDays(w, "rest")).toEqual(["2026-10-29", "2026-10-30"]);
    expect(presetDays(w, "next")).toEqual(["2026-11-02", "2026-11-04", "2026-11-05", "2026-11-06"]);
    expect(presetDays(w, "custom")).toEqual([]);
  });
  it("labels days for screen readers", () => {
    const w = pauseCalendar(cal(), "2026-10-29");
    expect(pauseDayLabel(w[0].days[0], false)).toBe("지난 날 월요일 26일");
    expect(pauseDayLabel(w[0].days[3], true)).toBe("목요일 29일, 쉬는 날");
  });
});

describe("lastWeekStrip", () => {
  it("marks study, missed, off, rest and today", () => {
    const levels = new Map<string, GrassLevel>([
      ["2026-10-27", 3],
      ["2026-10-28", 1],
    ]);
    const s = lastWeekStrip(cal(["2026-11-02"]), levels, "2026-11-03");
    expect(s.map((c) => `${c.wd}:${c.kind}`)).toEqual([
      "수:study",
      "목:missed",
      "금:missed",
      "토:off",
      "일:off",
      "월:rest",
      "화:today",
    ]);
    expect(stripLabel(s)).toBe("수 학습, 목금 빠짐, 월 쉬어 가기, 오늘 화요일");
  });
});

describe("copy", () => {
  it("picks particles by final consonant", () => {
    expect(hasFinal("6주")).toBe(false);
    expect(hasFinal("6주 3일")).toBe(true);
    expect(hasFinal("7주 2")).toBe(false);
    expect(josa("6주", "이", "가")).toBe("6주가");
    expect(josa("6주 3일", "이", "가")).toBe("6주 3일이");
  });
  it("uses the real missed count", () => {
    expect(replanDesc("delay", 3, "6주", "6주 3일")).toBe(
      "과정이 3일 늘어나요. 6주가 6주 3일이 되고, 하루 분량은 그대로예요.",
    );
    expect(replanDesc("squeeze", 2, "", "")).toContain("레슨 2개");
    expect(replanDesc("skip", 4, "", "")).toContain("밀린 4개");
    expect(comebackGreet("온", 3)).toBe("3일 만이에요. 와 줘서 정말 반가워요. 오늘은 가볍게 5분만 해요.");
  });
});
