import "server-only";
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLibrarian } from "@/lib/ai";
import type { CurriculumInput, CurriculumPlan, LessonBody, QuizQuestion } from "@/lib/ai/types";
import { writeCourse } from "./write-course";
import { isTeacher, DEFAULT_TEACHER } from "@/lib/design/tokens";
import type { TeacherName } from "@/lib/design/types";
import { buildCourseView, type CourseView, type LessonStatus } from "@/lib/domain/course";
import { type DayKey, parseStudyDays } from "@/lib/domain/dates";
import {
  type ActivityInput,
  activityLevels,
  currentStreak,
  type GrassCell,
  type GrassLevel,
  grassGrid,
  longestStreak,
  missedStudyDays,
  needsComeback,
  pauseRemaining,
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
) {
  return writeCourse(prisma, getLibrarian(), userId, input, plan, startDate);
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
    for (const q of w.quizAttempts) items.push({ day: q.day, kind: "quiz" });
    for (const m of w.milestones) items.push({ day: m.day, kind: "milestone" });
  }
  return items;
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
