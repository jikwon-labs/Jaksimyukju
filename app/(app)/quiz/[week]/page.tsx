import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { LINES } from "@/lib/ai/teachers";
import { quizOf, teacherOf } from "@/lib/server/course";
import { weekAccess } from "@/lib/server/progress";
import { LockedWeek } from "@/components/curriculum/LockedWeek";
import { QuizPlay } from "./quiz.client";
import s from "./quiz.module.css";

export const metadata = { title: "주차 퀴즈 · 작심육주" };

export default async function QuizPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const n = Number(week);
  if (!Number.isInteger(n) || n < 1) notFound();
  const user = await getSessionUser();
  if (!user) redirect("/");
  const { st, access } = await weekAccess(user, await getToday(), n);
  if (!st) redirect("/start/personality");
  if (!access) notFound();
  const who = teacherOf(user);
  if (access.locked) {
    return <LockedWeek who={who} title={`${n}주차 퀴즈`} week={n} currentWeek={st.view.currentWeek} what="퀴즈" />;
  }
  const qs = quizOf(access.week.quiz);
  if (qs.length === 0) {
    return (
      <main className={s.frame}>
        <p>이번 주 퀴즈가 아직 없어요.</p>
        <Link href="/curriculum">커리큘럼으로 돌아가기</Link>
      </main>
    );
  }
  return <QuizPlay who={who} week={n} questions={qs} resultLine={LINES[who].quizResult} />;
}
