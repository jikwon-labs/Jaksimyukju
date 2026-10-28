import type { TeacherName } from "./types";

export const TEACHER_NAMES: TeacherName[] = ["온", "결", "새"];
export const DEFAULT_TEACHER: TeacherName = "온";
export const FACE_INK = "#1E1B2E";

export interface TeacherColors {
  body: string;
  deep: string;
  tint: string;
}

// 목업 common.py의 teachers 그대로
export const TEACHERS: Record<TeacherName, TeacherColors & { slug: string; trait: string }> = {
  온: { body: "#5B8CFF", deep: "#2F62D9", tint: "#E6EEFF", slug: "on", trait: "다정함" },
  결: { body: "#FF6B5E", deep: "#D63A30", tint: "#FFE9E5", slug: "gyeol", trait: "단호하고 성격 급한 코치" },
  새: { body: "#4CC38A", deep: "#1F7A4A", tint: "#E2F5EA", slug: "sae", trait: "호기심" },
};

export function isTeacher(v: unknown): v is TeacherName {
  return v === "온" || v === "결" || v === "새";
}

export interface Palette {
  dark: boolean;
  bg: string;
  surface: string;
  ink: string;
  sub: string;
  line: string;
  future: string;
  tab: string;
  cardBorder: string;
  good: string;
  goodBg: string;
  warn: string;
  warnBg: string;
  knobOff: string;
}

// 목업 common.py의 palettes 그대로
export const PALETTES: Record<"light" | "dark", Palette> = {
  light: {
    dark: false,
    bg: "#FFFFFF",
    surface: "#F5F5F7",
    ink: "#111113",
    sub: "#63636B",
    line: "#E2E2E6",
    future: "#E9E9EE",
    tab: "#FFFFFF",
    cardBorder: "none",
    good: "#1F6B42",
    goodBg: "#E2F5EA",
    warn: "#9A4A00",
    warnBg: "#FFF1E0",
    knobOff: "#FFFFFF",
  },
  dark: {
    dark: true,
    bg: "#111114",
    surface: "#1C1C21",
    ink: "#F2F1EE",
    sub: "#A3A1A8",
    line: "#34343C",
    future: "#2A2A31",
    tab: "#16161A",
    cardBorder: "1px solid #26262D",
    good: "#7FD9AC",
    goodBg: "rgba(76,195,138,0.18)",
    warn: "#FFB870",
    warnBg: "rgba(255,170,90,0.16)",
    knobOff: "#A3A1A8",
  },
};

export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export interface Accent {
  text: string;
  tint: string;
  btnBg: string;
  btnInk: string;
  glow: string;
}

// 다크에서는 밝은 몸 색을 강조색으로, 버튼 글자는 어둡게 (대비 4.5:1 이상)
export function accent(t: TeacherColors, dark: boolean): Accent {
  return dark
    ? {
        text: t.body,
        tint: rgba(t.body, 0.16),
        btnBg: t.body,
        btnInk: "#111114",
        glow: `0 0 0 6px ${rgba(t.body, 0.14)}, 0 0 32px ${rgba(t.body, 0.28)}`,
      }
    : { text: t.deep, tint: t.tint, btnBg: t.deep, btnInk: "#FFFFFF", glow: `0 0 0 6px ${t.tint}` };
}

// 잔디 진하기: 0 안 함, 1 5분 버전, 2 레슨 완료, 3 레슨+튜터, 4 퀴즈·마일스톤까지
export function grassColors(t: TeacherColors, dark: boolean): string[] {
  const L = dark ? [0, 0.3, 0.55, 0.8] : [0, 0.35, 0.6, 0.9];
  return [
    "transparent",
    rgba(t.body, L[1]),
    rgba(t.body, L[2]),
    rgba(t.body, L[3]),
    dark ? t.body : t.deep,
  ];
}

function paletteVars(p: Palette): string {
  return [
    `--bg:${p.bg}`,
    `--surface:${p.surface}`,
    `--ink:${p.ink}`,
    `--sub:${p.sub}`,
    `--line:${p.line}`,
    `--future:${p.future}`,
    `--tab:${p.tab}`,
    `--card-border:${p.cardBorder}`,
    `--good:${p.good}`,
    `--good-bg:${p.goodBg}`,
    `--warn:${p.warn}`,
    `--warn-bg:${p.warnBg}`,
    `--knob-off:${p.knobOff}`,
    `color-scheme:${p.dark ? "dark" : "light"}`,
  ].join(";");
}

function teacherVars(t: TeacherColors, dark: boolean): string {
  const a = accent(t, dark);
  const g = grassColors(t, dark);
  return [
    `--t-body:${t.body}`,
    `--t-deep:${t.deep}`,
    `--t-tint:${t.tint}`,
    `--a-text:${a.text}`,
    `--a-tint:${a.tint}`,
    `--a-btn-bg:${a.btnBg}`,
    `--a-btn-ink:${a.btnInk}`,
    `--a-glow:${a.glow}`,
    `--a-shadow:${dark ? rgba(t.body, 0.45) : rgba(t.deep, 0.55)}`,
    ...g.map((c, i) => `--g${i}:${c}`),
  ].join(";");
}

/**
 * html[data-theme][data-teacher] 조합마다 CSS 변수를 만든다.
 * data-theme="system"은 prefers-color-scheme을 따른다.
 */
export function themeCss(): string {
  const out: string[] = [];
  const sel = (theme: string, who?: TeacherName) =>
    `html[data-theme="${theme}"]${who ? `[data-teacher="${who}"]` : ""}`;
  out.push(`${sel("light")},${sel("system")}{${paletteVars(PALETTES.light)}}`);
  out.push(`${sel("dark")}{${paletteVars(PALETTES.dark)}}`);
  for (const who of TEACHER_NAMES) {
    const t = TEACHERS[who];
    out.push(`${sel("light", who)},${sel("system", who)}{${teacherVars(t, false)}}`);
    out.push(`${sel("dark", who)}{${teacherVars(t, true)}}`);
  }
  const darkSystem = [`${sel("system")}{${paletteVars(PALETTES.dark)}}`];
  for (const who of TEACHER_NAMES) {
    darkSystem.push(`${sel("system", who)}{${teacherVars(TEACHERS[who], true)}}`);
  }
  out.push(`@media (prefers-color-scheme: dark){${darkSystem.join("")}}`);
  return out.join("\n");
}
