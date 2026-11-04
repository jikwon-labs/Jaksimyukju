import "server-only";
import type { User } from "@prisma/client";
import type { DayKey } from "@/lib/domain/dates";
import {
  doneTodayTitle,
  emptyWidgetSummary,
  widgetSummary,
  type WidgetSummary,
} from "@/lib/domain/widget";
import { loadState, milestoneRoundsAsc, quizDaysAsc, teacherOf } from "./course";

/** 홈 화면 위젯 요약. 진행 중 과정이 없으면 "시작 전" 요약 */
export async function loadWidgetSummary(user: User, today: DayKey): Promise<WidgetSummary> {
  const teacher = teacherOf(user);
  const st = await loadState(user, today);
  if (!st) return emptyWidgetSummary(today, teacher);
  const doneTitle = doneTodayTitle(
    st.course.weeks.map((w) => ({
      index: w.index,
      milestoneTitle: w.milestoneTitle,
      lessons: w.lessons.map((l) => ({
        title: l.title,
        completedDay: l.completedDay,
        status: l.status,
      })),
      quizDays: quizDaysAsc(w),
      milestoneRounds: milestoneRoundsAsc(w),
    })),
    today,
  );
  return widgetSummary({
    today,
    teacher,
    cal: st.cal,
    levels: st.levels,
    streak: st.streak,
    next: st.view.today,
    finished: st.view.finished,
    comeback: st.comeback,
    doneTitle,
  });
}
