import { redirect } from "next/navigation";
import { Teacher } from "@/components/teacher/Teacher";
import { BackHeader, Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { diffDays, WEEKDAY_KO, weekday } from "@/lib/domain/dates";
import { PAUSE_LINES, pauseCalendar } from "@/lib/domain/pause";
import { loadState, teacherOf } from "@/lib/server/course";
import { PauseForm } from "./PauseForm.client";
import s from "./pause.module.css";

export const metadata = { title: "쉬어 가기 · 작심육주" };

export default async function PausePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const today = await getToday();
  const st = await loadState(user, today);
  if (!st) redirect("/start/personality");
  const who = teacherOf(user);
  const weeks = pauseCalendar(st.cal, today);
  const reserved = [...st.cal.restDays]
    .filter((d) => diffDays(d, today) >= 0)
    .sort()
    .map((d) => ({ day: d, label: `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일 ${WEEKDAY_KO[weekday(d)]}요일` }));

  return (
    <Page className={s.page}>
      <BackHeader href="/settings" title="쉬어 가기" />
      <div className={s.teacherRow}>
        <Teacher who={who} state="listen" size={72} jump />
        <p className={s.bubble}>{st.restingToday ? "오늘은 쉬는 날이에요. 언제든 돌아오면 바로 이어 할 수 있어요." : PAUSE_LINES[who]}</p>
      </div>
      <PauseForm
        weeks={weeks}
        reserved={reserved}
        restLeft={st.restLeft}
        streak={st.streak}
        weeksCount={st.course.weeksCount}
        extraDays={st.course.extraDays}
        perWeek={st.cal.studyDays.length}
      />
    </Page>
  );
}
