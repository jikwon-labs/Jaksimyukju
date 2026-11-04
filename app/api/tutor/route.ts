import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { devToolsEnabled, getToday } from "@/lib/clock";
import { AiError, getAi, type TutorTurn } from "@/lib/ai";
import { carriedUnderstanding, forceDone, stripLeak, weakSpots } from "@/lib/ai/tutor";
import { prisma } from "@/lib/prisma";
import { excerptsForTutor } from "@/lib/domain/material";
import { tutorNeedsReview } from "@/lib/domain/review";
import { lessonBody, teacherOf } from "@/lib/server/course";
import { courseMaterialTexts } from "@/lib/server/material";
import { markTutorWeak } from "@/lib/server/review";
import { lessonQuery } from "@/lib/server/write-course";
import {
  toChoices,
  toMessageView as view,
  type TutorResponse,
} from "@/components/lesson/tutor-types";

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
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, course: { userId: user.id } },
    include: { course: { select: { level: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const load = () =>
    prisma.tutorMessage.findMany({
      where: { lessonId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  let history = await load();
  const reply = (status = 200, error?: "ai", done = lesson.tutorChecked) =>
    NextResponse.json<TutorResponse>({ messages: history.map(view), done, error }, { status });

  // 확인이 끝난 뒤에는 아무 때나 묻는 질문만 받는다(F6)
  const free = lesson.tutorChecked;
  if (text) {
    await prisma.tutorMessage.create({ data: { lessonId, role: "user", content: text } });
    history = await load();
  } else {
    const last = history[history.length - 1];
    if (last && last.role === "ai") return reply();
  }

  try {
    // 개발·E2E 전용: j6_ai_fail=1 쿠키로 튜터 실패 화면을 볼 수 있다
    if (devToolsEnabled() && req.cookies.get(AI_FAIL_COOKIE)?.value === "1")
      throw new AiError("forced", "network");
    const turns: TutorTurn[] = history.map((m) => ({
      role: m.role === "user" ? "user" : "ai",
      content: m.content,
      choices: toChoices(m.choices),
    }));
    const body = lessonBody(lesson.body);
    // 과정에 내 자료가 있으면 이 레슨과 맞닿은 문장만 골라 넣는다(소유자 기준으로 읽는다)
    const material = excerptsForTutor(await courseMaterialTexts(user.id, lesson.courseId), lessonQuery(lesson.title, body)) ?? undefined;
    const raw = await getAi().tutorReply({
      material,
      teacher: teacherOf(user),
      lessonTitle: lesson.title,
      core: body.core,
      sections: body.sections,
      level: lesson.course.level,
      weak: free ? [] : await weakBefore(lesson.courseId, lesson.order),
      history: turns,
      free,
    });
    // 열린 질문 답이 상한에 닿았으면 AI가 안 끝내도 여기서 끝낸다
    const r = free ? raw : forceDone(stripLeak(raw, turns, body.core), turns, body.core);
    // 보기는 확인의 첫 질문(아직 내 답이 없을 때)에서 3개일 때만 쓴다. 그 밖에는 채팅으로 답한다
    const choices =
      !free && !history.some((m) => m.role === "user") && r.choices.length === 3
        ? r.choices
        : undefined;
    // AI가 답을 쓰는 사이 다른 요청(새로고침, 두 번째 탭)이 먼저 답을 저장했으면 이 답은 버린다
    const saved = await prisma.$transaction(async (tx) => {
      const now = await tx.tutorMessage.count({ where: { lessonId } });
      if (now !== history.length) return false;
      await tx.tutorMessage.create({
        data: {
          lessonId,
          role: "ai",
          content: r.content,
          // 자유 질문 답은 확인 단계 판정을 이어 받는다(지난 레슨 판정과 이해도 칩이 덮이지 않게)
          understanding: free ? carriedUnderstanding(history) : r.understanding,
          choices,
        },
      });
      if (r.done && !free)
        await tx.lesson.update({ where: { id: lessonId }, data: { tutorChecked: true } });
      return true;
    });
    // 확인이 덜 된 채 끝났으면(3번 틀려 정답을 들었거나 부분 이해) 그 개념을 1일 뒤 복습 카드로
    if (saved && r.done && !free && tutorNeedsReview(r.understanding)) {
      await markTutorWeak(user.id, lesson, await getToday());
    }
    history = await load();
    const done =
      free ||
      (saved
        ? r.done
        : ((await prisma.lesson.findUnique({ where: { id: lessonId } }))?.tutorChecked ?? false));
    return reply(200, undefined, done);
  } catch (e) {
    if (!(e instanceof AiError)) console.error("tutor", e);
    return reply(502, "ai", free);
  }
}

/** 같은 코스 지난 레슨들의 마지막 판정에서 확인이 덜 된 레슨 제목(최근 것부터 3개) */
async function weakBefore(courseId: string, order: number): Promise<string[]> {
  const prev = await prisma.lesson.findMany({
    where: { courseId, order: { lt: order } },
    orderBy: { order: "desc" },
    take: 10,
    select: {
      title: true,
      messages: {
        where: { role: "ai" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { understanding: true },
      },
    },
  });
  return weakSpots(
    prev
      .filter((l) => l.messages.length > 0)
      .map((l) => ({ title: l.title, understanding: l.messages[0].understanding })),
  );
}
