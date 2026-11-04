// 휴대폰 홈 화면 위젯에 넘기는 요약. 앱 껍데기(mobile/widget-data.ts)가 같은 모양을 읽어 위젯을 그린다.
// 위젯은 잠금 화면 근처에도 보이므로 이름·주제·그룹 같은 개인정보는 싣지 않는다(연속 일수, 잔디, 오늘 칸 제목만).
import type { TeacherName } from "@/lib/design/types";
import { stepHref, type Step } from "./course";
import { addDays, type DayKey, diffDays, mondayOf, weekday } from "./dates";
import {
  countedMilestoneDays,
  countedQuizDay,
  dayKind,
  type GrassLevel,
  type StudyCalendar,
} from "./rest";

export const WIDGET_VERSION = 1;
/** 위젯에 싣는 최근 주 수. 작은 위젯은 이 중 뒤쪽 몇 주만 그린다 */
export const WIDGET_WEEKS = 5;

/**
 * 오늘 칸 상태.
 * todo 아직, done 오늘 몫 완료, rest 쉬어 가기로 예약한 날, off 학습 요일이 아닌 날, finished 과정 완주, none 진행 중 과정 없음
 */
export type WidgetState = "todo" | "done" | "rest" | "off" | "finished" | "none";

export interface WidgetToday {
  state: WidgetState;
  /** 위젯에 보이는 상태 글자 */
  label: string;
  /** 오늘 칸 제목. done이면 오늘 마친 것, rest·off면 다음에 할 것 */
  title: string;
  /** 위젯 오늘 칸을 누르면 앱이 열 경로 */
  href: string;
}

export interface WidgetSummary {
  v: typeof WIDGET_VERSION;
  /** 이 요약을 만든 날(사용자 기준). 위젯은 날이 바뀌면 "앱을 열어 주세요"로 보인다 */
  day: DayKey;
  teacher: TeacherName;
  streak: number;
  /**
   * 최근 주 잔디. 오래된 주부터, 주마다 월~일 7글자.
   * 0~4 진하기(0은 비운 학습일), x 학습 요일이 아닌 날, r 쉬어 가기, . 아직 안 온 학습일, - 과정 시작 전
   */
  grass: string[];
  /** 마지막 주에서 오늘의 줄(0=월 ~ 6=일) */
  todayRow: number;
  today: WidgetToday;
  /** 선생님 한마디(짧게) */
  line: string;
}

export const WIDGET_LABELS: Record<WidgetState, string> = {
  todo: "아직",
  done: "완료",
  rest: "쉬어 가는 날",
  off: "쉬는 날",
  finished: "도착",
  none: "시작 전",
};

// 위젯은 좁아서 한 줄(16자 안쪽)로 쓴다. 말투는 lib/ai/teachers.ts의 TEACHER_VOICE를 따른다
export const WIDGET_LINES: Record<TeacherName, Record<WidgetState, string>> = {
  온: {
    todo: "10분만 같이 해요",
    done: "오늘 몫 끝! 푹 쉬어요",
    rest: "오늘은 쉬어 가요",
    off: "쉬는 날이에요. 푹 쉬어요",
    finished: "끝까지 왔어요. 멋져요",
    none: "같이 시작해 볼까요?",
  },
  결: {
    todo: "오늘 몫, 지금 합니다",
    done: "완료. 내일 같은 시간입니다",
    rest: "예약한 쉼입니다",
    off: "쉬는 날입니다",
    finished: "완주했습니다",
    none: "시작하면 끝까지 갑니다",
  },
  새: {
    todo: "오늘은 어디로 가 볼까요?",
    done: "오늘 탐험 끝!",
    rest: "쉬고 내일 또 탐험해요",
    off: "쉬는 날! 딴짓도 공부예요",
    finished: "목적지 도착!",
    none: "어디로 떠나 볼까요?",
  },
};

/** 월요일 = 0 ~ 일요일 = 6 */
export function mondayRow(day: DayKey): number {
  return (weekday(day) + 6) % 7;
}

function cellChar(
  cal: StudyCalendar,
  levels: ReadonlyMap<DayKey, GrassLevel>,
  day: DayKey,
  today: DayKey,
): string {
  const kind = dayKind(cal, day);
  if (diffDays(day, today) > 0) return kind === "study" ? "." : kind === "rest" ? "r" : "x";
  const lv = levels.get(day) ?? 0;
  if (lv > 0) return String(lv);
  if (diffDays(day, cal.startDate) < 0) return "-";
  if (kind === "rest") return "r";
  if (kind === "off") return "x";
  return "0";
}

/** 오늘이 든 주까지 최근 weeks주. 오래된 주부터, 주마다 월~일 7글자 */
export function recentGrass(
  cal: StudyCalendar,
  levels: ReadonlyMap<DayKey, GrassLevel>,
  today: DayKey,
  weeks: number = WIDGET_WEEKS,
): string[] {
  const first = addDays(mondayOf(today), -7 * (Math.max(1, weeks) - 1));
  const cols: string[] = [];
  for (let w = 0; w < Math.max(1, weeks); w++) {
    let col = "";
    for (let i = 0; i < 7; i++) col += cellChar(cal, levels, addDays(first, w * 7 + i), today);
    cols.push(col);
  }
  return cols;
}

export interface WidgetInput {
  today: DayKey;
  teacher: TeacherName;
  cal: StudyCalendar;
  levels: ReadonlyMap<DayKey, GrassLevel>;
  streak: number;
  /** 다음에 할 칸(CourseView.today). 다 마쳤으면 null */
  next: Step | null;
  finished: boolean;
  /** 복귀 화면을 먼저 봐야 하는지. 그러면 오늘 칸을 눌러도 홈(→ 복귀)으로 간다 */
  comeback: boolean;
  /** 오늘 마친 칸 제목(가장 마지막 것). 없으면 null */
  doneTitle: string | null;
}

/** 칸 제목. 홈 화면의 제목과 같다 */
export function stepTitle(st: Pick<Step, "kind" | "week" | "title">): string {
  return st.kind === "quiz" ? `${st.week}주차 퀴즈 3문제` : st.title;
}

export function widgetSummary(input: WidgetInput): WidgetSummary {
  const { today, teacher, cal, levels, next } = input;
  const studied = (levels.get(today) ?? 0) > 0;
  const kind = dayKind(cal, today);
  const nextTitle = next ? stepTitle(next) : "";
  let t: Omit<WidgetToday, "label">;
  if (studied) t = { state: "done", title: input.doneTitle ?? nextTitle, href: "/home" };
  else if (input.finished || !next)
    t = { state: "finished", title: "과정을 모두 마쳤어요", href: "/finish" };
  else if (kind === "rest") t = { state: "rest", title: nextTitle, href: "/home" };
  else if (kind === "off") t = { state: "off", title: nextTitle, href: "/home" };
  else t = { state: "todo", title: nextTitle, href: input.comeback ? "/home" : stepHref(next) };
  return {
    v: WIDGET_VERSION,
    day: today,
    teacher,
    streak: Math.max(0, Math.floor(input.streak)),
    grass: recentGrass(cal, levels, today),
    todayRow: mondayRow(today),
    today: { ...t, label: WIDGET_LABELS[t.state] },
    line: WIDGET_LINES[teacher][t.state],
  };
}

/** 진행 중 과정이 없을 때(온보딩 전, 과정을 지운 뒤) */
export function emptyWidgetSummary(today: DayKey, teacher: TeacherName): WidgetSummary {
  return {
    v: WIDGET_VERSION,
    day: today,
    teacher,
    streak: 0,
    grass: [],
    todayRow: mondayRow(today),
    today: {
      state: "none",
      label: WIDGET_LABELS.none,
      title: "새 과정을 시작해 보세요",
      href: "/",
    },
    line: WIDGET_LINES[teacher].none,
  };
}

export interface DoneInput {
  index: number;
  milestoneTitle: string;
  lessons: { title: string; completedDay: DayKey | null; status: string }[];
  /** 퀴즈 응시 날, 오래된 것부터 */
  quizDays: DayKey[];
  /** 마일스톤 제출 차수, 오래된 것부터 */
  milestoneRounds: { day: DayKey; passed: boolean }[];
}

/**
 * 오늘 마친 칸 제목. 잔디에 센 기록만 본다(lib/server/course.ts activityOf와 같은 규칙):
 * 퀴즈는 주차마다 첫 응시, 마일스톤은 통과할 때까지 낸 차수. 재응시·통과 뒤 재제출은 "오늘 마친 것"이 아니다.
 * 그중 마일스톤 > 퀴즈 > 레슨 순으로, 같은 종류면 뒤 주차·뒤 레슨을 고른다
 */
export function doneTodayTitle(weeks: DoneInput[], today: DayKey): string | null {
  let goal: string | null = null;
  let quiz: string | null = null;
  let lesson: string | null = null;
  for (const w of weeks) {
    if (countedMilestoneDays(w.milestoneRounds).includes(today))
      goal = `마일스톤: ${w.milestoneTitle}`;
    if (countedQuizDay(w.quizDays) === today) quiz = `${w.index}주차 퀴즈 3문제`;
    for (const l of w.lessons) {
      if (l.completedDay === today && (l.status === "done" || l.status === "short"))
        lesson = l.title;
    }
  }
  return goal ?? quiz ?? lesson;
}
