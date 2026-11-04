import { describe, expect, it } from "vitest";
import {
  firstSchedule,
  grassNote,
  isDue,
  nextDueDay,
  nextLabel,
  nextSchedule,
  pickDue,
  REVIEW_SESSION_MAX,
  reviewDayLabel,
  reviewEntryLabel,
  reviewLine,
  reviewMinutes,
  skipRestDays,
  sourceAfterAnswer,
  sourceLabel,
  tutorNeedsReview,
  validQuestion,
  wrongIndexes,
} from "./review";

const none = new Set<string>();
const today = "2026-11-04"; // 수요일

describe("간격 일정", () => {
  it("새 카드는 1일 뒤", () => {
    expect(firstSchedule(today, none)).toEqual({ step: 0, dueDay: "2026-11-05", retired: false });
  });
  it("맞히면 1일 -> 3일 -> 7일 -> 14일, 14일 간격을 맞히면 졸업", () => {
    const a = nextSchedule(0, true, today, none);
    expect(a).toEqual({ step: 1, dueDay: "2026-11-07", retired: false });
    const b = nextSchedule(1, true, today, none);
    expect(b).toEqual({ step: 2, dueDay: "2026-11-11", retired: false });
    const c = nextSchedule(2, true, today, none);
    expect(c).toEqual({ step: 3, dueDay: "2026-11-18", retired: false });
    expect(nextSchedule(3, true, today, none).retired).toBe(true);
  });
  it("틀리면 어느 간격에서든 1일로 돌아간다", () => {
    for (const step of [0, 1, 2, 3]) {
      expect(nextSchedule(step, false, today, none)).toEqual({ step: 0, dueDay: "2026-11-05", retired: false });
    }
  });
  it("밀린 카드도 푼 날부터 센다", () => {
    expect(nextSchedule(1, true, "2026-11-20", none).dueDay).toBe("2026-11-27");
  });
  it("쉬어 가기 날로 잡히면 쉬지 않는 첫 날로 미룬다", () => {
    const rest = new Set(["2026-11-05", "2026-11-06"]);
    expect(firstSchedule(today, rest).dueDay).toBe("2026-11-07");
    expect(nextSchedule(0, true, "2026-11-04", new Set(["2026-11-07"])).dueDay).toBe("2026-11-08");
    expect(skipRestDays("2026-11-10", rest)).toBe("2026-11-10");
  });
});

describe("오늘 풀 카드", () => {
  const at = (n: number) => new Date(Date.UTC(2026, 10, 1, 0, n));
  const cards = [
    { id: "a", source: "lesson", dueDay: "2026-11-04", retired: false, createdAt: at(1) },
    { id: "b", source: "quiz", dueDay: "2026-11-04", retired: false, createdAt: at(2) },
    { id: "c", source: "lesson", dueDay: "2026-11-02", retired: false, createdAt: at(3) },
    { id: "d", source: "tutor", dueDay: "2026-11-04", retired: false, createdAt: at(4) },
    { id: "e", source: "lesson", dueDay: "2026-11-05", retired: false, createdAt: at(5) },
    { id: "f", source: "lesson", dueDay: "2026-11-01", retired: true, createdAt: at(6) },
  ];
  it("오래 밀린 것부터, 같은 날이면 튜터·퀴즈·레슨 순. 미래 카드와 졸업 카드는 뺀다", () => {
    expect(pickDue(cards, today, false).map((c) => c.id)).toEqual(["c", "d", "b", "a"]);
  });
  it("쉬는 날에는 복습할 카드가 없다(다음 날로 넘어간다)", () => {
    expect(pickDue(cards, today, true)).toEqual([]);
    expect(isDue(cards[0], today, true)).toBe(false);
    expect(pickDue(cards, "2026-11-05", false).map((c) => c.id)).toContain("a");
  });
  it(`한 번에 ${REVIEW_SESSION_MAX}장까지`, () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `x${i}`, source: "lesson", dueDay: today, retired: false, createdAt: at(i) }));
    expect(pickDue(many, today, false)).toHaveLength(REVIEW_SESSION_MAX);
  });
  it("다음 복습 날", () => {
    expect(nextDueDay(cards, today)).toBe("2026-11-05");
    expect(nextDueDay([], today)).toBeNull();
    // 내일이 쉬어 가기 날이면 그다음 날로 안내한다
    expect(nextDueDay(cards, today, new Set(["2026-11-05"]))).toBe("2026-11-06");
  });
});

describe("문구", () => {
  it("시간은 한 장에 30초, 최소 1분", () => {
    expect(reviewMinutes(1)).toBe(1);
    expect(reviewMinutes(4)).toBe(2);
    expect(reviewMinutes(6)).toBe(3);
    expect(reviewEntryLabel(6)).toBe("오늘 복습 6개 · 3분");
  });
  it("다음 복습 안내", () => {
    expect(nextLabel({ step: 0, dueDay: "2026-11-05", retired: false }, today)).toBe("내일 한 번 더 볼게요");
    expect(nextLabel({ step: 2, dueDay: "2026-11-11", retired: false }, today)).toBe("7일 뒤에 다시 볼게요");
    expect(nextLabel({ step: 3, dueDay: today, retired: true }, today)).toBe("이제 오래 기억할 거예요");
  });
  it("출처, 날짜, 알림 문구", () => {
    expect(sourceLabel("quiz", "2주차 퀴즈")).toBe("2주차 퀴즈에서 틀린 문제");
    expect(sourceLabel("tutor", "현금흐름")).toBe("헷갈렸던 개념 · 현금흐름");
    expect(sourceLabel("lesson", "현금흐름")).toBe("지난 레슨 · 현금흐름");
    expect(reviewDayLabel("2026-11-06")).toBe("11월 6일 금요일");
    expect(reviewLine("결", 3)).toBe("복습 3개 남았습니다. 3분이면 됩니다.");
  });
  it("복습은 잔디에 세지 않는다: 레슨이 남은 학습일에는 레슨으로 이끈다", () => {
    expect(grassNote(true, false)).toContain("오늘 칸은 레슨으로");
    expect(grassNote(true, true)).not.toContain("오늘 칸은 레슨으로");
    expect(grassNote(false, false)).not.toContain("오늘 칸은 레슨으로");
  });
});

describe("카드 출처", () => {
  it("퀴즈에서 틀린 문제 번호", () => {
    expect(wrongIndexes([{ correct: true }, { correct: false }, { correct: false }])).toEqual([1, 2]);
  });
  it("튜터 확인이 미흡·부분으로 끝나면 헷갈린 개념", () => {
    expect(tutorNeedsReview("미흡")).toBe(true);
    expect(tutorNeedsReview("부분")).toBe(true);
    expect(tutorNeedsReview("이해")).toBe(false);
    expect(tutorNeedsReview(null)).toBe(false);
  });
  it("문제 모양 확인", () => {
    const ok = { q: "핵심은?", choices: ["a", "b", "c", "d"], answer: 2, why: "이유" };
    expect(validQuestion(ok)).toBe(true);
    expect(validQuestion({ ...ok, answer: 4 })).toBe(false);
    expect(validQuestion({ ...ok, choices: ["a", "a", "b", "c"] })).toBe(false);
    expect(validQuestion({ ...ok, q: " " })).toBe(false);
    expect(validQuestion(null)).toBe(false);
  });
});

describe("헷갈린 개념 카드를 맞힌 뒤", () => {
  it("헷갈린 개념 카드를 맞히면 레슨 카드로 돌아가고, 틀리면 그대로다", () => {
    expect(sourceAfterAnswer("tutor", true)).toBe("lesson");
    expect(sourceAfterAnswer("tutor", false)).toBe("tutor");
  });
  it("레슨·퀴즈 카드는 출처가 바뀌지 않는다", () => {
    expect(sourceAfterAnswer("lesson", true)).toBe("lesson");
    expect(sourceAfterAnswer("quiz", true)).toBe("quiz");
    expect(sourceAfterAnswer("quiz", false)).toBe("quiz");
  });
});
