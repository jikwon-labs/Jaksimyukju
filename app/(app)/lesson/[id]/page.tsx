import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { lessonIntro } from "@/lib/ai/teachers";
import type { LessonPayload } from "@/components/lesson/LessonContent";
import { lessonBody, loadState, teacherOf } from "@/lib/server/course";
import { getOwnLesson } from "@/lib/server/lesson";
import { hostOf } from "@/components/lesson/format";
import { LessonView } from "./lesson.client";

export const metadata = { title: "레슨 · 작심육주" };

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/");
  const lesson = await getOwnLesson(user, id);
  if (!lesson) notFound();
  // 레슨이 속한 과정으로 그린다(다른 과정의 알림에서 들어와도 맞는 과정을 보여 준다)
  const st = await loadState(user, await getToday(), lesson.courseId);
  if (!st) redirect("/home");
  const who = teacherOf(user);
  const step = st.view.weeks.flatMap((w) => w.steps).find((x) => x.lessonId === lesson.id);
  const body = lessonBody(lesson.body);
  const short = lessonBody(lesson.shortBody);
  const payload: LessonPayload = {
    id: lesson.id,
    title: lesson.title,
    meta: `${lesson.course.topic} · ${lesson.week.index}주차${step?.day ? ` ${step.day}요일` : ""}`,
    who,
    intro: lessonIntro(who, lesson.course.topic),
    minutes: lesson.minutes,
    extraMinutes: lesson.extraMinutes,
    status: lesson.status,
    body,
    shortBody: short?.sections?.length ? short : { core: body.core, sections: body.sections.slice(0, 1) },
    resources: lesson.resources.map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.kind,
      minutes: r.minutes,
      source: r.materialId ? "내 자료" : hostOf(r.url),
    })),
  };
  return <LessonView lesson={payload} initialShort={sp.mode === "short" || lesson.status === "summary"} />;
}
