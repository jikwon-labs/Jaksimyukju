import Link from "next/link";
import { redirect } from "next/navigation";
import { Grass } from "@/components/course/Grass";
import { QuizChart } from "@/components/profile/QuizChart";
import { TeacherPicker } from "@/components/profile/TeacherPicker.client";
import { Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { diffDays, parseStudyDays } from "@/lib/domain/dates";
import { durationLabel, studyDaysLabel, timeLabel } from "@/lib/domain/prefs";
import { prisma } from "@/lib/prisma";
import { THEME_LABELS, parseTheme } from "@/lib/theme";
import { loadState, quizPercent, teacherOf } from "@/lib/server/course";
import p from "@/components/profile/profile.module.css";

export const metadata = { title: "내 정보 · 작심육주" };

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={p.chev}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ teacher?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const today = await getToday();
  const st = await loadState(user, today);
  if (!st) redirect("/start/personality");
  const sp = await searchParams;
  const who = teacherOf(user);
  const { course, view } = st;

  const lessonsDone = course.weeks.flatMap((w) => w.lessons).filter((l) => l.status === "done" || l.status === "short").length;
  const scores = course.weeks.map((w) => (w.quizAttempts[0] ? quizPercent(w.quizAttempts[0].score) : null));
  const nextQuiz = scores.findIndex((v) => v === null);
  const since = Math.max(1, diffDays(today, course.startDate) + 1);
  const studyDays = parseStudyDays(user.studyDays);
  const past = await prisma.course.findMany({
    where: { userId: user.id, status: { in: ["stopped", "finished"] }, id: { not: course.id } },
    orderBy: { createdAt: "desc" },
    select: { id: true, topic: true, status: true, weeksCount: true, startDate: true },
  });
  const cells = st.grass.flat().filter((c) => (c.kind === "level" || c.kind === "today") && c.level > 0).length;

  const settings: { label: string; value: string; href: string }[] = [
    { label: "학습 요일", value: studyDaysLabel(studyDays), href: "/settings" },
    { label: "하루 학습 시간", value: `${user.minutesPerDay}분`, href: "/settings" },
    { label: "알림 시각", value: timeLabel(user.notifyTime), href: "/settings" },
    { label: "화면 테마", value: THEME_LABELS[parseTheme(user.theme)], href: "/settings" },
    { label: "지난 과정", value: past.length ? `${past.length}개` : "없음", href: "#past" },
    { label: "계정", value: user.email ?? "게스트", href: "/settings" },
  ];

  return (
    <Page tabs className={p.page}>
      <header className={p.header}>
        <h1>내 정보</h1>
        <Link href="/settings" className={p.settingsLink}>
          설정
        </Link>
      </header>

      <TeacherPicker initial={who} since={`함께한 지 ${since}일`} open={sp.teacher === "1"} />

      <section aria-label="학습 기록" className={p.stats}>
        <div className={p.stat}>
          <span className={p.statLabel}>연속 학습</span>
          <span className={p.statValue} data-accent="true" data-testid="profile-streak">
            {st.streak}일
          </span>
        </div>
        <div className={p.stat}>
          <span className={p.statLabel}>최장 기록</span>
          <span className={p.statValue}>{st.longest}일</span>
        </div>
        <div className={p.stat}>
          <span className={p.statLabel}>완료 레슨</span>
          <span className={p.statValue}>{lessonsDone}개</span>
        </div>
      </section>

      <section aria-label="전체 잔디" className={p.card}>
        <div className={p.cardHead}>
          <h2>전체 잔디</h2>
          <span className={p.meta}>
            {durationLabel(course.weeksCount, course.extraDays, studyDays.length)} 과정 · {view.currentWeek}주차
          </span>
        </div>
        <div className={p.grassScroll}>
          <Grass cols={st.grass} cell={12} gap={3} label={`전체 ${st.grass.length}주 중 ${cells}일 학습`} />
        </div>
      </section>

      <section aria-label="실력 변화" className={p.card}>
        <div className={p.cardHead}>
          <h2>실력 변화</h2>
          <span className={p.meta}>주차별 퀴즈 점수</span>
        </div>
        <QuizChart values={scores} />
        <p className={p.note}>
          주차 마지막 날 퀴즈를 풀면 그래프가 채워져요.
          {nextQuiz >= 0 ? ` ${nextQuiz + 1}주차 퀴즈는 그 주 마지막 학습일에 열려요.` : ""} 점수는 나만 볼 수 있어요.
        </p>
      </section>

      <section aria-label="설정" className={p.list}>
        {settings.map((r) => (
          <Link key={r.label} href={r.href} className={p.row}>
            <span className={p.rowLabel}>{r.label}</span>
            <span className={p.rowValue}>{r.value}</span>
            <Chevron />
          </Link>
        ))}
      </section>

      <section aria-label="지난 과정" className={p.pastWrap} id="past">
        <h2 className={p.h2}>지난 과정</h2>
        {past.length === 0 ? (
          <p className={p.note}>아직 마친 과정이 없어요. 지금 과정을 끝내면 여기에 남아요.</p>
        ) : (
          <ul className={p.past}>
            {past.map((c) => (
              <li key={c.id} className={p.pastItem}>
                <span className={p.pastTopic}>{c.topic}</span>
                <span className={p.meta}>
                  {c.weeksCount}주 · {c.startDate} 시작
                </span>
                <span className={p.pastStatus} data-status={c.status}>
                  {c.status === "finished" ? "완주" : "멈춤"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}
