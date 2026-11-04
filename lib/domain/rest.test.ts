import { describe, expect, it } from "vitest";
import { addDays, diffDays, mondayOf, parseStudyDays, weekday } from "./dates";
import {
  activityLevels,
  countedMilestoneDays,
  countedQuizDay,
  currentStreak,
  dayKind,
  grassGrid,
  longestStreak,
  missedStudyDays,
  needsComeback,
  pauseRemaining,
  REPLAN_BY_TEACHER,
  replan,
  type StudyCalendar,
  validatePause,
} from "./rest";

// 2026-10-19(월) 시작, 월~금 학습
const START = "2026-10-19";
const cal = (rest: string[] = []): StudyCalendar => ({
  startDate: START,
  studyDays: [1, 2, 3, 4, 5],
  restDays: new Set(rest),
});
const lv = (pairs: [string, "short" | "lesson" | "lesson_tutor" | "quiz" | "milestone"][]) =>
  activityLevels(pairs.map(([day, kind]) => ({ day, kind })));

describe("dates", () => {
  it("요일과 날짜 계산", () => {
    expect(weekday("2026-10-29")).toBe(4); // 목
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(diffDays("2026-11-02", "2026-10-29")).toBe(4);
    expect(mondayOf("2026-11-01")).toBe("2026-10-26"); // 일요일 -> 그 주 월요일
    expect(parseStudyDays("0,1,3")).toEqual([1, 3, 0]);
  });
});

describe("연속 학습일", () => {
  it("주말(학습 요일 아님)은 연속을 끊지 않는다", () => {
    const levels = lv([
      ["2026-10-22", "lesson"],
      ["2026-10-23", "lesson"],
      ["2026-10-26", "lesson"],
    ]);
    expect(currentStreak(cal(), levels, "2026-10-26")).toBe(3);
  });
  it("오늘 아직 안 했으면 끊지 않고 어제까지 센다", () => {
    const levels = lv([
      ["2026-10-26", "lesson"],
      ["2026-10-27", "lesson"],
    ]);
    expect(currentStreak(cal(), levels, "2026-10-28")).toBe(2);
  });
  it("학습일 하루를 비우면 0이 되고 최장 기록은 남는다", () => {
    const levels = lv([
      ["2026-10-19", "lesson"],
      ["2026-10-20", "lesson"],
      ["2026-10-21", "lesson"],
    ]);
    // 22(목) 비움, 23(금) 오늘
    expect(currentStreak(cal(), levels, "2026-10-23")).toBe(0);
    expect(longestStreak(cal(), levels, "2026-10-23")).toBe(3);
  });
  it("5분 버전도 연속 +1이고 잔디는 연한 칸(1)", () => {
    const levels = lv([
      ["2026-10-26", "lesson"],
      ["2026-10-27", "short"],
    ]);
    expect(currentStreak(cal(), levels, "2026-10-27")).toBe(2);
    expect(levels.get("2026-10-27")).toBe(1);
  });
  it("예약한 쉼은 빈 날로 치지 않는다", () => {
    const levels = lv([
      ["2026-10-26", "lesson"],
      ["2026-10-29", "lesson"],
    ]);
    const c = cal(["2026-10-27", "2026-10-28"]);
    expect(currentStreak(c, levels, "2026-10-29")).toBe(2);
    expect(currentStreak(cal(), levels, "2026-10-29")).toBe(1);
  });
  it("학습 요일이 아닌 날에 해도 +1이고 칸이 채워진다", () => {
    const levels = lv([
      ["2026-10-23", "lesson"],
      ["2026-10-24", "short"],
    ]);
    expect(currentStreak(cal(), levels, "2026-10-26")).toBe(2);
  });
});

describe("잔디 단계", () => {
  it("같은 날 여러 활동은 가장 진한 단계", () => {
    const levels = lv([
      ["2026-10-26", "short"],
      ["2026-10-26", "lesson_tutor"],
      ["2026-10-27", "lesson"],
      ["2026-10-28", "quiz"],
    ]);
    expect(levels.get("2026-10-26")).toBe(3);
    expect(levels.get("2026-10-27")).toBe(2);
    expect(levels.get("2026-10-28")).toBe(4);
  });
  it("7 x N 격자: 주말은 off, 쉼은 rest, 오늘, 미래, 빈 학습일 0", () => {
    const levels = lv([["2026-10-19", "lesson"]]);
    const g = grassGrid(cal(["2026-10-27"]), levels, "2026-10-28", 6);
    expect(g).toHaveLength(6);
    expect(g.every((col) => col.length === 7)).toBe(true);
    expect(g[0][0]).toEqual({ day: "2026-10-19", kind: "level", level: 2 });
    expect(g[0][1]).toEqual({ day: "2026-10-20", kind: "level", level: 0 });
    expect(g[0][5].kind).toBe("off");
    expect(g[1][1].kind).toBe("rest");
    expect(g[1][2].kind).toBe("today");
    expect(g[1][3].kind).toBe("future");
    expect(g[1][6].kind).toBe("off");
  });
});

describe("복귀 판정", () => {
  it("학습일 기준 2일 이상 비면 복귀 화면", () => {
    const levels = lv([["2026-10-22", "lesson"]]);
    // 23(금) 비움, 24·25 주말, 26(월) 비움, 27(화) 오늘 -> 학습일 2일
    expect(missedStudyDays(cal(), levels, "2026-10-27").count).toBe(2);
    expect(needsComeback(cal(), levels, "2026-10-27", null)).toBe(true);
  });
  it("학습일 1일만 비면 복귀 화면 없음(주말은 세지 않는다)", () => {
    const levels = lv([["2026-10-22", "lesson"]]);
    expect(missedStudyDays(cal(), levels, "2026-10-26").count).toBe(1);
    expect(needsComeback(cal(), levels, "2026-10-26", null)).toBe(false);
  });
  it("쉬어 가기로 예약한 날은 빈 날이 아니다", () => {
    const levels = lv([["2026-10-22", "lesson"]]);
    const c = cal(["2026-10-23", "2026-10-26"]);
    expect(needsComeback(c, levels, "2026-10-27", null)).toBe(false);
  });
  it("이번 공백에 재조정을 이미 골랐으면 다시 띄우지 않는다", () => {
    const levels = lv([["2026-10-22", "lesson"]]);
    expect(needsComeback(cal(), levels, "2026-10-27", "2026-10-27")).toBe(false);
    expect(needsComeback(cal(), levels, "2026-10-27", "2026-10-20")).toBe(true);
  });
  it("오늘 이미 학습했으면 띄우지 않는다", () => {
    const levels = lv([
      ["2026-10-22", "lesson"],
      ["2026-10-27", "short"],
    ]);
    expect(needsComeback(cal(), levels, "2026-10-27", null)).toBe(false);
  });
});

describe("재조정 3가지", () => {
  const pending = [10, 11, 12, 13, 14, 15, 16];
  it("선생님별 추천: 온 미루기, 결 압축, 새 요약", () => {
    expect(REPLAN_BY_TEACHER).toEqual({ 온: "delay", 결: "squeeze", 새: "skip" });
  });
  it("미루기: 밀린 만큼 과정이 늘고 분량은 그대로", () => {
    expect(replan("delay", 3, pending)).toMatchObject({ extraDays: 3, extraMinutes: [], merge: [], summarize: [] });
  });
  it("압축하기: 기간 그대로, 다음 레슨 3개에 5분씩", () => {
    const r = replan("squeeze", 3, pending);
    expect(r.extraDays).toBe(0);
    expect(r.merge).toEqual([10, 11, 12]);
    expect(r.extraMinutes).toEqual([
      { order: 13, minutes: 5 },
      { order: 14, minutes: 5 },
      { order: 15, minutes: 5 },
    ]);
  });
  it("압축하기: 뒤 레슨이 모자라면 붙일 수 있는 만큼만 합친다", () => {
    const r = replan("squeeze", 3, [20, 21, 22, 23]);
    expect(r.merge).toEqual([20]);
    expect(r.extraMinutes).toEqual([{ order: 23, minutes: 5 }]);
  });
  it("요약으로 넘기기: 밀린 레슨을 요약 카드로", () => {
    expect(replan("skip", 2, pending)).toMatchObject({ extraDays: 0, summarize: [10, 11] });
  });
});

describe("쉬어 가기 한도", () => {
  it("한 과정 최대 10 학습일", () => {
    expect(pauseRemaining(0)).toBe(10);
    expect(pauseRemaining(12)).toBe(0);
    const days = ["2026-10-29", "2026-10-30", "2026-11-02"];
    expect(validatePause(cal(), "2026-10-29", days, 7)).toEqual({ ok: true, days });
    expect(validatePause(cal(), "2026-10-29", days, 8).ok).toBe(false);
  });
  it("지난 날, 학습 요일이 아닌 날, 빈 선택은 막는다", () => {
    expect(validatePause(cal(), "2026-10-29", ["2026-10-28"], 0).ok).toBe(false);
    expect(validatePause(cal(), "2026-10-29", ["2026-10-31"], 0).ok).toBe(false);
    expect(validatePause(cal(), "2026-10-29", [], 0).ok).toBe(false);
    // 2주보다 먼 날(2030년 등)로 한도를 써 버리지 않게 막는다
    expect(validatePause(cal(), "2026-10-29", ["2030-01-07"], 0).ok).toBe(false);
    expect(validatePause(cal(), "2026-10-29", ["2026-11-11"], 0).ok).toBe(true);
    expect(validatePause(cal(), "2026-10-29", ["2026-11-12"], 0).ok).toBe(false);
  });
  it("dayKind", () => {
    expect(dayKind(cal(["2026-10-30"]), "2026-10-30")).toBe("rest");
    expect(dayKind(cal(), "2026-10-31")).toBe("off");
    expect(dayKind(cal(), "2026-10-29")).toBe("study");
  });
});

describe("학습 요일 변경 이력", () => {
  it("요일을 바꿔도 지난 날은 그때 요일로 판정한다", async () => {
    const { nextSchedule, studyDaysOn } = await import("./rest");
    // 주말(토·일)에 하던 사람이 수요일(10-28)에 월~금으로 바꾼다
    const weekendStart = "2026-10-24"; // 토
    const levels = lv([
      ["2026-10-24", "lesson"],
      ["2026-10-25", "lesson"],
    ]);
    const schedule = nextSchedule([], weekendStart, [0, 6], [1, 2, 3, 4, 5], "2026-10-28");
    const c: StudyCalendar = { startDate: weekendStart, studyDays: [1, 2, 3, 4, 5], restDays: new Set(), schedule };
    expect(studyDaysOn(c, "2026-10-26")).toEqual([0, 6]);
    expect(studyDaysOn(c, "2026-10-28")).toEqual([1, 2, 3, 4, 5]);
    // 월·화는 그때 학습 요일이 아니었으니 빈 날이 아니다
    expect(currentStreak(c, levels, "2026-10-28")).toBe(2);
    expect(needsComeback(c, levels, "2026-10-28", null)).toBe(false);
    // 이력 없이 지금 요일로만 보면 월·화가 빈 학습일이 되어 버린다
    const naive: StudyCalendar = { ...c, schedule: [] };
    expect(currentStreak(naive, levels, "2026-10-28")).toBe(0);
  });
  it("같은 날 여러 번 바꾸면 마지막 것만 남는다", async () => {
    const { nextSchedule } = await import("./rest");
    const a = nextSchedule([], "2026-10-19", [1, 2, 3, 4, 5], [1, 3, 5], "2026-10-28");
    const b = nextSchedule(a, "2026-10-19", [1, 3, 5], [2, 4], "2026-10-28");
    expect(b).toEqual([
      { from: "2026-10-19", days: [1, 2, 3, 4, 5] },
      { from: "2026-10-28", days: [2, 4] },
    ]);
  });
});

describe("잔디에 세는 퀴즈·마일스톤", () => {
  it("퀴즈는 주차마다 첫 응시만 센다", () => {
    expect(countedQuizDay([])).toBeNull();
    expect(countedQuizDay(["2026-10-23", "2026-11-04"])).toBe("2026-10-23");
  });
  it("마일스톤은 통과할 때까지 낸 차수만 센다", () => {
    expect(countedMilestoneDays([])).toEqual([]);
    expect(
      countedMilestoneDays([
        { day: "2026-10-28", passed: false },
        { day: "2026-10-30", passed: true },
        { day: "2026-11-04", passed: true },
      ]),
    ).toEqual(["2026-10-28", "2026-10-30"]);
    expect(countedMilestoneDays([{ day: "2026-10-28", passed: false }])).toEqual(["2026-10-28"]);
  });
});
