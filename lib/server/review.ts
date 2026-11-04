import "server-only";
// 간격 복습 카드 저장과 풀기. 일정 계산은 lib/domain/review.ts 순수 함수가 한다.
// 카드는 세 곳에서 생긴다: 레슨 완료(lib/server/lesson.ts), 주차 퀴즈에서 틀린 문제(app/actions/course.ts),
// 튜터 확인에서 헷갈린 개념(app/api/tutor/route.ts). 어느 쪽이 실패해도 원래 흐름은 막지 않는다.
import { Prisma, type User } from "@prisma/client";
import { getAi, type QuizQuestion } from "@/lib/ai";
import { hasAiConsent } from "@/lib/server/ai-consent";
import { mockReviewQuestion } from "@/lib/ai/review";
import type { DayKey } from "@/lib/domain/dates";
import {
  firstSchedule,
  isDue,
  lessonKey,
  nextDueDay,
  nextLabel,
  nextSchedule,
  pickDue,
  quizKey,
  type ReviewSource,
  sourceAfterAnswer,
  sourceLabel,
  validQuestion,
  wrongIndexes,
} from "@/lib/domain/review";
import { prisma } from "@/lib/prisma";
import { lessonBody, teacherOf, type CourseState } from "./course";

async function restDaysOf(courseId: string): Promise<Set<DayKey>> {
  const rows = await prisma.restDay.findMany({ where: { courseId }, select: { day: true } });
  return new Set(rows.map((r) => r.day));
}

/** 카드 만들기가 실패해도 레슨 완료·퀴즈·튜터 흐름은 그대로 간다 */
async function quietly(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`[review] ${label}`, e);
  }
}

/** 레슨을 마치면(전체든 5분 버전이든) 1일 뒤 복습 카드를 하나 만든다. 이미 있으면 그대로 둔다 */
export async function addLessonCard(
  userId: string,
  lesson: { id: string; courseId: string; title: string },
  today: DayKey,
): Promise<void> {
  await quietly("lesson card", async () => {
    const s = firstSchedule(today, await restDaysOf(lesson.courseId));
    await prisma.reviewCard.createMany({
      data: [
        {
          userId,
          courseId: lesson.courseId,
          lessonId: lesson.id,
          sourceKey: lessonKey(lesson.id),
          source: "lesson" satisfies ReviewSource,
          title: lesson.title,
          step: s.step,
          dueDay: s.dueDay,
        },
      ],
      skipDuplicates: true,
    });
  });
}

/** 튜터 확인이 덜 된 채(3번 틀려 정답을 들었거나 부분 이해) 끝나면 그 레슨 카드를 "헷갈린 개념"으로 바꾸고 1일 뒤로 다시 잡는다 */
export async function markTutorWeak(
  userId: string,
  lesson: { id: string; courseId: string; title: string },
  today: DayKey,
): Promise<void> {
  await quietly("tutor card", async () => {
    const s = firstSchedule(today, await restDaysOf(lesson.courseId));
    const reset = { source: "tutor", step: s.step, dueDay: s.dueDay, retired: false, question: Prisma.DbNull };
    await prisma.reviewCard.upsert({
      where: { courseId_sourceKey: { courseId: lesson.courseId, sourceKey: lessonKey(lesson.id) } },
      create: { userId, courseId: lesson.courseId, lessonId: lesson.id, sourceKey: lessonKey(lesson.id), title: lesson.title, ...reset },
      update: reset,
    });
  });
}

/** 퀴즈에서 틀린 문제마다 카드. 문제는 퀴즈 문제를 그대로 쓴다. 다시 틀리면 1일로 돌아간다 */
export async function addQuizMisses(
  userId: string,
  courseId: string,
  week: { id: string; index: number },
  questions: QuizQuestion[],
  answers: { correct: boolean }[],
  today: DayKey,
): Promise<void> {
  const wrong = wrongIndexes(answers).filter((i) => questions[i]);
  if (wrong.length === 0) return;
  await quietly("quiz cards", async () => {
    const s = firstSchedule(today, await restDaysOf(courseId));
    for (const i of wrong) {
      const q = questions[i];
      const question = { q: q.q, choices: q.choices, answer: q.answer, why: q.why };
      const reset = { step: s.step, dueDay: s.dueDay, retired: false, question };
      await prisma.reviewCard.upsert({
        where: { courseId_sourceKey: { courseId, sourceKey: quizKey(week.id, i) } },
        create: { userId, courseId, sourceKey: quizKey(week.id, i), source: "quiz", title: `${week.index}주차 퀴즈`, ...reset },
        update: reset,
      });
    }
  });
}

async function liveCards(courseId: string) {
  return prisma.reviewCard.findMany({ where: { courseId, retired: false }, orderBy: { createdAt: "asc" } });
}

/** 오늘 풀 카드 수(한 번에 푸는 상한까지) */
export async function countDue(st: CourseState): Promise<number> {
  return pickDue(await liveCards(st.course.id), st.today, st.restingToday).length;
}

export interface ReviewSummary {
  /** 오늘 풀 카드 수 */
  due: number;
  /** 오늘 이미 푼 카드 수 */
  doneToday: number;
  /** 다음 복습 날(오늘 풀 카드가 없을 때 안내) */
  nextDay: DayKey | null;
}

export async function reviewSummary(st: CourseState): Promise<ReviewSummary> {
  const all = await prisma.reviewCard.findMany({
    where: { courseId: st.course.id },
    select: { id: true, source: true, dueDay: true, retired: true, createdAt: true, lastDay: true },
  });
  return {
    due: pickDue(all, st.today, st.restingToday).length,
    doneToday: all.filter((c) => c.lastDay === st.today).length,
    nextDay: nextDueDay(all, st.today, st.cal.restDays),
  };
}

export interface SessionCard {
  id: string;
  label: string;
  question: QuizQuestion;
}

/** 오늘 풀 카드와 문제. 문제가 없는 카드는 레슨 본문으로 만든다(AI가 실패하면 mock 문제로 대신한다) */
export async function prepareSession(user: User, st: CourseState): Promise<SessionCard[]> {
  const cards = pickDue(await liveCards(st.course.id), st.today, st.restingToday);
  const missing = cards.filter((c) => !validQuestion(c.question) && c.lessonId);
  const lessons = missing.length
    ? await prisma.lesson.findMany({ where: { id: { in: missing.map((c) => c.lessonId as string) } } })
    : [];
  const who = teacherOf(user);
  // 외부 AI 이용에 동의하지 않았으면 레슨 본문을 보내지 않고 mock 문제로 만든다
  const useAi = missing.length > 0 && (await hasAiConsent(user));
  const made = await Promise.all(
    missing.map(async (c) => {
      const lesson = lessons.find((l) => l.id === c.lessonId);
      if (!lesson) return null;
      const body = lessonBody(lesson.body);
      const input = {
        teacher: who,
        lessonTitle: lesson.title,
        core: body.core,
        sections: body.sections ?? [],
        level: st.course.level,
        focus: c.source === "tutor" ? ("tutor" as const) : ("lesson" as const),
        step: c.step,
      };
      let q: QuizQuestion;
      try {
        if (!useAi) throw new Error("no ai consent");
        q = await getAi().reviewQuestion(input);
        if (!validQuestion(q)) throw new Error("bad review question");
      } catch (e) {
        if (useAi) console.warn("[review] AI 문제 대신 mock 문제를 쓴다:", e instanceof Error ? e.message : e);
        q = mockReviewQuestion(input);
      }
      const question = { q: q.q, choices: q.choices, answer: q.answer, why: q.why };
      // 두 탭에서 동시에 열어도 처음 저장한 문제 하나로 채점한다
      const saved = await prisma.reviewCard.updateMany({
        where: { id: c.id, question: { equals: Prisma.DbNull } },
        data: { question },
      });
      if (saved.count > 0) return { id: c.id, question };
      const again = await prisma.reviewCard.findUnique({ where: { id: c.id }, select: { question: true } });
      return again && validQuestion(again.question) ? { id: c.id, question: again.question } : null;
    }),
  );
  const out: SessionCard[] = [];
  for (const c of cards) {
    const q = validQuestion(c.question) ? c.question : made.find((m) => m?.id === c.id)?.question;
    if (q) out.push({ id: c.id, label: sourceLabel(c.source, c.title), question: q });
  }
  return out;
}

export type AnswerResult =
  | { ok: true; correct: boolean; answer: number; next: string; retired: boolean }
  | { ok: false; message: string };

/** 한 장 풀기. 오늘 풀 차례인 카드만 받고, 같은 카드를 두 번 눌러도 한 번만 반영한다 */
export async function answerCard(user: User, cardId: string, choice: number, today: DayKey): Promise<AnswerResult> {
  const card = await prisma.reviewCard.findFirst({
    where: { id: cardId, userId: user.id, course: { status: { in: ["active", "finished"] } } },
  });
  if (!card) return { ok: false, message: "카드를 찾지 못했어요" };
  const rest = await restDaysOf(card.courseId);
  if (!isDue(card, today, rest.has(today))) return { ok: false, message: "오늘 풀 카드가 아니에요" };
  const q = card.question;
  if (!validQuestion(q)) return { ok: false, message: "문제를 다시 불러와 주세요" };
  if (!Number.isInteger(choice) || choice < 0 || choice >= q.choices.length) return { ok: false, message: "보기를 다시 골라 주세요" };
  const correct = choice === q.answer;
  const next = nextSchedule(card.step, correct, today, rest);
  const changed = await prisma.reviewCard.updateMany({
    where: { id: card.id, step: card.step, dueDay: card.dueDay, retired: false },
    data: {
      step: next.step,
      dueDay: next.dueDay,
      retired: next.retired,
      source: sourceAfterAnswer(card.source, correct),
      lastDay: today,
      reviews: { increment: 1 },
      ...(correct ? {} : { lapses: { increment: 1 } }),
      // 레슨 카드는 다음 간격에 다른 각도로 묻도록 문제를 비운다. 퀴즈 카드는 같은 문제를 다시 본다
      ...(card.lessonId ? { question: Prisma.DbNull } : {}),
    },
  });
  if (changed.count === 0) return { ok: false, message: "이미 푼 카드예요" };
  return { ok: true, correct, answer: q.answer, next: nextLabel(next, today), retired: next.retired };
}
