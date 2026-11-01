import { describe, expect, it } from "vitest";
import {
  cleanOneLiner,
  cleanRating,
  cleanReview,
  REVIEW_MAX,
  groupNotifyTargets,
  isEmail,
  planCompletion,
  SHORT_CARRY_MINUTES,
  streakChange,
  streakHeadline,
  streakSub,
  tutorStatus,
  understandingChip,
  weekStrip,
} from "./lesson";
import { grassGrid, type GrassLevel, type StudyCalendar } from "./rest";

const WEEKDAYS = [1, 2, 3, 4, 5];
// 2026-10-26 월요일
const cal: StudyCalendar = { startDate: "2026-10-19", studyDays: WEEKDAYS, restDays: new Set() };

function levels(entries: [string, GrassLevel][]) {
  return new Map(entries);
}

describe("planCompletion", () => {
  it("처음 완료하면 오늘 날짜로 적고, 5분 버전이면 다음 레슨에 5분을 붙인다", () => {
    const full = planCompletion({ status: "todo", completedDay: null }, "full", "2026-10-29");
    expect(full).toEqual({ status: "done", completedDay: "2026-10-29", firstTime: true, changed: true, carryToNext: 0 });
    const short = planCompletion({ status: "todo", completedDay: null }, "short", "2026-10-29");
    expect(short.status).toBe("short");
    expect(short.carryToNext).toBe(SHORT_CARRY_MINUTES);
  });
  it("이미 완료한 레슨은 두 번 세지 않는다", () => {
    const again = planCompletion({ status: "done", completedDay: "2026-10-28" }, "full", "2026-10-29");
    expect(again).toMatchObject({ firstTime: false, changed: false, carryToNext: 0, completedDay: "2026-10-28" });
    const shortAgain = planCompletion({ status: "short", completedDay: "2026-10-28" }, "short", "2026-10-29");
    expect(shortAgain).toMatchObject({ status: "short", changed: false, carryToNext: 0 });
  });
  it("5분 버전으로 끝낸 레슨을 전체로 다시 끝내면 done으로 올리고 날짜는 그대로 둔다", () => {
    const up = planCompletion({ status: "short", completedDay: "2026-10-28" }, "full", "2026-10-29");
    expect(up).toMatchObject({ status: "done", completedDay: "2026-10-28", firstTime: false, changed: true, carryToNext: 0 });
  });
  it("요약·합침 상태는 날짜가 없으니 처음 완료로 본다", () => {
    expect(planCompletion({ status: "summary", completedDay: null }, "full", "2026-10-29").firstTime).toBe(true);
  });
});

describe("streakChange", () => {
  it("어제까지 이어 온 기록에 오늘을 더하고, 이전 최장을 넘으면 경신", () => {
    const lv = levels([
      ["2026-10-26", 2],
      ["2026-10-27", 2],
      ["2026-10-28", 1],
      ["2026-10-29", 3],
    ]);
    const c = streakChange(cal, lv, "2026-10-29");
    expect(c).toMatchObject({ before: 3, after: 4, longestBefore: 3, longest: 4, record: true });
    expect(streakHeadline(c)).toBe("연속 학습 최장 기록 경신");
    expect(streakSub(c)).toBe("어제까지 3일 · 최장 기록 4일");
  });
  it("이전 최장보다 짧으면 경신이 아니다", () => {
    const lv = levels([
      ["2026-10-19", 2],
      ["2026-10-20", 2],
      ["2026-10-21", 2],
      ["2026-10-22", 2],
      ["2026-10-23", 2],
      ["2026-10-28", 2],
      ["2026-10-29", 2],
    ]);
    const c = streakChange(cal, lv, "2026-10-29");
    expect(c).toMatchObject({ before: 1, after: 2, longestBefore: 5, record: false });
    expect(streakHeadline(c)).toBe("연속 학습 이어 가는 중");
  });
  it("처음 시작한 날은 경신이 아니라 새 시작", () => {
    const c = streakChange(cal, levels([["2026-10-29", 2]]), "2026-10-29");
    expect(c).toMatchObject({ before: 0, after: 1, record: false });
    expect(streakHeadline(c)).toBe("새 연속 학습 시작");
  });
});

describe("weekStrip", () => {
  it("오늘이 든 주 7칸을 월~일로 돌려준다", () => {
    const lv = levels([["2026-10-29", 2]]);
    const grid = grassGrid(cal, lv, "2026-10-29", 3);
    const strip = weekStrip(grid, "2026-10-29");
    expect(strip.map((c) => c.label)).toEqual(["월", "화", "수", "목", "금", "토", "일"]);
    expect(strip[0].day).toBe("2026-10-26");
    const t = strip.find((c) => c.today)!;
    expect(t).toMatchObject({ day: "2026-10-29", kind: "today", level: 2 });
    expect(strip[4].kind).toBe("future");
    expect(strip[5].kind).toBe("off");
  });
});

describe("understandingChip / tutorStatus", () => {
  it("첫 질문은 부분 이해, 답한 뒤 부분은 거의 이해, 이해는 이해함", () => {
    expect(understandingChip("부분", 0)).toEqual({ label: "부분 이해", tone: "partial" });
    expect(understandingChip("부분", 1)).toEqual({ label: "거의 이해", tone: "almost" });
    expect(understandingChip("미흡", 2)).toEqual({ label: "부분 이해", tone: "partial" });
    expect(understandingChip("이해", 2)).toEqual({ label: "이해함", tone: "good" });
    expect(understandingChip(null, 0).label).toBe("부분 이해");
  });
  it("상태 줄", () => {
    expect(tutorStatus({ thinking: true, done: false, aiTurns: 1 })).toBe("생각하는 중");
    expect(tutorStatus({ thinking: false, done: true, aiTurns: 3 })).toBe("이해도 확인 끝");
    expect(tutorStatus({ thinking: false, done: false, aiTurns: 2 })).toBe("이해도 확인 · 질문 2 / 2");
    expect(tutorStatus({ thinking: false, done: false, aiTurns: 0 })).toBe("이해도 확인 · 질문 1 / 2");
  });
});

describe("groupNotifyTargets", () => {
  const base = { sentToday: 0, resting: false, enabled: true, already: false };
  it("하루 2회, 쉬는 중, 알림 끔, 이미 받음을 거른다", () => {
    const ids = groupNotifyTargets(
      [
        { ...base, id: "a" },
        { ...base, id: "b", sentToday: 2 },
        { ...base, id: "c", resting: true },
        { ...base, id: "d", enabled: false },
        { ...base, id: "e", already: true },
        { ...base, id: "f", sentToday: 1 },
      ],
      21,
    );
    expect(ids).toEqual(["a", "f"]);
  });
  it("밤 11시~아침 7시에는 아무에게도 보내지 않는다", () => {
    expect(groupNotifyTargets([{ ...base, id: "a" }], 23)).toEqual([]);
    expect(groupNotifyTargets([{ ...base, id: "a" }], 6)).toEqual([]);
    expect(groupNotifyTargets([{ ...base, id: "a" }], 7)).toEqual(["a"]);
  });
});

describe("cleanRating / cleanReview", () => {
  it("평점은 1~5 정수만 받는다", () => {
    expect(cleanRating("4")).toBe(4);
    expect(cleanRating("1")).toBe(1);
    expect(cleanRating("5")).toBe(5);
    for (const v of ["0", "6", "3.5", "", "별", null, undefined, 4]) expect(cleanRating(v)).toBeNull();
  });
  it("후기는 줄바꿈은 두고 앞뒤 공백을 지우며, 비면 null", () => {
    expect(cleanReview("  예시가 좋았어요\n조금 길었어요  ")).toBe("예시가 좋았어요\n조금 길었어요");
    expect(cleanReview("   ")).toBeNull();
    expect(cleanReview(3)).toBeNull();
    expect(cleanReview("가".repeat(1000))?.length).toBe(REVIEW_MAX);
  });
});

describe("cleanOneLiner / isEmail", () => {
  it("공백을 정리하고 비면 null", () => {
    expect(cleanOneLiner("  현금은   늦게 온다 ")).toBe("현금은 늦게 온다");
    expect(cleanOneLiner("   ")).toBeNull();
    expect(cleanOneLiner(3)).toBeNull();
    expect(cleanOneLiner("가".repeat(300))?.length).toBe(120);
  });
  it("이메일 형식", () => {
    expect(isEmail("me@example.com")).toBe(true);
    expect(isEmail("me@example")).toBe(false);
    expect(isEmail("no at")).toBe(false);
  });
});
