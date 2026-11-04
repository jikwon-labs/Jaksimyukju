// 홈 화면 위젯이 읽는 요약과 색. 웹 쪽 모양은 lib/domain/widget.ts(WidgetSummary), 색은 lib/design/tokens.ts.
// 이 파일은 react-native를 부르지 않는 순수 코드라 루트 vitest가 웹 쪽과 같은지 본다(lib/domain/widget.test.ts).
// iOS 위젯(targets/widget/Widget.swift)도 같은 키와 색을 쓴다.

/** iOS App Group. app.json ios.entitlements와 targets/widget/expo-target.config.js가 같은 값을 쓴다 */
export const WIDGET_APP_GROUP = "group.com.jaksim6.app";
/** 공유 저장소(App Group UserDefaults, 안드로이드는 AsyncStorage)에 요약 JSON을 두는 키 */
export const WIDGET_STORE_KEY = "widget-summary";
/** iOS 위젯 kind(Widget.swift)와 안드로이드 위젯 이름(app.json react-native-android-widget) */
export const IOS_WIDGET_KIND = "JaksimToday";
export const ANDROID_WIDGET_NAME = "JaksimToday";
/** app.json의 scheme. 위젯을 누르면 jaksim6://open?to=/home 처럼 앱을 연다 */
export const APP_SCHEME = "jaksim6";

export type TeacherName = "온" | "결" | "새";
export type WidgetState = "todo" | "done" | "rest" | "off" | "finished" | "none";

export interface WidgetSummary {
  v: 1;
  day: string;
  teacher: TeacherName;
  streak: number;
  grass: string[];
  todayRow: number;
  today: { state: WidgetState; label: string; title: string; href: string };
  line: string;
}

const STATES: WidgetState[] = ["todo", "done", "rest", "off", "finished", "none"];
const TEACHER_LIST: TeacherName[] = ["온", "결", "새"];

/** 앱 안 경로(/로 시작, //와 /\는 아님) */
export function isAppPath(v: unknown): v is string {
  return typeof v === "string" && /^\/(?![/\\])/.test(v);
}

function str(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length <= max;
}

/** 웹이 보낸 요약을 검사한다. 모양이 다르거나 너무 크면 null(위젯에 그리지 않는다) */
export function parseWidgetSummary(v: unknown): WidgetSummary | null {
  if (typeof v !== "object" || v === null) return null;
  const s = v as Record<string, unknown>;
  const t = s.today as Record<string, unknown> | null | undefined;
  if (s.v !== 1) return null;
  if (!str(s.day, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(s.day)) return null;
  if (!TEACHER_LIST.includes(s.teacher as TeacherName)) return null;
  if (
    typeof s.streak !== "number" ||
    !Number.isInteger(s.streak) ||
    s.streak < 0 ||
    s.streak > 100000
  )
    return null;
  if (
    !Array.isArray(s.grass) ||
    s.grass.length > 12 ||
    !s.grass.every((c) => typeof c === "string" && /^[0-4xr.-]{7}$/.test(c))
  )
    return null;
  if (
    typeof s.todayRow !== "number" ||
    !Number.isInteger(s.todayRow) ||
    s.todayRow < 0 ||
    s.todayRow > 6
  )
    return null;
  if (typeof t !== "object" || t === null) return null;
  if (
    !STATES.includes(t.state as WidgetState) ||
    !str(t.label, 20) ||
    !str(t.title, 200) ||
    !isAppPath(t.href) ||
    !str(t.href, 300)
  )
    return null;
  if (!str(s.line, 60)) return null;
  return {
    v: 1,
    day: s.day,
    teacher: s.teacher as TeacherName,
    streak: s.streak,
    grass: s.grass as string[],
    todayRow: s.todayRow,
    today: {
      state: t.state as WidgetState,
      label: t.label as string,
      title: t.title as string,
      href: t.href as string,
    },
    line: s.line,
  };
}

/** 위젯을 눌렀을 때 여는 주소 */
export function widgetLink(path: string): string {
  return `${APP_SCHEME}://open?to=${encodeURIComponent(isAppPath(path) ? path : "/home")}`;
}

/** 위젯이 열어 준 주소(jaksim6://open?to=...)에서 앱 안 경로를 꺼낸다. 아니면 null */
export function widgetLinkPath(url: string): string | null {
  const prefix = `${APP_SCHEME}://open?`;
  if (!url.startsWith(prefix)) return null;
  const to = new URLSearchParams(url.slice(prefix.length)).get("to");
  return isAppPath(to) ? to : null;
}

/**
 * 요약의 day는 서버가 한국 시간(lib/clock.ts TIME_ZONE = Asia/Seoul)으로 정한다.
 * 위젯도 기기 시간대가 아니라 같은 한국 시간으로 날짜를 본다(해외에서도 앱과 같은 날로 보이게).
 * 한국은 서머타임이 없어 늘 UTC+9라 Intl 없이 더해서 구한다. Widget.swift도 Asia/Seoul을 쓴다
 */
export const WIDGET_TIME_ZONE = "Asia/Seoul";
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 시간 기준 그 순간의 날짜(YYYY-MM-DD). 서버 getToday()와 같다 */
export function widgetDayKey(d: Date): string {
  const k = new Date(d.getTime() + SEOUL_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}-${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())}`;
}

/** 요약을 만든 날(한국 시간)이 지났으면 true. 위젯은 연속 일수와 잔디만 두고 "앱을 열어 주세요"로 바꾼다 */
export function isStale(s: Pick<WidgetSummary, "day">, now: Date): boolean {
  return s.day !== widgetDayKey(now);
}

export const STALE_LABEL = "새로고침";
export const STALE_TITLE = "앱을 열면 오늘 칸을 불러와요";
export const EMPTY_TITLE = "작심육주를 열어 오늘 할 일을 확인해요";

// 색: lib/design/tokens.ts TEACHERS·PALETTES·grassColors와 같은 값
export const WIDGET_TEACHERS: Record<
  TeacherName,
  { body: string; deep: string; tint: string; text: string }
> = {
  온: { body: "#5B8CFF", deep: "#2F62D9", tint: "#E6EEFF", text: "#2F62D9" },
  결: { body: "#FF6B5E", deep: "#D63A30", tint: "#FFE9E5", text: "#B42E25" },
  새: { body: "#4CC38A", deep: "#1F7A4A", tint: "#E2F5EA", text: "#1F7A4A" },
};

export const WIDGET_PALETTE = {
  light: {
    bg: "#FFFFFF",
    surface: "#F5F5F7",
    ink: "#111113",
    sub: "#63636B",
    line: "#E2E2E6",
    future: "#E9E9EE",
  },
  dark: {
    bg: "#111114",
    surface: "#1C1C21",
    ink: "#F2F1EE",
    sub: "#A3A1A8",
    line: "#34343C",
    future: "#2A2A31",
  },
} as const;

/** 잔디 진하기 1~3의 불투명도(4는 진한 색 그대로). tokens.ts grassColors와 같다 */
export const GRASS_ALPHA = { light: [0, 0.35, 0.6, 0.9], dark: [0, 0.3, 0.55, 0.8] } as const;

/** #RRGGBB + 불투명도 -> #RRGGBBAA */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${hex}${a}`;
}

export interface CellStyle {
  fill: string | null;
  border: string | null;
}

/** 잔디 한 칸의 색. 글자 뜻은 lib/domain/widget.ts WidgetSummary.grass */
export function cellStyle(
  ch: string,
  teacher: TeacherName,
  dark: boolean,
  today: boolean,
): CellStyle {
  const t = WIDGET_TEACHERS[teacher];
  const p = dark ? WIDGET_PALETTE.dark : WIDGET_PALETTE.light;
  const accent = dark ? t.body : t.text;
  const ring = today ? accent : null;
  if (ch >= "1" && ch <= "3")
    return {
      fill: withAlpha(t.body, GRASS_ALPHA[dark ? "dark" : "light"][Number(ch)]),
      border: ring,
    };
  if (ch === "4") return { fill: dark ? t.body : t.deep, border: ring };
  if (ch === "0") return { fill: null, border: ring ?? p.line };
  if (ch === "r") return { fill: withAlpha(p.line, 0.6), border: ring };
  if (ch === "x") return { fill: null, border: ring ?? withAlpha(p.line, 0.6) };
  if (ch === ".") return { fill: p.future, border: ring };
  return { fill: null, border: null };
}
