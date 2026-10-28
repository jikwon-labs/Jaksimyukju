import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeTeacher } from "@/components/teacher/HomeTeacher";
import { Teacher } from "@/components/teacher/Teacher";
import { Grass } from "@/components/course/Grass";
import { ShortPath } from "@/components/course/ShortPath";
import { NudgeButton } from "@/components/NudgeButton";
import { Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { LINES } from "@/lib/ai/teachers";
import { shortPath, stepsToMilestone, type Step } from "@/lib/domain/course";
import { WEEKDAY_KO, weekday } from "@/lib/domain/dates";
import { NUDGE_MESSAGES } from "@/lib/domain/limits";
import { prisma } from "@/lib/prisma";
import { loadState, teacherOf } from "@/lib/server/course";
import { getGroupView } from "@/lib/server/group";
import s from "./home.module.css";

export const metadata = { title: "오늘 · 작심육주" };

function stepHref(st: Step, short = false): string {
  if (st.kind === "quiz") return `/quiz/${st.week}`;
  if (st.kind === "goal") return `/milestone/${st.week}`;
  return `/lesson/${st.lessonId}${short ? "?mode=short" : ""}`;
}

function stepMeta(st: Step, topic: string): string {
  if (st.kind === "quiz") return `${topic} · 이번 주 레슨으로 3문제 · 약 3분`;
  if (st.kind === "goal") return `${topic} · 선생님이 기준 3개로 피드백해요`;
  return `${topic} · 약 ${st.minutes ?? 10}분 · 설명과 튜터 질문 3개`;
}

const DAYS_KO = ["", "하루째", "이틀째", "사흘째", "나흘째", "닷새째"];

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const today = await getToday();
  const st = await loadState(user, today);
  if (!st) redirect("/start/personality");
  if (st.comeback) redirect("/comeback");
  const who = teacherOf(user);
  const L = LINES[who];
  const { view, course } = st;
  const todayStep = view.today;
  const path = shortPath(view);
  const toGoal = stepsToMilestone(view);
  const group = await getGroupView(user, today);
  const others = group?.members.filter((m) => !m.me) ?? [];
  const studiedCount = others.filter((m) => m.studiedToday).length;
  const resting = others.find((m) => m.resting);
  const missing = others.filter((m) => !m.studiedToday && !m.resting).sort((a, b) => b.missed - a.missed)[0];
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  const dayName = WEEKDAY_KO[weekday(today)];
  const pathLabel = path
    .map((x) => `${x.day ? x.day + "요일 " : ""}${x.kind === "quiz" ? "주차 퀴즈" : x.kind === "goal" ? "마일스톤" : "레슨"} ${x.state === "today" ? "오늘" : x.state === "todo" ? "예정" : "완료"}`)
    .join(", ");
  const weekCells = st.grass.flat().filter((c) => c.kind === "level" && c.level > 0).length;
  const offDays = st.cal.studyDays.length < 7;

  return (
    <Page tabs className={s.page}>
      <header className={s.header}>
        <span className={s.logo}>작심육주</span>
        <Link href="/notifications" aria-label={`알림 ${unread}개`} className={s.bell}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
          {unread > 0 && <span className={s.dot} />}
        </Link>
      </header>

      <div className={s.greet}>
        <Teacher who={who} size={48} jump />
        <div className={s.bubble}>
          <span className={s.bubbleName}>{who} 선생님</span>
          <p>{st.studiedToday ? `오늘 몫은 끝냈어요. 연속 ${st.streak}일째예요.` : L.home}</p>
        </div>
      </div>

      {todayStep ? (
        <section aria-label="오늘 할 일" className={s.today} data-done={st.studiedToday ? "true" : "false"}>
          <HomeTeacher who={who} />
          <div className={s.kickerRow}>
            <span className={s.pill}>{st.studiedToday ? "오늘은 끝! 다음 칸" : "오늘 할 일"}</span>
            <span className={s.meta}>
              {todayStep.week}주차 {dayName}요일 · 마일스톤까지 {toGoal}칸
            </span>
          </div>
          <ShortPath steps={path} label={`${todayStep.week}주차 길: ${pathLabel}. 눌러서 커리큘럼 지도 보기`} />
          <h1 className={s.title}>{todayStep.kind === "goal" ? todayStep.title : todayStep.kind === "quiz" ? `${todayStep.week}주차 퀴즈 3문제` : todayStep.title}</h1>
          <p className={s.meta13}>{stepMeta(todayStep, course.topic)}</p>
          <div className={s.actions}>
            <Link href={stepHref(todayStep)} className={s.start}>
              학습 시작
            </Link>
            {todayStep.kind === "lesson" && (
              <Link href={stepHref(todayStep, true)} className={s.short}>
                5분 버전
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section aria-label="오늘 할 일" className={s.today}>
          <span className={s.pill}>목적지 도착</span>
          <h1 className={s.title}>과정을 모두 마쳤어요</h1>
          <div className={s.actions}>
            <Link href="/finish" className={s.start}>
              도착 기록 보기
            </Link>
          </div>
        </section>
      )}

      <section aria-label="학습 잔디" className={s.card}>
        <div className={s.cardHead}>
          <h2>학습 잔디</h2>
          <span className={s.meta}>
            {course.weeksCount}주 과정 중 {Math.min(view.currentWeek, course.weeksCount)}주차
          </span>
        </div>
        <div className={s.grassBody}>
          <Grass cols={st.grass} label={`지금까지 ${weekCells}일 학습. 오늘은 ${view.currentWeek}주차 ${dayName}요일`} />
          <div className={s.streak}>
            <span className={s.meta}>연속 학습</span>
            <strong className={s.streakNum} data-testid="streak">
              {st.streak}일째
            </strong>
            <span className={s.longest}>최장 기록 {st.longest}일</span>
            {offDays && <span className={s.note}>쉬는 날로 정한 주말은 연속이 끊기지 않아요</span>}
          </div>
        </div>
      </section>

      {group && others.length > 0 ? (
        <section aria-label="함께하는 사람" className={s.people}>
          <Link href="/group" className={s.avatars} aria-label="그룹 보기">
            {others.slice(0, 3).map((m, i) => (
              <span key={m.id} className={s.avatar} data-i={i}>
                {m.initial}
              </span>
            ))}
          </Link>
          <div className={s.peopleText}>
            <span className={s.peopleMain}>오늘 {studiedCount}명이 학습했어요</span>
            <span className={s.meta}>
              {missing && missing.missed >= 2
                ? `${missing.name}님은 ${DAYS_KO[Math.min(missing.missed, 5)]} 쉬는 중`
                : resting
                  ? `${resting.name}님은 쉬어 가는 중`
                  : "모두 잘 가고 있어요"}
            </span>
          </div>
          {missing && (
            <NudgeButton
              toId={missing.id}
              name={missing.name}
              disabledMessage={missing.nudge.ok ? undefined : NUDGE_MESSAGES[missing.nudge.reason]}
            />
          )}
        </section>
      ) : (
        <section aria-label="함께하는 사람" className={s.people}>
          <div className={s.peopleText}>
            <span className={s.peopleMain}>아직 함께하는 사람이 없어요</span>
            <span className={s.meta}>초대 링크로 동료를 불러 보세요</span>
          </div>
          <Link href="/group/invite" className={s.inviteBtn}>
            초대하기
          </Link>
        </section>
      )}
    </Page>
  );
}
