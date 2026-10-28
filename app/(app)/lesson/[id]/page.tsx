import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { LINES } from "@/lib/ai/teachers";
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
  const st = await loadState(user, await getToday());
  if (!st) redirect("/start/personality");
  const who = teacherOf(user);
  const step = st.view.weeks.flatMap((w) => w.steps).find((x) => x.lessonId === lesson.id);
  const body = lessonBody(lesson.body);
  const short = lessonBody(lesson.shortBody);
  const payload: LessonPayload = {
    id: lesson.id,
    title: lesson.title,
    meta: `${lesson.course.topic} · ${lesson.week.index}주차${step?.day ? ` ${step.day}요일` : ""}`,
    who,
    intro: LINES[who].intro,
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
      source: hostOf(r.url),
    })),
  };
  return <LessonView lesson={payload} initialShort={sp.mode === "short"} />;
}
