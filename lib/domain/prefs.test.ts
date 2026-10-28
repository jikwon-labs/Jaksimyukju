import { describe, expect, it } from "vitest";
import {
  durationLabel,
  normalizeTime,
  quizChart,
  quizChartLabel,
  shiftTime,
  studyDaysLabel,
  timeLabel,
  toggleStudyDay,
} from "./prefs";

describe("time", () => {
  it("labels in Korean 12h", () => {
    expect(timeLabel("21:30")).toBe("오후 9:30");
    expect(timeLabel("12:00")).toBe("오후 12:00");
    expect(timeLabel("06:00")).toBe("오전 6:00");
  });
  it("steps by 30 minutes within 6:00-23:00", () => {
    expect(shiftTime("21:30", 30)).toBe("22:00");
    expect(shiftTime("23:00", 30)).toBe("23:00");
    expect(shiftTime("06:00", -30)).toBe("06:00");
    expect(normalizeTime("21:10")).toBe("21:00");
    expect(normalizeTime("bad")).toBe("21:00");
  });
});

describe("study days", () => {
  it("labels ranges and lists", () => {
    expect(studyDaysLabel([1, 2, 3, 4, 5])).toBe("월–금");
    expect(studyDaysLabel([1, 3, 5])).toBe("월·수·금");
    expect(studyDaysLabel([6, 0])).toBe("토·일");
    expect(studyDaysLabel([0, 1, 2, 3, 4, 5, 6])).toBe("매일");
    expect(studyDaysLabel([1, 2, 3, 5])).toBe("월–수·금");
  });
  it("keeps at least one day", () => {
    expect(toggleStudyDay([1], 1)).toEqual([1]);
    expect(toggleStudyDay([1, 2], 2)).toEqual([1]);
    expect(toggleStudyDay([1, 2], 0)).toEqual([1, 2, 0]);
  });
});

describe("durationLabel", () => {
  it("adds extra days and rolls over to weeks", () => {
    expect(durationLabel(6, 0, 5)).toBe("6주");
    expect(durationLabel(6, 3, 5)).toBe("6주 3일");
    expect(durationLabel(6, 7, 5)).toBe("7주 2일");
    expect(durationLabel(6, 5, 5)).toBe("7주");
  });
});

describe("quizChart", () => {
  it("places points for answered weeks only", () => {
    const c = quizChart([100, null, 0], 100, 100, 10);
    expect(c.xs).toEqual([10, 50, 90]);
    expect(c.points).toEqual([
      { x: 10, y: 10, value: 100, week: 1 },
      { x: 90, y: 90, value: 0, week: 3 },
    ]);
    expect(c.path).toBe("M10.0 10.0 L90.0 90.0");
  });
  it("describes the chart", () => {
    expect(quizChartLabel([80, null])).toBe("1주차 퀴즈 80점. 2주차부터는 아직 퀴즈 전");
    expect(quizChartLabel([null])).toBe("아직 푼 퀴즈 없음. 1주차부터는 아직 퀴즈 전");
  });
});
