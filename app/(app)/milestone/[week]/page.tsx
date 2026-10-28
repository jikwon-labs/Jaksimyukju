import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import type { MilestoneFeedback } from "@/lib/ai/types";
import { storedFeedback } from "@/lib/domain/milestone";
import { json, teacherOf } from "@/lib/server/course";
import { criteriaOf, weekAccess } from "@/lib/server/progress";
import { LockedWeek } from "@/components/curriculum/LockedWeek";
import { MilestoneBoard } from "./milestone.client";

export const metadata = { title: "마일스톤 피드백 · 작심육주" };

export default async function MilestonePage({ params }: { params: Promise<{ week: string }> }) {
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
    return <LockedWeek who={who} title="마일스톤 피드백" week={n} currentWeek={st.view.currentWeek} what="마일스톤" />;
  }
  const labels = criteriaOf(access.week);
  const latest = access.week.milestones[0] ?? null;
  const last = latest
    ? {
        content: latest.content,
        round: latest.round,
        feedback: storedFeedback(json<MilestoneFeedback>(latest.feedback), labels),
      }
    : null;
  return (
    <MilestoneBoard
      who={who}
      week={n}
      topic={st.course.topic}
      title={access.week.milestoneTitle}
      labels={labels}
      last={last}
      nextWeek={access.last ? null : n + 1}
    />
  );
}
