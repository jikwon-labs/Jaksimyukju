// 과정의 칸(레슨·퀴즈·마일스톤)과 상태 계산
import { WEEKDAY_KO } from "./dates";
import { RATING_MAX } from "./lesson";

export type StepKind = "lesson" | "quiz" | "goal";
/** done 완료, five 5분 버전으로 완료, today 오늘, todo 열림, lock 잠김 */
export type StepState = "done" | "five" | "today" | "todo" | "lock";
export type LessonStatus = "todo" | "done" | "short" | "summary" | "merged";

export interface WeekInput {
  index: number;
  goal: string;
  milestoneTitle: string;
  lessons: {
    id: string;
    order: number;
    title: string;
    status: LessonStatus;
    minutes: number;
    rating?: number | null;
    review?: string | null;
  }[];
  quizScore: number | null;
  milestoneDone: boolean;
}

export interface Step {
  id: string; // "{week}-{i}"
  week: number;
  i: number;
  kind: StepKind;
  title: string;
  day: string; // 요일 글자, 퀴즈는 ""
  state: StepState;
  lessonId?: string;
  order?: number;
  minutes?: number;
  note?: string;
  /** 복귀 재조정으로 닫힌 레슨: summary(3분 요약 카드로 넘김) | merged(다음 레슨에 합침) */
  closed?: "summary" | "merged";
  /** 완료 화면에서 남긴 평점(1~5)과 후기. 끝낸 레슨에만 붙는다 */
  rating?: number;
  review?: string;
}

export type WeekStatus = "done" | "current" | "todo";

export interface WeekView {
  n: number;
  title: string;
  milestoneTitle: string;
  status: WeekStatus;
  steps: Step[];
  lessonsDone: number;
  lessonsTotal: number;
  quizScore: number | null;
  /** 바로 다음 주차까지만 칸을 보여 준다. 그 뒤는 배너만 */
  far: boolean;
}

export interface CourseView {
  weeks: WeekView[];
  today: Step | null;
  currentWeek: number;
  lessonsDone: number;
  lessonsTotal: number;
  finished: boolean;
}

/** 한 주의 학습 요일 중 마지막 날은 마일스톤, 나머지는 레슨 */
export function lessonsPerWeek(studyDayCount: number): number {
  return Math.max(1, studyDayCount - 1);
}

function lessonDone(s: LessonStatus): boolean {
  return s !== "todo";
}

/** 끝낸 레슨(done·short)의 평점과 후기. 평점이 없으면 후기도 붙이지 않는다 */
function lessonReview(l: WeekInput["lessons"][number]): Pick<Step, "rating" | "review"> {
  if (l.status !== "done" && l.status !== "short") return {};
  const r = l.rating;
  if (typeof r !== "number" || !Number.isInteger(r) || r < 1 || r > RATING_MAX) return {};
  const review = l.review?.trim();
  return review ? { rating: r, review } : { rating: r };
}

export function buildCourseView(weeks: WeekInput[], studyDays: number[]): CourseView {
  const letters = studyDays.map((d) => WEEKDAY_KO[d]);
  const goalDay = letters[letters.length - 1] ?? "";
  const raw: Step[][] = weeks.map((w) => {
    const steps: Step[] = w.lessons.map((l, i) => ({
      id: `${w.index}-${i}`,
      week: w.index,
      i,
      kind: "lesson",
      title: l.title,
      day: letters[i] ?? "",
      state: l.status === "short" ? "five" : lessonDone(l.status) ? "done" : "todo",
      lessonId: l.id,
      order: l.order,
      minutes: l.minutes,
      closed: l.status === "summary" || l.status === "merged" ? l.status : undefined,
      ...lessonReview(l),
    }));
    steps.push({
      id: `${w.index}-${steps.length}`,
      week: w.index,
      i: steps.length,
      kind: "quiz",
      title: "주차 퀴즈 3문제",
      day: "",
      state: w.quizScore !== null ? "done" : "todo",
      note: w.quizScore !== null ? `${w.quizScore}점` : undefined,
    });
    steps.push({
      id: `${w.index}-${steps.length}`,
      week: w.index,
      i: steps.length,
      kind: "goal",
      title: `마일스톤: ${w.milestoneTitle}`,
      day: goalDay,
      state: w.milestoneDone ? "done" : "todo",
    });
    return steps;
  });

  let today: Step | null = null;
  for (const steps of raw) {
    const s = steps.find((x) => x.state === "todo");
    if (s) {
      s.state = "today";
      today = s;
      break;
    }
  }
  const currentWeek = today ? today.week : weeks.length;
  for (const steps of raw) {
    for (const s of steps) {
      if (s.state === "todo" && s.week > currentWeek) s.state = "lock";
    }
  }

  let lessonsDone = 0;
  let lessonsTotal = 0;
  const views: WeekView[] = weeks.map((w, k) => {
    const steps = raw[k];
    const done = w.lessons.filter((l) => lessonDone(l.status)).length;
    lessonsDone += done;
    lessonsTotal += w.lessons.length;
    const allDone = steps.every((s) => s.state === "done" || s.state === "five");
    const status: WeekStatus = allDone ? "done" : w.index === currentWeek ? "current" : "todo";
    return {
      n: w.index,
      title: w.goal,
      milestoneTitle: w.milestoneTitle,
      status,
      steps,
      lessonsDone: done,
      lessonsTotal: w.lessons.length,
      quizScore: w.quizScore,
      far: status === "todo" && w.index > currentWeek + 1,
    };
  });
  return {
    weeks: views,
    today,
    currentWeek,
    lessonsDone,
    lessonsTotal,
    finished: today === null && weeks.length > 0,
  };
}

/** 홈의 다섯 칸짜리 짧은 길: 오늘 칸을 가운데 쪽에 두고 이번 주 칸 5개 */
export function shortPath(view: CourseView): Step[] {
  if (!view.today) return [];
  const week = view.weeks.find((w) => w.n === view.today!.week);
  if (!week) return [];
  const steps = week.steps;
  const idx = steps.findIndex((s) => s.id === view.today!.id);
  const start = Math.max(0, Math.min(idx - 2, steps.length - 5));
  return steps.slice(start, start + 5);
}

/** 오늘 칸에서 이번 주 마일스톤까지 남은 칸 수 */
export function stepsToMilestone(view: CourseView): number {
  if (!view.today) return 0;
  const week = view.weeks.find((w) => w.n === view.today!.week);
  if (!week) return 0;
  return week.steps.length - 1 - view.today.i;
}
