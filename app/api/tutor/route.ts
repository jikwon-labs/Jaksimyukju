import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { devToolsEnabled } from "@/lib/clock";
import { AiError, getAi, type TutorTurn } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { lessonBody, teacherOf } from "@/lib/server/course";
import { toMessageView as view, type TutorResponse } from "@/components/lesson/tutor-types";

const AI_FAIL_COOKIE = "j6_ai_fail";

const Body = z.object({
  lessonId: z.string().min(1),
  text: z.string().max(1000).optional(),
});

/**
 * 튜터 한 턴. text가 있으면 먼저 저장하고 답을 받는다.
 * text가 없으면: 대화가 비었으면 첫 질문, 마지막이 내 말이면 다시 묻기(실패 후 재시도), 아니면 그대로 돌려준다.
 * AI가 실패해도 내 말은 이미 저장돼 있다.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { lessonId } = parsed.data;
  const text = parsed.data.text?.trim() ?? "";
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, course: { userId: user.id } } });
  if (!lesson) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const load = () => prisma.tutorMessage.findMany({ where: { lessonId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  let history = await load();
  const reply = (status = 200, error?: "ai", done = lesson.tutorChecked) =>
    NextResponse.json<TutorResponse>({ messages: history.map(view), done, error }, { status });

  if (lesson.tutorChecked) return reply();
  if (text) {
    await prisma.tutorMessage.create({ data: { lessonId, role: "user", content: text } });
    history = await load();
  } else {
    const last = history[history.length - 1];
    if (last && last.role === "ai") return reply();
  }

  try {
    // 개발·E2E 전용: j6_ai_fail=1 쿠키로 튜터 실패 화면을 볼 수 있다
    if (devToolsEnabled() && req.cookies.get(AI_FAIL_COOKIE)?.value === "1") throw new AiError("forced", "network");
    const turns: TutorTurn[] = history.map((m) => ({ role: m.role === "user" ? "user" : "ai", content: m.content }));
    const r = await getAi().tutorReply({
      teacher: teacherOf(user),
      lessonTitle: lesson.title,
      core: lessonBody(lesson.body).core,
      history: turns,
    });
    await prisma.tutorMessage.create({
      data: { lessonId, role: "ai", content: r.content, understanding: r.understanding },
    });
    if (r.done) await prisma.lesson.update({ where: { id: lessonId }, data: { tutorChecked: true } });
    history = await load();
    return reply(200, undefined, r.done);
  } catch (e) {
    if (!(e instanceof AiError)) console.error("tutor", e);
    return reply(502, "ai", false);
  }
}
