import Link from "next/link";
import { redirect } from "next/navigation";
import { Teacher } from "@/components/teacher/Teacher";
import { Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { comebackGreet, lastWeekStrip, replanDesc, REPLAN_TITLES, stripLabel } from "@/lib/domain/pause";
import { durationLabel } from "@/lib/domain/prefs";
import { REPLAN_BY_TEACHER, type ReplanKind } from "@/lib/domain/rest";
import { loadState, teacherOf } from "@/lib/server/course";
import { comebackPlan } from "@/lib/server/rest";
import { ComebackForm } from "./ComebackForm.client";
import s from "./comeback.module.css";

export const metadata = { title: "다시 왔어요 · 작심육주" };

export default async function ComebackPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const today = await getToday();
  const st = await loadState(user, today);
  if (!st) redirect("/start/personality");
  if (!st.comeback) redirect("/home");
  const plan = await comebackPlan(user, today);
  if (!plan) redirect("/home");
  const who = teacherOf(user);
  const cells = lastWeekStrip(st.cal, st.levels, today);
  const perWeek = st.cal.studyDays.length;
  const before = durationLabel(st.course.weeksCount, st.course.extraDays, perWeek);
  const after = durationLabel(st.course.weeksCount, st.course.extraDays + plan.n, perWeek);
  const kinds: ReplanKind[] = ["delay", "squeeze", "skip"];
  const options = kinds.map((k) => ({
    kind: k,
    title: REPLAN_TITLES[k],
    desc: replanDesc(k, plan.n, before, after),
  }));
  const missedInWeek = cells.filter((c) => c.kind === "missed").length;

  return (
    <Page className={s.page}>
      <header className={s.header}>
        <Link href="/home" aria-label="닫기" className={s.close}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </Link>
      </header>

      <div className={s.greet}>
        <Teacher who={who} state="listen" size={76} jump />
        <p className={s.bubble}>{comebackGreet(who, plan.missed)}</p>
      </div>

      <section aria-label="쉬었던 기간" className={s.card}>
        <div className={s.cardHead}>
          <h2>지난 일주일</h2>
          <span className={s.meta}>{plan.missed}일 쉬었어요</span>
        </div>
        <div role="img" aria-label={stripLabel(cells)} className={s.strip} data-testid="comeback-strip">
          {cells.map((c) => (
            <span key={c.day} className={s.cellWrap}>
              <span className={s.cell} data-kind={c.kind} data-level={c.level} />
              <span className={s.cellDay} data-kind={c.kind}>
                {c.wd}
              </span>
            </span>
          ))}
        </div>
        <p className={s.note}>
          {plan.prevStreak > 0 ? `연속 ${plan.prevStreak}일은 여기서 끝났지만 ` : ""}
          <b>최장 기록 {st.longest}일</b>은 그대로 남아요. 오늘 하면 다시 1일째예요.
          {plan.missed > missedInWeek ? ` 일주일 전부터 이어진 빈 날까지 모두 ${plan.missed}일이에요.` : ""}
        </p>
      </section>

      <ComebackForm options={options} recommended={REPLAN_BY_TEACHER[who]} who={who} n={plan.n} />
    </Page>
  );
}
