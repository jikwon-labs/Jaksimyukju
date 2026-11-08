import Link from "next/link";
import { redirect } from "next/navigation";
import { Grass } from "@/components/course/Grass";
import { Teacher } from "@/components/teacher/Teacher";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { Medal } from "@/components/medal/Medal";
import { MedalGate } from "@/components/medal/MedalGate";
import { finishLine, nextCourses, quizAverage, stepsLeft } from "@/lib/domain/finish";
import { prisma } from "@/lib/prisma";
import { json, loadState, teacherOf } from "@/lib/server/course";
import { SaveCard } from "./save.client";
import s from "./finish.module.css";

export const metadata = { title: "목적지 도착 · 작심육주" };

export default async function FinishPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const today = await getToday();
  const st = await loadState(user, today);
  if (!st) redirect("/start/personality");
  const { course, view } = st;
  const who = teacherOf(user);
  const finished = view.finished || course.status === "finished";
  const weeks = course.weeksCount;
  const lastWeek = course.weeks[course.weeks.length - 1];
  const doneDays = course.weeks.flatMap((w) => [...w.lessons.map((l) => l.completedDay ?? ""), ...w.milestones.map((m) => m.day)]);
  const lastDay = doneDays.filter(Boolean).sort().pop() ?? today;

  const subs = course.weeks
    .flatMap((w) => w.milestones.map((m) => ({ ...m, weekIndex: w.index })))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const passed = subs.filter((m) => json<{ passed?: boolean }>(m.feedback).passed === true);
  const first = subs[0] ?? null;
  const now = [...passed].reverse().find((m) => m.weekIndex === lastWeek?.index) ?? passed[passed.length - 1] ?? null;

  const memberships = await prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } });
  const together = memberships.length
    ? new Set(
        (
          await prisma.groupMember.findMany({
            where: { groupId: { in: memberships.map((m) => m.groupId) }, userId: { not: user.id } },
            select: { userId: true },
          })
        ).map((m) => m.userId),
      ).size
    : 0;
  const avg = quizAverage(view.weeks.map((w) => w.quizScore));
  const stats = [
    { label: "채운 칸", value: `${view.lessonsDone} / ${view.lessonsTotal}` },
    { label: "최장 연속", value: `${st.longest}일` },
    { label: "퀴즈 평균", value: avg === null ? "아직 없음" : `${avg}점` },
    { label: "함께한 사람", value: `${together}명` },
  ];
  const left = stepsLeft(view.weeks);
  const studied = st.grass.flat().filter((c) => (c.kind === "level" || c.kind === "today") && c.level > 0).length;

  return (
    <main className={s.page}>
      <header className={s.header}>
        <Link href="/curriculum" aria-label="뒤로" className={s.back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 className={s.h1}>목적지 도착</h1>
      </header>

      <section aria-label={finished ? "과정 완료" : "목적지까지"} className={`${s.hero} ${s.rise}`} data-finished={finished ? "true" : "false"}>
        {finished ? (
          <Medal weeks={weeks} teacher={who} size={132} />
        ) : (
          <>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 21V4" />
              <path d="M6 4h11l-2 4 2 4H6" />
            </svg>
            <Teacher who={who} state="base" size={110} />
          </>
        )}
        <span className={s.heroKicker}>{finished ? `${weeks}주 과정 완주` : `목적지까지 ${left}칸`}</span>
        <h2 className={s.heroTitle}>{course.topic}</h2>
        <p className={s.heroLine}>{finished ? finishLine(who, weeks) : `${course.goal}. 다 오면 여기서 처음과 지금을 같이 볼 거예요.`}</p>
      </section>

      <section aria-label={`${weeks}주 기록`} className={s.stats}>
        {stats.map((x) => (
          <div key={x.label} className={s.stat}>
            <span className={s.statLabel}>{x.label}</span>
            <span className={s.statValue}>{x.value}</span>
          </div>
        ))}
      </section>

      <section aria-label="과정 기록" className={s.card}>
        <span className={s.blockLabel}>과정 기록</span>
        <Grass cols={st.grass} label={`과정 동안 ${studied}일 학습`} cell={14} gap={3} />
      </section>

      <section aria-label="처음과 지금" className={s.card}>
        <div className={s.block}>
          <span className={s.blockLabel}>처음 (1주차 진단)</span>
          <p className={s.quote}>{first ? `"${first.content.split("\n")[0]}"` : `"${course.level}" 수준에서 시작했어요`}</p>
        </div>
        <hr className={s.divider} />
        <div className={s.block}>
          <span className={s.nowLabel}>{finished ? "지금 (최종 마일스톤)" : "지금 (최근 마일스톤)"}</span>
          <p className={s.quote}>{now ? now.content : "아직 통과한 마일스톤이 없어요."}</p>
        </div>
        {now && (
          <Link href={`/milestone/${now.weekIndex}`} className={s.again}>
            {finished ? "최종 결과물 다시 보기" : "결과물 다시 보기"}
          </Link>
        )}
      </section>

      {finished ? (
        <>
          <SaveCard
            card={{
              name: user.name,
              topic: course.topic,
              goal: course.goal,
              weeks,
              lessons: view.lessonsTotal,
              longest: st.longest,
              start: course.startDate,
              end: lastDay,
              teacher: who,
            }}
          />
          <section aria-label="다음 과정" className={s.next}>
            <h2 className={s.nextTitle}>{who} 선생님이 추천하는 다음 길</h2>
            {nextCourses(course.topic, course.level).map((c) => (
              <Link key={c.title} href={c.href} className={s.course}>
                <span className={s.courseText}>
                  <span className={s.courseTitle}>{c.title}</span>
                  <span className={s.courseDesc}>{c.desc}</span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
            <Link href="/start/topic?from=finish" className={s.primary}>
              새 주제 직접 정하기
            </Link>
          </section>
        </>
      ) : (
        <Link href="/curriculum" className={s.primary}>
          지도로 돌아가기
        </Link>
      )}
      <MedalGate user={user} />
    </main>
  );
}
