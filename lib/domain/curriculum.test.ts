import { describe, expect, it } from "vitest";
import { buildCourseView, type WeekInput } from "./course";
import {
  bannerMeta,
  defaultOpenWeeks,
  listDays,
  maskLocked,
  nodeLabel,
  popoverInfo,
  roadIndexes,
  studyDaysLabel,
  weekMeta,
} from "./curriculum";
import { feedbackTitle, quizDoneCount, scoreQuiz } from "./quiz";
import { nextCourses, nextLevel, quizAverage, stepsLeft } from "./finish";
import { initialStage, normalizeFeedback, storedFeedback } from "./milestone";

const week = (index: number, statuses: ("todo" | "done" | "short")[], quiz: number | null, ms: boolean): WeekInput => ({
  index,
  goal: `주차 ${index}`,
  milestoneTitle: `요약 ${index}`,
  lessons: statuses.map((status, i) => ({ id: `l${index}${i}`, order: (index - 1) * 4 + i, title: `레슨 ${i + 1}`, status, minutes: 10 })),
  quizScore: quiz,
  milestoneDone: ms,
});

const v = buildCourseView(
  [
    week(1, ["done", "done", "done", "done"], 80, true),
    week(2, ["done", "done", "short", "todo"], null, false),
    week(3, ["todo", "todo", "todo", "todo"], null, false),
    week(4, ["todo", "todo", "todo", "todo"], null, false),
    week(5, ["todo", "todo", "todo"], null, false),
  ],
  [1, 2, 3, 4, 5],
);

describe("커리큘럼 배너와 펼침", () => {
  it("주차 보조 문구", () => {
    expect(weekMeta(v.weeks[0], false)).toBe("레슨 4/4 · 퀴즈 80점");
    expect(weekMeta(v.weeks[1], false)).toBe("레슨 3/4");
    expect(weekMeta(v.weeks[2], false)).toBe("레슨 4개");
    expect(weekMeta(v.weeks[4], true)).toBe("레슨 3개 · 최종");
  });
  it("먼 주차는 열림 안내만", () => {
    expect(bannerMeta(v.weeks[2], false)).toBe("레슨 4개");
    expect(bannerMeta(v.weeks[3], false)).toBe("3주차 뒤 열림");
    expect(bannerMeta(v.weeks[4], true)).toBe("4주차 뒤 열림");
  });
  it("기본 펼침: 진행 중과 바로 다음 주차", () => {
    expect(defaultOpenWeeks(v.weeks, v.currentWeek, false)).toEqual({ 1: false, 2: true, 3: true, 4: false, 5: false });
  });
});

describe("칸 설명 카드", () => {
  const w2 = v.weeks[1].steps;
  it("오늘 레슨", () => {
    const p = popoverInfo(w2[3]);
    expect(p.kicker).toBe("2주차 목요일 레슨 · 오늘");
    expect(p.meta).toBe("약 10분 · 설명과 튜터 질문 3개");
    expect(p.cta).toBe("학습 시작");
    expect(p.href).toBe("/lesson/l23");
    expect(p.hot).toBe(true);
  });
  it("5분 버전, 퀴즈, 마일스톤, 잠김", () => {
    expect(popoverInfo(w2[2]).meta).toBe("5분 버전으로 끝냈어요 · 전체 버전 약 10분");
    expect(popoverInfo(w2[2]).cta).toBe("다시 보기");
    expect(popoverInfo(w2[4]).kicker).toBe("2주차 퀴즈 · 열림");
    expect(popoverInfo(w2[4]).cta).toBe("퀴즈 풀기");
    expect(popoverInfo(w2[4]).href).toBe("/quiz/2");
    expect(popoverInfo(w2[5]).cta).toBe("결과물 제출하기");
    expect(popoverInfo(w2[5]).href).toBe("/milestone/2");
    expect(popoverInfo(v.weeks[0].steps[4]).meta).toBe("점수 80점 · 틀린 문제만 다시 풀 수 있어요");
    const lock = popoverInfo(v.weeks[2].steps[0]);
    expect(lock.cta).toBe("");
    expect(lock.hot).toBe(false);
    expect(lock.meta).toBe("앞 칸을 마치면 열려요. 진도에 맞춰 선생님이 내용을 다듬어요.");
  });
  it("잠긴 칸은 제목과 요일을 감춘다", () => {
    const m = maskLocked(v.weeks[2].steps);
    expect(m.map((x) => x.title)).toEqual(["레슨 1", "레슨 2", "레슨 3", "레슨 4", "주차 퀴즈 3문제", "마일스톤"]);
    expect(m[0].day).toBe("");
    expect(popoverInfo(m[0]).kicker).toBe("3주차 레슨 · 잠김");
    expect(maskLocked(v.weeks[1].steps)).toEqual(v.weeks[1].steps);
  });
  it("칸 이름", () => {
    expect(nodeLabel(w2[3])).toBe("2주차 레슨 레슨 4, 오늘");
  });
  it("길 끝 칸", () => {
    expect(roadIndexes(w2)).toEqual({ lastDone: 3, todayIdx: 3 });
    expect(roadIndexes(v.weeks[2].steps)).toEqual({ lastDone: -1, todayIdx: -1 });
  });
});

describe("목록 보기 날짜 줄", () => {
  it("퀴즈를 빼고 태그를 단다", () => {
    const rows = listDays(v.weeks[1], v.currentWeek);
    expect(rows.map((r) => r.day)).toEqual(["월", "화", "수", "목", "금"]);
    expect(rows.map((r) => r.tag)).toEqual(["", "", "5분 버전", "오늘", ""]);
    expect(listDays(v.weeks[0], v.currentWeek)[4].tag).toBe("제출");
  });
  it("열리지 않은 주차는 빈 줄", () => {
    expect(listDays(v.weeks[2], v.currentWeek)).toEqual([]);
  });
  it("요일 표시", () => {
    expect(studyDaysLabel([1, 2, 3, 4, 5])).toBe("월–금");
    expect(studyDaysLabel([5, 1, 3])).toBe("월·수·금");
    expect(studyDaysLabel([6, 0])).toBe("토·일");
  });
});

describe("퀴즈 채점", () => {
  const qs = [
    { answer: 0, choices: ["a", "b", "c", "d"] },
    { answer: 1, choices: ["a", "b", "c", "d"] },
    { answer: 2, choices: ["a", "b", "c", "d"] },
  ];
  it("맞힌 개수와 답 기록", () => {
    expect(scoreQuiz(qs, [0, 1, 0])).toEqual({
      score: 2,
      answers: [
        { choice: 0, correct: true },
        { choice: 1, correct: true },
        { choice: 0, correct: false },
      ],
    });
  });
  it("잘못된 입력은 거부", () => {
    expect(scoreQuiz(qs, [0, 1])).toBeNull();
    expect(scoreQuiz(qs, [0, 1, 4])).toBeNull();
    expect(scoreQuiz(qs, [0, 1, 1.5])).toBeNull();
  });
  it("피드백 제목과 진행 칸", () => {
    expect(feedbackTitle(true, 0)).toBe("정답이에요");
    expect(feedbackTitle(false, 2)).toBe("아쉬워요. 정답은 C예요");
    expect(quizDoneCount(0, false)).toBe(0);
    expect(quizDoneCount(2, true)).toBe(3);
    expect(quizDoneCount(3, false)).toBe(3);
  });
});

describe("마일스톤 피드백 다듬기", () => {
  const labels = ["세 활동을 나눴다", "숫자 근거가 있다", "한 줄 결론이 있다"];
  it("고칠 점은 3개까지, 기준 라벨은 주차 기준", () => {
    const fb = normalizeFeedback(
      {
        headline: " 좋아요 ",
        criteria: [
          { label: "x", status: "충족" },
          { label: "y", status: "빠짐" },
        ],
        fixes: ["1", "2", "3", "4", " "],
        passed: false,
      },
      labels,
    );
    expect(fb.headline).toBe("좋아요");
    expect(fb.criteria.map((c) => c.label)).toEqual(labels);
    expect(fb.criteria.map((c) => c.status)).toEqual(["충족", "빠짐", "빠짐"]);
    expect(fb.fixes).toEqual(["1", "2", "3"]);
  });
  it("기준이 하나라도 빠지면 통과가 아니다", () => {
    const fb = normalizeFeedback({ headline: "h", criteria: [{ label: labels[0], status: "충족" }], fixes: [], passed: true }, labels);
    expect(fb.passed).toBe(false);
  });
  it("통과하면 고칠 점을 비운다", () => {
    const fb = normalizeFeedback(
      { headline: "h", criteria: labels.map((label) => ({ label, status: "충족" as const })), fixes: ["x"], passed: true },
      labels,
    );
    expect(fb.passed).toBe(true);
    expect(fb.fixes).toEqual([]);
  });
  it("저장된 통과 기록은 모두 충족", () => {
    const fb = storedFeedback({ headline: "완벽해요.", criteria: [], fixes: [], passed: true }, labels);
    expect(fb.passed).toBe(true);
    expect(fb.criteria.map((c) => c.status)).toEqual(["충족", "충족", "충족"]);
    expect(storedFeedback({ headline: "h", criteria: [], fixes: ["a"], passed: false }, labels).fixes).toEqual(["a"]);
  });
  it("처음 단계", () => {
    expect(initialStage(null)).toBe("edit");
    expect(initialStage({ headline: "", criteria: [], fixes: [], passed: true })).toBe("passed");
    expect(initialStage({ headline: "", criteria: [], fixes: ["a"], passed: false })).toBe("feedback");
  });
});

describe("목적지 도착", () => {
  it("수준을 한 칸 올린다", () => {
    expect(nextLevel("처음이에요")).toBe("조금 알아요");
    expect(nextLevel("조금 알아요")).toBe("꽤 알아요");
    expect(nextLevel("꽤 알아요")).toBe("꽤 알아요");
  });
  it("다음 과정은 주제와 수준을 이어받는다", () => {
    const xs = nextCourses("재무제표 읽기", "처음이에요");
    expect(xs[0].title).toBe("재무제표 주석 읽기");
    const q = new URLSearchParams(xs[0].href.split("?")[1]);
    expect(xs[0].href.startsWith("/start/topic?")).toBe(true);
    expect(q.get("topic")).toBe("재무제표 주석 읽기");
    expect(q.get("level")).toBe("조금 알아요");
    expect(nextCourses("파이썬 기초", "조금 알아요")[0].title).toBe("파이썬 기초 한 걸음 더");
  });
  it("퀴즈 평균과 남은 칸", () => {
    expect(quizAverage([67, 100, null])).toBe(84);
    expect(quizAverage([null])).toBeNull();
    expect(stepsLeft(v.weeks)).toBe(v.weeks.flatMap((w) => w.steps).length - 6 - 3);
  });
});
