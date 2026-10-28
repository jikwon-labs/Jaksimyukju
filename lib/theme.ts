import { DEFAULT_TEACHER, isTeacher } from "./design/tokens";
import type { TeacherName } from "./design/types";

export type ThemeMode = "system" | "light" | "dark";
export const THEME_COOKIE = "j6_theme";
export const TEACHER_COOKIE = "j6_teacher";

export function parseTheme(v: string | undefined): ThemeMode {
  return v === "light" || v === "dark" ? v : "system";
}

export function parseTeacher(v: string | undefined): TeacherName {
  const d = v ? decodeURIComponent(v) : "";
  return isTeacher(d) ? d : DEFAULT_TEACHER;
}

export const THEME_LABELS: Record<ThemeMode, string> = {
  system: "기기 설정",
  light: "화이트",
  dark: "다크",
};
