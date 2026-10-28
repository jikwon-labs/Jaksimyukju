import Link from "next/link";
import { redirect } from "next/navigation";
import { Teacher } from "@/components/teacher/Teacher";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { addDays, diffDays, mondayOf, parseStudyDays, WEEKDAY_KO, weekday } from "@/lib/domain/dates";
import { studyDaysLabel } from "@/lib/domain/prefs";
import { retroChips, retroLines } from "@/lib/domain/retro";
import { loadState, teacherOf } from "@/lib/server/course";
import { RetroChat } from "./RetroChat.client";
import s from "./retro.module.css";

export const metadata = { title: "주간 회고 · 작심육주" };

export default async function RetroPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const today = await getToday();
  const st = await loadState(user, today);
  if (!st) redirect("/start/personality");
  const who = teacherOf(user);
  const { course, view } = st;
  const weekNo = Math.min(view.currentWeek, course.weeksCount);
  const week = course.weeks.find((w) => w.index === weekNo);
  const nextWeek = course.weeks.find((w) => w.index === weekNo + 1);
  const mon = mondayOf(today);
  const inThisWeek = (d: string | null) => !!d && diffDays(d, mon) >= 0 && diffDays(addDays(mon, 6), d) >= 0;
  const all = course.weeks.flatMap((w) => w.lessons);
  const doneThisWeek = all.filter((l) => (l.status === "done" || l.status === "short") && inThisWeek(l.completedDay));
  const minutes = doneThisWeek.reduce((sum, l) => sum + (l.status === "short" ? 5 : l.minutes + l.extraMinutes), 0);
  const cells = [...st.levels].filter(([d, lv]) => lv > 0 && inThisWeek(d)).length;
  const short = doneThisWeek.find((l) => l.status === "short" && l.completedDay);
  const shortDay = short?.completedDay ? WEEKDAY_KO[weekday(short.completedDay)] : null;
  const studyDays = parseStudyDays(user.studyDays);
  const titles = (week?.lessons ?? []).map((l) => l.title);
  const lines = retroLines(who, weekNo, shortDay);
  const goalDay = WEEKDAY_KO[studyDays[studyDays.length - 1] ?? 5];

  return (
    <main className={s.page}>
      <header className={s.header}>
        <Link href="/home" aria-label="뒤로" className={s.back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <Teacher who={who} size={44} jump />
        <div className={s.headText}>
          <h1>{weekNo}주차 돌아보기</h1>
          <span className={s.meta}>룸메이트 {who} · 일요일 밤 3분</span>
        </div>
      </header>

      <section aria-label="이번 주 요약" className={s.summary}>
        <div className={s.tile}>
          <span className={s.tileLabel}>레슨</span>
          <span className={s.tileValue}>
            {week ? week.lessons.filter((l) => l.status !== "todo").length : 0}/{week?.lessons.length ?? 0}
          </span>
        </div>
        <div className={s.tile}>
          <span className={s.tileLabel}>잔디</span>
          <span className={s.tileValue}>{cells}칸</span>
        </div>
        <div className={s.tile}>
          <span className={s.tileLabel}>연속</span>
          <span className={s.tileValue}>{st.streak}일</span>
        </div>
        <div className={s.tile}>
          <span className={s.tileLabel}>시간</span>
          <span className={s.tileValue}>{minutes}분</span>
        </div>
      </section>

      <RetroChat
        who={who}
        lines={lines}
        chips={[0, 1, 2].map((i) => retroChips(i, titles, user.minutesPerDay))}
        nextWeek={weekNo + 1}
        milestone={nextWeek ? `${goalDay}요일 마일스톤: ${nextWeek.milestoneTitle}` : "다음 주는 목적지까지 마무리"}
        planOpts={{
          days: studyDays.map((d) => WEEKDAY_KO[d]),
          shortDay,
          minutes: user.minutesPerDay,
          daysLabel: studyDaysLabel(studyDays),
        }}
      />
    </main>
  );
}
