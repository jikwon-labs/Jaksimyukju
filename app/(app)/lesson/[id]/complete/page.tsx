import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Teacher } from "@/components/teacher/Teacher";
import { WidgetSync } from "@/components/WidgetSync";
import { COMPLETE_LINE } from "@/components/lesson/copy";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { WEEKDAY_KO, weekday } from "@/lib/domain/dates";
import { streakChange, streakHeadline, streakSub, understandingChip, weekStrip } from "@/lib/domain/lesson";
import { prisma } from "@/lib/prisma";
import { loadState, teacherOf } from "@/lib/server/course";
import { getGroupView } from "@/lib/server/group";
import { getOwnLesson } from "@/lib/server/lesson";
import { availableProviders } from "@/lib/server/oauth";
import { CompleteActions } from "./complete.client";
import s from "./complete.module.css";

export const metadata = { title: "레슨 완료 · 작심육주" };

const CONFETTI = ["#5B8CFF", "#FF6B5E", "#4CC38A", "#FFD25E"];

export default async function CompletePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ link?: string }>;
}) {
  const { id } = await params;
  const { link } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/");
  const lesson = await getOwnLesson(user, id);
  if (!lesson) notFound();
  if (lesson.status !== "done" && lesson.status !== "short") redirect(`/lesson/${lesson.id}`);
  const today = await getToday();
  const st = await loadState(user, today, lesson.courseId);
  if (!st) redirect("/home");
  const who = teacherOf(user);

  const change = streakChange(st.cal, st.levels, today);
  const strip = weekStrip(st.grass, today);
  const weekNo = Math.max(1, st.grass.findIndex((c) => c.some((x) => x.day === today)) + 1);
  const todayCell = strip.find((c) => c.today);
  const filledToday = (todayCell?.level ?? 0) > 0;
  const dayName = WEEKDAY_KO[weekday(today)];

  const msgs = await prisma.tutorMessage.findMany({ where: { lessonId: lesson.id }, orderBy: { createdAt: "asc" } });
  const aiMsgs = msgs.filter((m) => m.role === "ai");
  const lastU = aiMsgs[aiMsgs.length - 1]?.understanding;
  const short = lesson.status === "short";
  const minutes = short ? 5 : lesson.minutes + lesson.extraMinutes;
  const understanding = short
    ? "5분 버전"
    : aiMsgs.length === 0
      ? "확인 전"
      : understandingChip(
          lastU === "이해" || lastU === "부분" || lastU === "미흡" ? lastU : null,
          msgs.filter((m) => m.role === "user").length,
        ).label;

  const group = await getGroupView(user, today);
  const others = group?.members.filter((m) => !m.me) ?? [];

  return (
    <main className={s.screen}>
      <div className={s.confetti} aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className={s.fall}
            style={{
              left: 14 + i * 31,
              width: i % 3 === 0 ? 8 : 6,
              background: CONFETTI[i % 4],
              animationDelay: `${(i % 5) * 0.18}s`,
            }}
          />
        ))}
      </div>

      <div className={s.scroll}>
        <header className={s.header}>
          <Link href="/home" aria-label="닫기" className={s.close}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </Link>
        </header>

        <div className={s.hero}>
          <Teacher who={who} state="joy" size={140} label={`기뻐서 통통 튀는 ${who} 선생님`} />
          <h1>{short ? "5분 버전으로 오늘 칸을 채웠어요" : "오늘 칸을 채웠어요"}</h1>
          <p>{COMPLETE_LINE[who]}</p>
        </div>

        <section aria-label="연속 학습" className={s.streakCard}>
          <div className={s.streakRow}>
            <strong className={`${s.streakNum} ${s.up}`} data-testid="complete-streak" data-before={change.before}>
              {change.after}일째
            </strong>
            <div className={s.streakText}>
              <span className={s.streakHead} data-record={change.record ? "true" : "false"}>
                {streakHeadline(change)}
              </span>
              <span className={s.sub12}>{streakSub(change)}</span>
            </div>
          </div>
          <div
            role="img"
            className={s.strip}
            aria-label={
              filledToday
                ? `${weekNo}주차 학습 잔디. 오늘 ${dayName}요일 칸이 새로 채워졌어요`
                : `${weekNo}주차 학습 잔디`
            }
          >
            {strip.map((c) => (
              <div key={c.day} className={s.col}>
                <span
                  className={s.cell}
                  data-kind={c.kind}
                  data-level={c.level}
                  data-day={c.day}
                  data-testid={c.today ? "complete-cell" : undefined}
                >
                  {c.today && filledToday && <span className={`${s.fill} ${s.fillAnim}`} />}
                </span>
                <span className={s.dayLabel} data-today={c.today ? "true" : "false"}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="오늘 학습" className={s.stats}>
          <div className={s.tile}>
            <span className={s.sub12}>학습 시간</span>
            <strong>{minutes}분</strong>
          </div>
          <div className={s.tile}>
            <span className={s.sub12}>튜터 질문</span>
            <strong>{aiMsgs.length}개</strong>
          </div>
          <div className={s.tile}>
            <span className={s.sub12}>이해도</span>
            <strong>{understanding}</strong>
          </div>
        </section>

        <CompleteActions
          lessonId={lesson.id}
          oneLiner={lesson.oneLiner ?? ""}
          rating={lesson.rating}
          review={lesson.review ?? ""}
          needLink={!user.linkedAt}
          providers={availableProviders()}
          linkResult={link ?? null}
          groupInitials={others.map((m) => m.initial)}
        />
      </div>
      <WidgetSync />
    </main>
  );
}
