// 쉬어 가기 달력과 복귀 화면의 순수 계산
import type { TeacherName } from "@/lib/design/types";
import { addDays, type DayKey, diffDays, mondayOf, WEEKDAY_KO, weekday } from "./dates";
import { dayKind, type GrassLevel, type ReplanKind, type StudyCalendar } from "./rest";

export interface PauseDay {
  day: DayKey;
  wd: string;
  date: number;
  past: boolean;
  reserved: boolean;
}

export interface PauseWeek {
  label: "이번 주" | "다음 주";
  days: PauseDay[];
}

/** 이번 주와 다음 주의 학습 요일만. 지난 날은 고를 수 없다 */
export function pauseCalendar(cal: StudyCalendar, today: DayKey): PauseWeek[] {
  const mon = mondayOf(today);
  return (["이번 주", "다음 주"] as const).map((label, w) => {
    const days: PauseDay[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(mon, w * 7 + i);
      if (!cal.studyDays.includes(weekday(day))) continue;
      days.push({
        day,
        wd: WEEKDAY_KO[weekday(day)],
        date: Number(day.slice(8, 10)),
        past: diffDays(day, today) < 0,
        reserved: dayKind(cal, day) === "rest",
      });
    }
    return { label, days };
  });
}

export type PausePreset = "rest" | "next" | "custom";

export function presetDays(weeks: PauseWeek[], preset: PausePreset): DayKey[] {
  if (preset === "custom") return [];
  const w = preset === "rest" ? weeks[0] : weeks[1];
  return (w?.days ?? []).filter((d) => !d.past && !d.reserved).map((d) => d.day);
}

export function pauseDayLabel(d: PauseDay, on: boolean): string {
  return `${d.past ? "지난 날 " : ""}${d.wd}요일 ${d.date}일${on || d.reserved ? ", 쉬는 날" : ""}`;
}

export const PAUSE_LINES: Record<TeacherName, string> = {
  온: "미리 말해 줘서 고마워요. 쉬는 동안엔 알림도 쉬게 할게요.",
  결: "좋습니다. 미리 빼 두면 계획이 무너지지 않습니다.",
  새: "어디 가요? 돌아오면 이어서 탐험해요.",
};

export const PAUSE_REASONS = ["야근 주간", "출장", "휴가", "그냥 좀 쉬고 싶어요"];

// 복귀

export type ComebackCellKind = "study" | "missed" | "off" | "rest" | "today";

export interface ComebackCell {
  day: DayKey;
  wd: string;
  kind: ComebackCellKind;
  level: GrassLevel;
}

/** 오늘 포함 지난 7일 */
export function lastWeekStrip(
  cal: StudyCalendar,
  levels: ReadonlyMap<DayKey, GrassLevel>,
  today: DayKey,
): ComebackCell[] {
  const out: ComebackCell[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = addDays(today, -i);
    const level = levels.get(day) ?? 0;
    const k = dayKind(cal, day);
    let kind: ComebackCellKind;
    if (day === today) kind = "today";
    else if (level > 0) kind = "study";
    else if (k === "rest") kind = "rest";
    else if (k === "off" || diffDays(day, cal.startDate) < 0) kind = "off";
    else kind = "missed";
    out.push({ day, wd: WEEKDAY_KO[weekday(day)], kind, level });
  }
  return out;
}

/** "월화 학습, 수목금 쉼, 오늘 화요일" */
export function stripLabel(cells: ComebackCell[]): string {
  const join = (k: ComebackCellKind) =>
    cells
      .filter((c) => c.kind === k)
      .map((c) => c.wd)
      .join("");
  const parts: string[] = [];
  const study = join("study");
  const missed = join("missed");
  const rest = join("rest");
  if (study) parts.push(`${study} 학습`);
  if (missed) parts.push(`${missed} 빠짐`);
  if (rest) parts.push(`${rest} 쉬어 가기`);
  const t = cells.find((c) => c.kind === "today");
  if (t) parts.push(`오늘 ${t.wd}요일`);
  return parts.join(", ");
}

export function comebackGreet(who: TeacherName, n: number): string {
  return {
    온: `${n}일 만이에요. 와 줘서 정말 반가워요. 오늘은 가볍게 5분만 해요.`,
    결: `${n}일 비었습니다. 괜찮습니다. 지금 다시 맞추면 이번 주 마일스톤은 지킬 수 있습니다.`,
    새: `${n}일 동안 어디 다녀왔어요? 그동안 재밌는 예시를 하나 찾아 뒀어요.`,
  }[who];
}

export const REPLAN_TITLES: Record<ReplanKind, string> = {
  delay: "뒤로 미루기",
  squeeze: "압축하기",
  skip: "요약으로 넘기기",
};

const DIGIT_FINAL = [true, true, false, true, false, false, true, true, true, false];

/** 끝 글자 받침이 있는지. 숫자는 읽는 소리로 본다 */
export function hasFinal(word: string): boolean {
  const ch = word.trim().slice(-1);
  if (/[0-9]/.test(ch)) return DIGIT_FINAL[Number(ch)];
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

/** josa("6주", "이", "가") -> "6주가" */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  return word + (hasFinal(word) ? withFinal : withoutFinal);
}

export function replanDesc(kind: ReplanKind, n: number, before: string, after: string): string {
  if (kind === "delay")
    return `과정이 ${n}일 늘어나요. ${josa(before, "이", "가")} ${josa(after, "이", "가")} 되고, 하루 분량은 그대로예요.`;
  if (kind === "squeeze") return `기간은 그대로. 다음 레슨 ${n}개에 밀린 내용을 5분씩 붙여요.`;
  return `밀린 ${n}개는 3분짜리 요약 카드로 대신하고 바로 오늘 칸으로 가요.`;
}
