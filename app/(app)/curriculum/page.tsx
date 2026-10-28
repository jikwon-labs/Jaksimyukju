import { redirect } from "next/navigation";
import { Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { bannerMeta, maskLocked, studyDaysLabel, weekMeta } from "@/lib/domain/curriculum";
import { loadState, teacherOf } from "@/lib/server/course";
import { CurriculumView } from "./curriculum.client";
import s from "./curriculum.module.css";

export const metadata = { title: "커리큘럼 · 작심육주" };

export default async function CurriculumPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const today = await getToday();
  const st = await loadState(user, today);
  if (!st) redirect("/start/personality");
  const { view, course } = st;
  const who = teacherOf(user);
  const last = view.weeks.length;
  const total = view.lessonsTotal;
  const done = view.lessonsDone;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Page tabs className={s.page}>
      <CurriculumView
        who={who}
        goal={course.goal}
        currentWeek={view.currentWeek}
        finished={view.finished}
        weeks={view.weeks.map((w) => ({
          ...w,
          steps: maskLocked(w.steps),
          meta: weekMeta(w, w.n === last),
          bannerMeta: bannerMeta(w, w.n === last),
        }))}
        progress={{
          topic: course.topic,
          info: `${course.weeksCount}주 · ${studyDaysLabel(st.cal.studyDays)} · 하루 ${user.minutesPerDay}분`,
          done,
          total,
          pct,
          left: total - done,
        }}
      />
    </Page>
  );
}
