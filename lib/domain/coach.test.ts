import { describe, expect, it } from "vitest";
import { coachNotes } from "./coach";

const base = { today: "2026-10-29", missed: 0, studiedToday: false, restingToday: false, sent: [], retroDoneThisWeek: false };

describe("앱을 열 때 선생님 알림", () => {
  it("학습일 1일 빔이면 하루 한 번", () => {
    expect(coachNotes({ ...base, missed: 1 }).map((n) => n.key)).toEqual(["missed_one"]);
    expect(coachNotes({ ...base, missed: 1, sent: [{ key: "missed_one", day: "2026-10-29" }] })).toEqual([]);
    expect(coachNotes({ ...base, missed: 1, studiedToday: true })).toEqual([]);
  });
  it("2일 이상은 복귀 화면이 맡으므로 남기지 않는다", () => {
    expect(coachNotes({ ...base, missed: 2 })).toEqual([]);
  });
  it("쉬는 날에는 아무것도 남기지 않는다", () => {
    expect(coachNotes({ ...base, missed: 1, restingToday: true })).toEqual([]);
  });
  it("일요일에는 주간 회고 알림을 한 주에 한 번", () => {
    const sun = { ...base, today: "2026-11-01" };
    expect(coachNotes(sun).map((n) => n.key)).toEqual(["retro"]);
    expect(coachNotes({ ...sun, retroDoneThisWeek: true })).toEqual([]);
    expect(coachNotes({ ...sun, sent: [{ key: "retro", day: "2026-11-01" }] })).toEqual([]);
    expect(coachNotes({ ...base, today: "2026-10-31" })).toEqual([]); // 토요일
  });
});
