import { describe, expect, it } from "vitest";
import {
  groupByDay,
  inviteExpired,
  inviteExpiry,
  inviteLeftLabel,
  inviteUrl,
  memberStatus,
  newInviteCode,
  notifIcon,
  notifTimeLabel,
  recentStrip,
} from "./social";
import type { GrassLevel, StudyCalendar } from "./rest";

const cal = (rest: string[] = []): StudyCalendar => ({
  startDate: "2026-10-19",
  studyDays: [1, 2, 3, 4, 5],
  restDays: new Set(rest),
});

describe("invite", () => {
  it("makes a 4-2 code without confusing letters", () => {
    const code = newInviteCode(() => 0.5);
    expect(code).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{2}$/);
    for (let i = 0; i < 50; i++) expect(newInviteCode()).not.toMatch(/[01OI]/);
  });
  it("expires after 7 days", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const exp = inviteExpiry(now);
    expect(exp.toISOString()).toBe("2026-11-05T12:00:00.000Z");
    expect(inviteExpired(exp, now)).toBe(false);
    expect(inviteExpired(exp, new Date("2026-11-05T12:00:00Z"))).toBe(true);
    expect(inviteLeftLabel(exp, now)).toBe("7일 뒤 만료");
    expect(inviteLeftLabel(new Date(now.getTime() + 2 * 3_600_000), now)).toBe("2시간 뒤 만료");
    expect(inviteLeftLabel(now, now)).toBe("만료된 링크예요");
  });
  it("builds the url", () => {
    expect(inviteUrl("http://localhost:3100/", "7KQ2-MX")).toBe("http://localhost:3100/invite/7KQ2-MX");
  });
});

describe("recentStrip", () => {
  it("covers last week Monday through this Sunday", () => {
    const levels = new Map<string, GrassLevel>([
      ["2026-10-19", 2],
      ["2026-10-20", 3],
      ["2026-10-28", 1],
    ]);
    const s = recentStrip(cal(["2026-10-30"]), levels, "2026-10-29");
    expect(s).toHaveLength(14);
    expect(s[0]).toEqual({ day: "2026-10-19", kind: "level", level: 2 });
    expect(s[2].kind).toBe("missed"); // 수 10-21
    expect(s[5].kind).toBe("off"); // 토
    expect(s[10]).toMatchObject({ day: "2026-10-29", kind: "today" });
    expect(s[11].kind).toBe("rest");
    expect(s[12].kind).toBe("off");
    expect(s[9]).toMatchObject({ day: "2026-10-28", kind: "level", level: 1 });
  });
  it("treats days before the course start as off and future study days as future", () => {
    const c = { ...cal(), startDate: "2026-10-26" };
    const s = recentStrip(c, new Map(), "2026-10-27");
    expect(s[0].kind).toBe("off");
    expect(s[7].kind).toBe("missed");
    expect(s[9].kind).toBe("future");
  });
});

describe("memberStatus", () => {
  const base = { me: false, studiedToday: false, resting: false, comeback: false, streak: 5, missed: 0 };
  it("labels done, waiting and me", () => {
    expect(memberStatus({ ...base, studiedToday: true })).toMatchObject({ chip: "done", chipText: "오늘 완료", canPoke: false, line: "5일째 연속" });
    expect(memberStatus(base)).toMatchObject({ chipText: "아직", canPoke: true });
    expect(memberStatus({ ...base, me: true })).toMatchObject({ chipText: "오늘 아직", canPoke: false });
  });
  it("shows resting and comeback labels", () => {
    expect(memberStatus({ ...base, resting: true, missed: 3 })).toMatchObject({ line: "쉬어 가는 중", away: false });
    expect(memberStatus({ ...base, comeback: true })).toMatchObject({ line: "돌아왔어요" });
  });
  it("counts missed days", () => {
    expect(memberStatus({ ...base, missed: 2, streak: 0 })).toMatchObject({ line: "이틀째 쉬는 중", away: true });
    expect(memberStatus({ ...base, missed: 9 }).line).toBe("닷새째 쉬는 중");
    expect(memberStatus({ ...base, streak: 0 }).line).toBe("이제 시작해요");
  });
});

describe("notifications", () => {
  it("maps kinds to icons", () => {
    expect(notifIcon("nudge")).toBe("poke");
    expect(notifIcon("comeback")).toBe("route");
    expect(notifIcon("whatever")).toBe("book");
  });
  it("formats times relative to today (KST)", () => {
    const today = "2026-10-29";
    expect(notifTimeLabel(new Date("2026-10-29T11:12:00Z"), today)).toBe("오후 8:12");
    expect(notifTimeLabel(new Date("2026-10-29T00:05:00Z"), today)).toBe("오전 9:05");
    expect(notifTimeLabel(new Date("2026-10-28T03:00:00Z"), today)).toBe("어제");
    expect(notifTimeLabel(new Date("2026-10-25T03:00:00Z"), today)).toBe("일요일");
    expect(notifTimeLabel(new Date("2026-10-10T03:00:00Z"), today)).toBe("10월 10일");
  });
  it("groups into today and earlier", () => {
    const items = [
      { id: "a", createdAt: new Date("2026-10-29T10:00:00Z") },
      { id: "b", createdAt: new Date("2026-10-28T10:00:00Z") },
    ];
    const g = groupByDay(items, "2026-10-29");
    expect(g.map((x) => x.label)).toEqual(["오늘", "이전"]);
    expect(g[0].items.map((x) => x.id)).toEqual(["a"]);
    expect(groupByDay([], "2026-10-29")).toEqual([]);
  });
});
