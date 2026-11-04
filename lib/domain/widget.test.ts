import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_SCHEME,
  ANDROID_WIDGET_NAME,
  GRASS_ALPHA,
  IOS_WIDGET_KIND,
  parseWidgetSummary,
  WIDGET_APP_GROUP,
  WIDGET_PALETTE,
  WIDGET_STORE_KEY,
  WIDGET_TEACHERS,
} from "../../mobile/widget-data";
import { grassColors, PALETTES, rgba, TEACHERS, TEACHER_NAMES } from "../design/tokens";
import type { Step } from "./course";
import type { GrassLevel, StudyCalendar } from "./rest";
import {
  doneTodayTitle,
  emptyWidgetSummary,
  mondayRow,
  recentGrass,
  WIDGET_LABELS,
  WIDGET_LINES,
  widgetSummary,
  type WidgetInput,
} from "./widget";

// 2026-10-19 월요일 시작, 월~금 학습. 2026-11-04는 수요일
const cal = (rest: string[] = []): StudyCalendar => ({
  startDate: "2026-10-19",
  studyDays: [1, 2, 3, 4, 5],
  restDays: new Set(rest),
});

const LV: [string, GrassLevel][] = [
  ["2026-10-19", 2],
  ["2026-10-20", 3],
  ["2026-10-22", 1],
  ["2026-10-23", 4],
  ["2026-10-26", 2],
  ["2026-10-27", 2],
  ["2026-10-28", 2],
  ["2026-10-29", 2],
  ["2026-11-02", 2],
];

const lesson: Step = {
  id: "3-1",
  week: 3,
  i: 1,
  kind: "lesson",
  title: "현금흐름표 읽기",
  day: "화",
  state: "today",
  lessonId: "L9",
  order: 9,
  minutes: 10,
};

function input(over: Partial<WidgetInput> = {}): WidgetInput {
  return {
    today: "2026-11-04",
    teacher: "온",
    cal: cal(["2026-10-30"]),
    levels: new Map(LV),
    streak: 3,
    next: lesson,
    finished: false,
    comeback: false,
    doneTitle: null,
    ...over,
  };
}

describe("recentGrass", () => {
  it("오늘이 든 주까지 최근 5주를 월~일 7글자로 만든다", () => {
    expect(recentGrass(cal(["2026-10-30"]), new Map(LV), "2026-11-04")).toEqual([
      "-------",
      "-------",
      "23014xx",
      "2222rxx",
      "200..xx",
    ]);
  });
  it("앞으로 올 쉬어 가기와 쉬는 요일도 구분한다", () => {
    expect(recentGrass(cal(["2026-11-06"]), new Map(), "2026-11-04", 1)).toEqual(["000.rxx"]);
  });
  it("오늘의 줄은 월요일이 0이다", () => {
    expect(mondayRow("2026-11-02")).toBe(0);
    expect(mondayRow("2026-11-04")).toBe(2);
    expect(mondayRow("2026-11-08")).toBe(6);
  });
});

describe("widgetSummary", () => {
  it("아직 안 한 날은 오늘 칸으로 바로 간다", () => {
    const s = widgetSummary(input());
    expect(s).toMatchObject({ v: 1, day: "2026-11-04", teacher: "온", streak: 3, todayRow: 2 });
    expect(s.today).toEqual({
      state: "todo",
      label: "아직",
      title: "현금흐름표 읽기",
      href: "/lesson/L9",
    });
    expect(s.line).toBe(WIDGET_LINES.온.todo);
    expect(s.grass).toHaveLength(5);
  });
  it("오늘 몫을 끝냈으면 오늘 마친 칸 제목과 완료를 보인다", () => {
    const s = widgetSummary(
      input({
        levels: new Map([...LV, ["2026-11-04", 3]]),
        doneTitle: "손익계산서 읽기",
        teacher: "결",
      }),
    );
    expect(s.today).toEqual({
      state: "done",
      label: "완료",
      title: "손익계산서 읽기",
      href: "/home",
    });
    expect(s.line).toBe(WIDGET_LINES.결.done);
    expect(s.grass[4][2]).toBe("3");
  });
  it("쉬어 가기로 한 날과 학습 요일이 아닌 날은 다음 칸을 보여 주고 홈으로 간다", () => {
    const rest = widgetSummary(input({ cal: cal(["2026-11-04"]) }));
    expect(rest.today).toEqual({
      state: "rest",
      label: "쉬어 가는 날",
      title: "현금흐름표 읽기",
      href: "/home",
    });
    const off = widgetSummary(input({ today: "2026-11-07", teacher: "새" }));
    expect(off.today).toMatchObject({ state: "off", label: "쉬는 날", href: "/home" });
    expect(off.line).toBe(WIDGET_LINES.새.off);
    expect(off.todayRow).toBe(5);
  });
  it("쉬는 날에 공부했으면 완료로 본다", () => {
    const s = widgetSummary(
      input({ today: "2026-11-07", levels: new Map([["2026-11-07", 1]]), doneTitle: "보너스" }),
    );
    expect(s.today.state).toBe("done");
  });
  it("퀴즈·마일스톤 칸은 그 화면으로 간다", () => {
    const quiz = widgetSummary(
      input({ next: { ...lesson, kind: "quiz", title: "주차 퀴즈 3문제", lessonId: undefined } }),
    );
    expect(quiz.today).toMatchObject({ title: "3주차 퀴즈 3문제", href: "/quiz/3" });
    const goal = widgetSummary(
      input({ next: { ...lesson, kind: "goal", title: "마일스톤: 재무제표 3종 읽기" } }),
    );
    expect(goal.today).toMatchObject({
      title: "마일스톤: 재무제표 3종 읽기",
      href: "/milestone/3",
    });
  });
  it("복귀 화면이 먼저면 오늘 칸을 눌러도 홈으로 간다", () => {
    expect(widgetSummary(input({ comeback: true })).today.href).toBe("/home");
  });
  it("과정을 다 마쳤으면 도착 기록으로 간다", () => {
    const s = widgetSummary(input({ next: null, finished: true }));
    expect(s.today).toEqual({
      state: "finished",
      label: "도착",
      title: "과정을 모두 마쳤어요",
      href: "/finish",
    });
  });
  it("이름·주제 같은 개인정보는 싣지 않는다", () => {
    expect(Object.keys(widgetSummary(input())).sort()).toEqual(
      ["day", "grass", "line", "streak", "teacher", "today", "todayRow", "v"].sort(),
    );
  });
});

describe("doneTodayTitle", () => {
  const weeks = [
    {
      index: 1,
      milestoneTitle: "재무제표 3종",
      lessons: [
        { title: "자산과 부채", completedDay: "2026-11-04", status: "done" },
        { title: "손익계산서", completedDay: "2026-11-04", status: "short" },
        { title: "요약 카드", completedDay: "2026-11-04", status: "summary" },
      ],
      quizDays: [] as string[],
      milestoneRounds: [] as { day: string; passed: boolean }[],
    },
  ];
  it("오늘 마친 레슨 중 마지막 것을 고른다", () => {
    expect(doneTodayTitle(weeks, "2026-11-04")).toBe("손익계산서");
    expect(doneTodayTitle(weeks, "2026-11-05")).toBeNull();
  });
  it("퀴즈보다 마일스톤, 레슨보다 퀴즈를 먼저 보인다", () => {
    expect(doneTodayTitle([{ ...weeks[0], quizDays: ["2026-11-04"] }], "2026-11-04")).toBe(
      "1주차 퀴즈 3문제",
    );
    expect(
      doneTodayTitle(
        [
          {
            ...weeks[0],
            quizDays: ["2026-11-04"],
            milestoneRounds: [{ day: "2026-11-04", passed: false }],
          },
        ],
        "2026-11-04",
      ),
    ).toBe("마일스톤: 재무제표 3종");
  });
  it("옛 퀴즈 재응시는 오늘 마친 것으로 치지 않는다(잔디처럼 첫 응시만)", () => {
    const today = "2026-11-04";
    const w3 = {
      ...weeks[0],
      index: 3,
      lessons: [{ title: "현금흐름표", completedDay: today, status: "done" }],
    };
    const w1 = { ...weeks[0], lessons: [], quizDays: ["2026-10-20", today] };
    expect(doneTodayTitle([w1, w3], today)).toBe("현금흐름표");
    expect(doneTodayTitle([{ ...w1, quizDays: [today] }, w3], today)).toBe("1주차 퀴즈 3문제");
  });
  it("통과한 마일스톤을 다시 내도 오늘 마친 것으로 치지 않는다", () => {
    const today = "2026-11-04";
    const passedBefore = [
      { day: "2026-10-28", passed: false },
      { day: "2026-10-30", passed: true },
      { day: today, passed: true },
    ];
    expect(doneTodayTitle([{ ...weeks[0], milestoneRounds: passedBefore }], today)).toBe(
      "손익계산서",
    );
    const passedToday = [
      { day: "2026-10-28", passed: false },
      { day: today, passed: true },
    ];
    expect(doneTodayTitle([{ ...weeks[0], milestoneRounds: passedToday }], today)).toBe(
      "마일스톤: 재무제표 3종",
    );
  });
});

describe("앱 껍데기와 같은 약속", () => {
  it("웹이 만든 요약을 앱이 그대로 받아들인다", () => {
    for (const s of [
      widgetSummary(input()),
      widgetSummary(input({ next: null, finished: true, teacher: "새" })),
      widgetSummary(input({ cal: cal(["2026-11-04"]), teacher: "결" })),
      emptyWidgetSummary("2026-11-04", "온"),
    ]) {
      expect(parseWidgetSummary(JSON.parse(JSON.stringify(s)))).toEqual(s);
    }
  });
  it("앱은 모양이 틀린 요약을 버린다", () => {
    const s = widgetSummary(input());
    expect(parseWidgetSummary({ ...s, v: 2 })).toBeNull();
    expect(parseWidgetSummary({ ...s, teacher: "누구" })).toBeNull();
    expect(parseWidgetSummary({ ...s, grass: ["12345678"] })).toBeNull();
    expect(
      parseWidgetSummary({ ...s, today: { ...s.today, href: "https://evil.test" } }),
    ).toBeNull();
    expect(parseWidgetSummary({ ...s, today: { ...s.today, href: "//evil.test" } })).toBeNull();
    expect(parseWidgetSummary({ ...s, streak: -1 })).toBeNull();
    expect(parseWidgetSummary(null)).toBeNull();
  });
  it("문구는 앱이 받는 길이 안에 든다", () => {
    for (const l of Object.values(WIDGET_LABELS)) expect(l.length).toBeLessThanOrEqual(20);
    for (const who of TEACHER_NAMES)
      for (const l of Object.values(WIDGET_LINES[who])) expect(l.length).toBeLessThanOrEqual(16);
  });
  it("위젯 색은 디자인 토큰과 같다", () => {
    for (const who of TEACHER_NAMES) {
      const t = TEACHERS[who];
      expect(WIDGET_TEACHERS[who]).toEqual({
        body: t.body,
        deep: t.deep,
        tint: t.tint,
        text: t.text ?? t.deep,
      });
      for (const dark of [false, true]) {
        const g = grassColors(t, dark);
        const a = GRASS_ALPHA[dark ? "dark" : "light"];
        for (const i of [1, 2, 3]) expect(g[i]).toBe(rgba(t.body, a[i]));
        expect(g[4]).toBe(dark ? t.body : t.deep);
      }
    }
    for (const mode of ["light", "dark"] as const) {
      const p = PALETTES[mode];
      expect(WIDGET_PALETTE[mode]).toEqual({
        bg: p.bg,
        surface: p.surface,
        ink: p.ink,
        sub: p.sub,
        line: p.line,
        future: p.future,
      });
    }
  });
  it("iOS 위젯·앱 설정도 같은 키와 색을 쓴다", () => {
    const root = path.resolve(__dirname, "../../mobile");
    const swift = readFileSync(path.join(root, "targets/widget/Widget.swift"), "utf8");
    expect(swift).toContain(`"${WIDGET_APP_GROUP}"`);
    expect(swift).toContain(`"${WIDGET_STORE_KEY}"`);
    expect(swift).toContain(`"${IOS_WIDGET_KIND}"`);
    expect(swift).toContain(`"${APP_SCHEME}"`);
    const hex = (h: string) => `0x${h.slice(1).toUpperCase()}`;
    for (const who of TEACHER_NAMES) {
      const t = WIDGET_TEACHERS[who];
      expect(swift).toContain(
        `"${who}": TeacherColors(body: ${hex(t.body)}, deep: ${hex(t.deep)}, tint: ${hex(t.tint)}, text: ${hex(t.text)})`,
      );
    }
    for (const mode of ["light", "dark"] as const) {
      const p = WIDGET_PALETTE[mode];
      expect(swift).toContain(
        `static let ${mode} = Palette(bg: ${hex(p.bg)}, surface: ${hex(p.surface)}, ink: ${hex(p.ink)}, sub: ${hex(p.sub)}, line: ${hex(p.line)}, future: ${hex(p.future)})`,
      );
    }
    const app = JSON.parse(readFileSync(path.join(root, "app.json"), "utf8")).expo;
    expect(app.scheme).toBe(APP_SCHEME);
    expect(app.ios.entitlements["com.apple.security.application-groups"]).toEqual([
      WIDGET_APP_GROUP,
    ]);
    const android = app.plugins.find(
      (p: unknown) => Array.isArray(p) && p[0] === "react-native-android-widget",
    );
    expect(android[1].widgets.map((w: { name: string }) => w.name)).toEqual([ANDROID_WIDGET_NAME]);
  });
});
