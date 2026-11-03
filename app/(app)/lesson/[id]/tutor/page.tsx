import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { requireAiConsent } from "@/lib/server/ai-consent";
import { prisma } from "@/lib/prisma";
import { teacherOf } from "@/lib/server/course";
import { getOwnLesson } from "@/lib/server/lesson";
import { toMessageView } from "@/components/lesson/tutor-types";
import { TutorChat } from "./tutor.client";

export const metadata = { title: "튜터 · 작심육주" };

export default async function TutorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/");
  // 튜터 대화는 외부 AI로 간다. 동의 전이면 안내부터
  await requireAiConsent(user, `/lesson/${id}/tutor`);
  const lesson = await getOwnLesson(user, id);
  if (!lesson) notFound();
  const messages = await prisma.tutorMessage.findMany({
    where: { lessonId: lesson.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return (
    <TutorChat
      lessonId={lesson.id}
      title={lesson.title}
      who={teacherOf(user)}
      initial={messages.map(toMessageView)}
      initialDone={lesson.tutorChecked}
    />
  );
}
