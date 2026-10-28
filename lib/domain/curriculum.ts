// 커리큘럼 화면(지도·목록)의 문구와 상태 계산 (목업 Curriculum.dc.html renderVals)
import type { Step, StepKind, StepState, WeekView } from "./course";
import { WEEKDAY_KO } from "./dates";

export const STATE_WORD: Record<StepState, string> = {
  done: "완료",
  five: "5분 버전으로 완료",
  today: "오늘",
  todo: "열림",
  lock: "잠김",
};

export const KIND_WORD: Record<StepKind, string> = { lesson: "레슨", quiz: "퀴즈", goal: "마일스톤" };

export const WEEK_STATE_WORD: Record<WeekView["status"], string> = { done: "완료", current: "진행 중", todo: "잠김" };

export function isDone(s: StepState): boolean {
  return s === "done" || s === "five";
}

export function stepHref(st: Step): string {
  if (st.kind === "quiz") return `/quiz/${st.week}`;
  if (st.kind === "goal") return `/milestone/${st.week}`;
  return `/lesson/${st.lessonId}`;
}

export interface PopoverInfo {
  kicker: string;
  title: string;
  meta: string;
  cta: string; // 빈 문자열이면 버튼 없음
  href: string;
  hot: boolean;
}

export function popoverInfo(st: Step): PopoverInfo {
  const done = isDone(st.state);
  const lock = st.state === "lock";
  const meta = lock
    ? "앞 칸을 마치면 열려요. 진도에 맞춰 선생님이 내용을 다듬어요."
    : st.kind === "quiz"
      ? done
        ? `점수 ${st.note ?? ""} · 틀린 문제만 다시 풀 수 있어요`
        : "이번 주 레슨으로 3문제 · 약 3분"
      : st.kind === "goal"
        ? "선생님이 기준 3개로 피드백해요"
        : st.state === "five"
          ? `5분 버전으로 끝냈어요 · 전체 버전 약 ${st.minutes ?? 10}분`
          : `약 ${st.minutes ?? 10}분 · 설명과 튜터 질문 3개`;
  const cta = lock
    ? ""
    : done
      ? "다시 보기"
      : st.kind === "quiz"
        ? "퀴즈 풀기"
        : st.kind === "goal"
          ? "결과물 제출하기"
          : "학습 시작";
  return {
    kicker: `${st.week}주차 ${st.day ? st.day + "요일 " : ""}${KIND_WORD[st.kind]} · ${STATE_WORD[st.state]}`,
    title: st.title,
    meta,
    cta,
    href: stepHref(st),
    hot: st.state === "today" || st.state === "todo",
  };
}

export function nodeLabel(st: Step): string {
  return `${st.week}주차 ${KIND_WORD[st.kind]} ${st.title}, ${STATE_WORD[st.state]}`;
}

/** 배너·목록 머리의 보조 문구 */
export function weekMeta(w: WeekView, last: boolean): string {
  if (w.status === "todo") return `레슨 ${w.lessonsTotal}개${last ? " · 최종" : ""}`;
  const quiz = w.status === "done" && w.quizScore !== null ? ` · 퀴즈 ${w.quizScore}점` : "";
  return `레슨 ${w.lessonsDone}/${w.lessonsTotal}${quiz}`;
}

/** 지도 배너 문구: 먼 주차는 "{n-1}주차 뒤 열림" */
export function bannerMeta(w: WeekView, last: boolean): string {
  return w.far ? `${w.n - 1}주차 뒤 열림` : weekMeta(w, last);
}

/** 지도에서 처음 펼쳐 둘 주차: 진행 중 주차와 바로 다음 주차. 다 끝났으면 마지막 주차 */
export function defaultOpenWeeks(weeks: WeekView[], currentWeek: number, finished: boolean): Record<number, boolean> {
  const out: Record<number, boolean> = {};
  for (const w of weeks) {
    out[w.n] = finished ? w.n === weeks[weeks.length - 1]?.n : !w.far && (w.n === currentWeek || w.n === currentWeek + 1);
  }
  return out;
}

export interface DayRow {
  id: string;
  day: string;
  title: string;
  state: StepState;
  tag: "" | "오늘" | "5분 버전" | "제출";
}

/** 목록 보기의 날짜 줄. 퀴즈 칸은 빼고, 아직 열리지 않은 주차는 빈 배열(잠김 안내) */
export function listDays(w: WeekView, currentWeek: number): DayRow[] {
  if (w.status === "todo" && w.n > currentWeek) return [];
  return w.steps
    .filter((s) => s.kind !== "quiz")
    .map((s) => ({
      id: s.id,
      day: s.day,
      title: s.title,
      state: s.state,
      tag: s.state === "today" ? "오늘" : s.state === "five" ? "5분 버전" : s.kind === "goal" && s.state === "done" ? "제출" : "",
    }));
}

/** 학습 요일 표시: 이어진 요일이면 "월–금", 아니면 "월·수·금" */
export function studyDaysLabel(days: number[]): string {
  const sorted = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return WEEKDAY_KO[sorted[0]];
  const mon = sorted.map((d) => (d + 6) % 7);
  const contiguous = mon.every((d, i) => i === 0 || d === mon[i - 1] + 1);
  if (contiguous && sorted.length >= 3) return `${WEEKDAY_KO[sorted[0]]}–${WEEKDAY_KO[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => WEEKDAY_KO[d]).join("·");
}

/** 지도 길 계산용: 완료 또는 오늘인 마지막 칸, 오늘 칸 */
export function roadIndexes(steps: Step[]): { lastDone: number; todayIdx: number } {
  let lastDone = -1;
  let todayIdx = -1;
  steps.forEach((s, i) => {
    if (isDone(s.state) || s.state === "today") lastDone = i;
    if (s.state === "today") todayIdx = i;
  });
  return { lastDone, todayIdx };
}

/** 잠긴 칸은 제목과 요일을 감춘다(목업: "레슨 N", "마일스톤"). 진도에 맞춰 내용이 바뀔 수 있어서 */
export function maskLocked(steps: Step[]): Step[] {
  let lesson = 0;
  return steps.map((s) => {
    if (s.kind === "lesson") lesson++;
    if (s.state !== "lock") return s;
    if (s.kind === "lesson") return { ...s, title: `레슨 ${lesson}`, day: "" };
    if (s.kind === "goal") return { ...s, title: "마일스톤", day: "" };
    return s;
  });
}
