import "server-only";
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLibrarian } from "@/lib/ai";
import type { CurriculumInput, CurriculumPlan, LessonBody, QuizQuestion } from "@/lib/ai/types";
import { type CourseMaterial, writeCourse } from "./write-course";
import { isTeacher, DEFAULT_TEACHER } from "@/lib/design/tokens";
import type { TeacherName } from "@/lib/design/types";
import { buildCourseView, type CourseView, type LessonStatus } from "@/lib/domain/course";
import { type DayKey, parseStudyDays } from "@/lib/domain/dates";
import {
  type ActivityInput,
  activityLevels,
  countedMilestoneDays,
  countedQuizDay,
  currentStreak,
  type GrassCell,
  type GrassLevel,
  grassGrid,
  longestStreak,
  missedStudyDays,
  needsComeback,
  pauseRemaining,
  type ScheduleChange,
  type StudyCalendar,
} from "@/lib/domain/rest";

export function json<T>(v: Prisma.JsonValue): T {
  return v as unknown as T;
}

export function teacherOf(user: Pick<User, "teacher">): TeacherName {
  return isTeacher(user.teacher) ? user.teacher : DEFAULT_TEACHER;
}

export async function createCourse(
  userId: string,
  input: CurriculumInput,
  plan: CurriculumPlan,
  startDate: DayKey,
  material?: CourseMaterial,
) {
  return writeCourse(prisma, getLibrarian(), userId, input, plan, startDate, material);
}

const courseInclude = {
  weeks: {
    orderBy: { index: "asc" },
    include: {
      lessons: { orderBy: { order: "asc" } },
      quizAttempts: { orderBy: { createdAt: "desc" } },
      milestones: { orderBy: { createdAt: "desc" } },
    },
  },
  restDays: true,
} satisfies Prisma.CourseInclude;

export type CourseFull = Prisma.CourseGetPayload<{ include: typeof courseInclude }>;

export async function getActiveCourse(userId: string): Promise<CourseFull | null> {
  return prisma.course.findFirst({
    where: { userId, status: { in: ["active", "finished"] } },
    orderBy: { createdAt: "desc" },
    include: courseInclude,
  });
}

export function quizPercent(score: number, total = 3): number {
  return Math.round((score / total) * 100);
}

export function activityOf(course: CourseFull): ActivityInput[] {
  const items: ActivityInput[] = [];
  for (const w of course.weeks) {
    for (const l of w.lessons) {
      if (!l.completedDay) continue;
      if (l.status === "short") items.push({ day: l.completedDay, kind: "short" });
      else if (l.status === "done")
        items.push({ day: l.completedDay, kind: l.tutorChecked ? "lesson_tutor" : "lesson" });
    }
    const quizDay = countedQuizDay(quizDaysAsc(w));
    if (quizDay) items.push({ day: quizDay, kind: "quiz" });
    for (const day of countedMilestoneDays(milestoneRoundsAsc(w)))
      items.push({ day, kind: "milestone" });
  }
  return items;
}

type WeekFull = CourseFull["weeks"][number];

/** 퀴즈 응시 날, 오래된 것부터(courseInclude는 최신순으로 읽는다) */
export function quizDaysAsc(w: Pick<WeekFull, "quizAttempts">): DayKey[] {
  return w.quizAttempts.map((q) => q.day).reverse();
}

/** 마일스톤 제출 차수, 오래된 것부터 */
export function milestoneRoundsAsc(
  w: Pick<WeekFull, "milestones">,
): { day: DayKey; passed: boolean }[] {
  return w.milestones
    .map((m) => ({ day: m.day, passed: json<{ passed?: boolean }>(m.feedback).passed === true }))
    .reverse();
}

export interface CourseState {
  course: CourseFull;
  cal: StudyCalendar;
  levels: Map<DayKey, GrassLevel>;
  view: CourseView;
  streak: number;
  longest: number;
  grass: GrassCell[][];
  missed: number;
  comeback: boolean;
  restUsed: number;
  restLeft: number;
  restingToday: boolean;
  studiedToday: boolean;
  today: DayKey;
}

export function courseState(course: CourseFull, user: Pick<User, "studyDays">, today: DayKey): CourseState {
  const cal: StudyCalendar = {
    startDate: course.startDate,
    studyDays: parseStudyDays(user.studyDays),
    restDays: new Set(course.restDays.map((r) => r.day)),
    schedule: json<ScheduleChange[]>(course.schedule),
  };
  const levels = activityLevels(activityOf(course));
  const view = buildCourseView(
    course.weeks.map((w) => ({
      index: w.index,
      goal: w.goal,
      milestoneTitle: w.milestoneTitle,
      lessons: w.lessons.map((l) => ({
        id: l.id,
        order: l.order,
        title: l.title,
        status: l.status as LessonStatus,
        minutes: l.minutes + l.extraMinutes,
        rating: l.rating,
        review: l.review,
      })),
      quizScore: w.quizAttempts[0] ? quizPercent(w.quizAttempts[0].score) : null,
      milestoneDone: w.milestones.some((m) => json<{ passed?: boolean }>(m.feedback).passed === true),
    })),
    cal.studyDays,
  );
  const weeks = Math.max(course.weeksCount + Math.ceil(course.extraDays / 5), 1);
  return {
    course,
    cal,
    levels,
    view,
    streak: currentStreak(cal, levels, today),
    longest: longestStreak(cal, levels, today),
    grass: grassGrid(cal, levels, today, weeks),
    missed: missedStudyDays(cal, levels, today).count,
    comeback: course.status === "active" && needsComeback(cal, levels, today, course.comebackDay),
    restUsed: course.restDays.length,
    restLeft: pauseRemaining(course.restDays.length),
    restingToday: cal.restDays.has(today),
    studiedToday: (levels.get(today) ?? 0) > 0,
    today,
  };
}

export async function loadState(user: User, today: DayKey): Promise<CourseState | null> {
  const course = await getActiveCourse(user.id);
  return course ? courseState(course, user, today) : null;
}

export function lessonBody(v: Prisma.JsonValue): LessonBody {
  return json<LessonBody>(v);
}

export function quizOf(v: Prisma.JsonValue): QuizQuestion[] {
  return json<QuizQuestion[]>(v);
}

/** 다음 학습 대상 레슨(아직 안 한 것) order 목록 */
export function pendingOrders(course: CourseFull): number[] {
  return course.weeks
    .flatMap((w) => w.lessons)
    .filter((l) => l.status === "todo")
    .map((l) => l.order)
    .sort((a, b) => a - b);
}

/** 모든 칸을 마쳤으면 과정을 완주로 바꾼다. 레슨·퀴즈·마일스톤 완료 뒤에 부른다 */
export async function syncCourseStatus(user: User, today: DayKey): Promise<boolean> {
  const st = await loadState(user, today);
  if (!st || st.course.status !== "active" || !st.view.finished) return false;
  await prisma.course.update({ where: { id: st.course.id }, data: { status: "finished" } });
  return true;
}
