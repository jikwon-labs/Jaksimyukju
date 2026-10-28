import { describe, expect, it } from "vitest";
import { buildCourseView, lessonsPerWeek, shortPath, stepsToMilestone, type WeekInput } from "./course";
import { canNotify, canNudge, isQuietHour } from "./limits";
import { curve, mapLayout, MAP_OFF, nodeCenter, popoverTop } from "./map";

const week = (index: number, statuses: ("todo" | "done" | "short")[], quiz: number | null, ms: boolean): WeekInput => ({
  index,
  goal: `주차 ${index}`,
  milestoneTitle: `요약 ${index}`,
  lessons: statuses.map((status, i) => ({ id: `l${index}${i}`, order: (index - 1) * 4 + i, title: `레슨 ${i + 1}`, status, minutes: 10 })),
  quizScore: quiz,
  milestoneDone: ms,
});

describe("과정 칸 상태", () => {
  const weeks = [
    week(1, ["done", "done", "done", "done"], 80, true),
    week(2, ["done", "done", "short", "todo"], null, false),
    week(3, ["todo", "todo", "todo", "todo"], null, false),
    week(4, ["todo", "todo", "todo", "todo"], null, false),
  ];
  const v = buildCourseView(weeks, [1, 2, 3, 4, 5]);
  it("레슨 4 + 퀴즈 + 마일스톤, 요일 글자", () => {
    expect(lessonsPerWeek(5)).toBe(4);
    expect(v.weeks[0].steps.map((s) => s.kind)).toEqual(["lesson", "lesson", "lesson", "lesson", "quiz", "goal"]);
    expect(v.weeks[0].steps.map((s) => s.day)).toEqual(["월", "화", "수", "목", "", "금"]);
  });
  it("첫 미완료 칸이 오늘, 5분 버전은 five, 다음 주차는 잠김", () => {
    expect(v.today?.id).toBe("2-3");
    expect(v.weeks[1].steps.map((s) => s.state)).toEqual(["done", "done", "five", "today", "todo", "todo"]);
    expect(v.weeks[2].steps.every((s) => s.state === "lock")).toBe(true);
    expect(v.weeks.map((w) => w.status)).toEqual(["done", "current", "todo", "todo"]);
  });
  it("다음 주차까지만 칸을 보여 준다", () => {
    expect(v.weeks.map((w) => w.far)).toEqual([false, false, false, true]);
  });
  it("퀴즈 점수 표시와 진행률", () => {
    expect(v.weeks[0].steps[4].note).toBe("80점");
    expect(v.lessonsDone).toBe(7);
    expect(v.lessonsTotal).toBe(16);
  });
  it("짧은 길 5칸과 마일스톤까지 남은 칸", () => {
    expect(shortPath(v).map((s) => s.state)).toEqual(["done", "five", "today", "todo", "todo"]);
    expect(stepsToMilestone(v)).toBe(2);
  });
  it("모두 끝나면 finished", () => {
    const all = buildCourseView([week(1, ["done"], 100, true)], [1, 5]);
    expect(all.finished).toBe(true);
    expect(all.today).toBeNull();
  });
});

describe("지도 좌표", () => {
  it("지그재그 오프셋과 줄 간격 92", () => {
    expect(MAP_OFF).toEqual([0, 56, 84, 56, 0, -56, -84, -56]);
    expect(nodeCenter(0)).toEqual([175, 70]);
    expect(nodeCenter(3)).toEqual([231, 346]);
    expect(nodeCenter(9)).toEqual([231, 24 + 9 * 92 + 46]);
  });
  it("목업 예시: 6칸 주차, 오늘 3번째 칸", () => {
    const m = mapLayout(["lesson", "lesson", "lesson", "lesson", "quiz", "goal"], 3, 3);
    expect(m.height).toBe(600);
    expect(m.nodes.map((n) => n.cy)).toEqual([70, 162, 254, 346, 438, 530]);
    expect(m.nodes.map((n) => n.cx)).toEqual([175, 231, 259, 231, 175, 119]);
    expect(m.char).toEqual({ left: 107, top: 310 });
    expect(m.nodes[5].size).toBe(76);
    expect(popoverTop(m.nodes[3])).toBe(346 + 32 + 14);
  });
  it("오프셋이 음수인 칸이면 선생님은 오른쪽", () => {
    const m = mapLayout(["lesson", "lesson", "lesson", "lesson", "lesson", "lesson", "goal"], 5, 5);
    expect(m.char).toEqual({ left: 119 + 52, top: 24 + 5 * 92 + 46 - 36 });
  });
  it("길 경로", () => {
    const pts = [nodeCenter(0), nodeCenter(1)];
    expect(curve(pts, 0, 1)).toBe("M175 70 C175 116 231 116 231 162");
    expect(curve(pts, 1, 0)).toBe("");
  });
});

describe("알림 제한", () => {
  it("밤 11시부터 아침 7시까지 금지", () => {
    expect(isQuietHour(23)).toBe(true);
    expect(isQuietHour(6)).toBe(true);
    expect(isQuietHour(7)).toBe(false);
    expect(isQuietHour(22)).toBe(false);
  });
  it("하루 최대 2회, 쉬는 중·꺼 둠은 보내지 않는다", () => {
    expect(canNotify({ hour: 21, sentToday: 1 })).toEqual({ ok: true });
    expect(canNotify({ hour: 21, sentToday: 2 })).toEqual({ ok: false, reason: "daily_max" });
    expect(canNotify({ hour: 23, sentToday: 0 })).toEqual({ ok: false, reason: "quiet" });
    expect(canNotify({ hour: 12, sentToday: 0, resting: true })).toEqual({ ok: false, reason: "resting" });
    expect(canNotify({ hour: 12, sentToday: 0, enabled: false })).toEqual({ ok: false, reason: "muted" });
  });
});

describe("콕 찌르기", () => {
  const base = { fromId: "a", toId: "b", today: "2026-10-29", sentDays: [] as string[], targetResting: false, targetStudiedToday: false };
  it("하루 1번", () => {
    expect(canNudge(base)).toEqual({ ok: true });
    expect(canNudge({ ...base, sentDays: ["2026-10-29"] })).toEqual({ ok: false, reason: "already" });
    expect(canNudge({ ...base, sentDays: ["2026-10-28"] })).toEqual({ ok: true });
  });
  it("쉬는 사람, 오늘 한 사람, 나 자신은 막는다", () => {
    expect(canNudge({ ...base, targetResting: true }).ok).toBe(false);
    expect(canNudge({ ...base, targetStudiedToday: true }).ok).toBe(false);
    expect(canNudge({ ...base, toId: "a" }).ok).toBe(false);
  });
});
