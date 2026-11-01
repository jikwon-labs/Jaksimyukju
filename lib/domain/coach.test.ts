import { describe, expect, it } from "vitest";
import { coachNotes, notifyMinutesOf, reminderDue } from "./coach";

const base = { today: "2026-10-29", missedDay: null as string | null, missed: 0, studiedToday: false, restingToday: false, sent: [], retroDoneThisWeek: false, studyDaysThisWeek: 5 };

describe("앱을 열 때 선생님 알림", () => {
  it("학습일 1일 빔이면 하루 한 번", () => {
    const one = { ...base, missed: 1, missedDay: "2026-10-28" };
    expect(coachNotes(one).map((n) => [n.key, n.yesterday])).toEqual([["missed_one", true]]);
    expect(coachNotes({ ...one, sent: [{ key: "missed_one", day: "2026-10-29" }] })).toEqual([]);
    expect(coachNotes({ ...one, studiedToday: true })).toEqual([]);
  });
  it("빈 학습일 하나에 한 번만: 사이에 쉬는 요일이 껴도 다음 날들에 반복하지 않는다", () => {
    // 월·수·금 학습, 수(10-28) 빔. 목에 한 번 남기면 금·토·일에는 다시 안 남긴다
    const sent = [{ key: "missed_one", day: "2026-10-29" }];
    for (const today of ["2026-10-30", "2026-10-31", "2026-11-01"]) {
      const notes = coachNotes({ ...base, today, missed: 1, missedDay: "2026-10-28", sent }).filter((n) => n.key === "missed_one");
      expect(notes, today).toEqual([]);
    }
    // 아직 안 남겼으면 금요일에 남기되 "어제" 문구는 쓰지 않는다
    const fri = coachNotes({ ...base, today: "2026-10-30", missed: 1, missedDay: "2026-10-28" });
    expect(fri[0]).toMatchObject({ key: "missed_one", yesterday: false, dedupe: "missed_one:2026-10-28" });
  });
  it("2일 이상은 복귀 화면이 맡으므로 남기지 않는다", () => {
    expect(coachNotes({ ...base, missed: 2, missedDay: "2026-10-27" })).toEqual([]);
  });
  it("쉬는 날에는 아무것도 남기지 않는다", () => {
    expect(coachNotes({ ...base, missed: 1, missedDay: "2026-10-28", restingToday: true })).toEqual([]);
  });
  it("일요일에는 주간 회고 알림을 한 주에 한 번", () => {
    const sun = { ...base, today: "2026-11-01" };
    expect(coachNotes(sun).map((n) => n.key)).toEqual(["retro"]);
    expect(coachNotes({ ...sun, retroDoneThisWeek: true })).toEqual([]);
    expect(coachNotes({ ...sun, sent: [{ key: "retro", day: "2026-11-01" }] })).toEqual([]);
    expect(coachNotes({ ...base, today: "2026-10-31" })).toEqual([]); // 토요일
  });
  it("이번 주에 지난 학습일이 없으면(일요일에 막 시작한 과정) 회고 알림을 남기지 않는다", () => {
    const sun = { ...base, today: "2026-11-01" };
    expect(coachNotes({ ...sun, studyDaysThisWeek: 0 })).toEqual([]);
  });
});

describe("스케줄러의 학습 시간 알림", () => {
  // 2026-10-29는 목요일(학습일)
  const due = { ...base, studyDay: true, remind: true };

  it("학습 시각 뒤 비어 있는 학습일에 한 번", () => {
    expect(coachNotes(due).map((n) => n.key)).toEqual(["study"]);
    expect(coachNotes(due)[0].dedupe).toBe("study:2026-10-29");
  });
  it("앱을 열 때(remind 없음), 이미 했을 때, 쉬는 요일, 쉬어 가기 날에는 없다", () => {
    expect(coachNotes({ ...due, remind: false })).toEqual([]);
    expect(coachNotes({ ...due, studiedToday: true })).toEqual([]);
    expect(coachNotes({ ...due, studyDay: false })).toEqual([]);
    expect(coachNotes({ ...due, restingToday: true })).toEqual([]);
  });
  it("같은 날 이미 남겼으면 다시 남기지 않는다", () => {
    expect(coachNotes({ ...due, sent: [{ key: "study", day: "2026-10-29" }] })).toEqual([]);
    expect(coachNotes({ ...due, sent: [{ key: "study", day: "2026-10-28" }] }).map((n) => n.key)).toEqual(["study"]);
  });
  it("알림 시각은 분까지 본다(21:30이면 21:00 tick에는 아직)", () => {
    expect(notifyMinutesOf("21:30")).toBe(1290);
    expect(notifyMinutesOf("bad")).toBe(1260);
    expect(reminderDue(21 * 60, "21:30")).toBe(false);
    expect(reminderDue(21 * 60 + 30, "21:30")).toBe(true);
  });
  it("밤 11시 이후 알림 시각은 22:30에 보낸다(조용한 시간에 막혀 영영 안 가지 않게)", () => {
    expect(reminderDue(22 * 60 + 29, "23:00")).toBe(false);
    expect(reminderDue(22 * 60 + 30, "23:00")).toBe(true);
  });
});
