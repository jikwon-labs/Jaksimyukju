// 간격 복습(Duolingo·Anki 식)의 순수 계산. 서버(lib/server/review.ts)와 스케줄러가 같이 쓴다.
// 간격은 1일 -> 3일 -> 7일 -> 14일. 맞히면 다음 간격, 틀리면 1일로 돌아간다. 14일 간격까지 맞히면 졸업한다.
// 쉬어 가기(RestDay)로 정한 날에는 복습도 쉰다: 그날로 잡힐 일정은 다음 날로 미루고, 그날은 복습할 카드가 없다.
// 복습은 잔디·연속 기록에 세지 않는다(잔디는 진도다). 복습만 하고 레슨을 안 한 학습일은 지금처럼 빈 날이다.
import type { TeacherName } from "@/lib/design/types";
import { addDays, type DayKey, diffDays, WEEKDAY_KO, weekday } from "./dates";

export const REVIEW_INTERVALS = [1, 3, 7, 14] as const;
/** 한 번에 푸는 카드 수 상한. 한 장에 30초쯤이라 3분 안에 끝난다 */
export const REVIEW_SESSION_MAX = 6;
/** 한 장에 드는 시간(초) */
export const REVIEW_SECONDS_PER_CARD = 30;
/** 쉬는 날이 이어져도 이만큼만 미룬다(쉬어 가기는 한 과정에 10일까지라 넘을 일이 없다) */
const MAX_SHIFT = 30;

export type ReviewSource = "lesson" | "tutor" | "quiz";

export interface ReviewSchedule {
  step: number;
  dueDay: DayKey;
  retired: boolean;
}

/** 쉬는 날이면 쉬지 않는 첫 날로 미룬다 */
export function skipRestDays(day: DayKey, restDays: ReadonlySet<DayKey>): DayKey {
  let d = day;
  for (let i = 0; i < MAX_SHIFT && restDays.has(d); i++) d = addDays(d, 1);
  return d;
}

export function intervalOf(step: number): number {
  const i = Math.min(Math.max(0, Math.floor(step)), REVIEW_INTERVALS.length - 1);
  return REVIEW_INTERVALS[i];
}

/** 새 카드(또는 틀려서 처음으로 돌아간 카드): 1일 뒤 */
export function firstSchedule(today: DayKey, restDays: ReadonlySet<DayKey>): ReviewSchedule {
  return { step: 0, dueDay: skipRestDays(addDays(today, REVIEW_INTERVALS[0]), restDays), retired: false };
}

/**
 * 한 장을 푼 뒤 다음 일정. 맞히면 다음 간격(마지막 14일 간격을 맞히면 졸업), 틀리면 1일로 돌아간다.
 * 늦게 풀어도(밀린 카드) 간격은 푼 날부터 센다
 */
export function nextSchedule(step: number, correct: boolean, today: DayKey, restDays: ReadonlySet<DayKey>): ReviewSchedule {
  if (!correct) return firstSchedule(today, restDays);
  const next = Math.max(0, Math.floor(step)) + 1;
  if (next >= REVIEW_INTERVALS.length) return { step: REVIEW_INTERVALS.length - 1, dueDay: today, retired: true };
  return { step: next, dueDay: skipRestDays(addDays(today, REVIEW_INTERVALS[next]), restDays), retired: false };
}

export interface DueCandidate {
  id: string;
  source: string;
  dueDay: DayKey;
  retired: boolean;
  createdAt: Date;
}

const SOURCE_RANK: Record<string, number> = { tutor: 0, quiz: 1, lesson: 2 };

/** 오늘 복습할 수 있는 카드인지. 쉬는 날에는 아무것도 없다 */
export function isDue(card: Pick<DueCandidate, "dueDay" | "retired">, today: DayKey, restingToday: boolean): boolean {
  return !restingToday && !card.retired && diffDays(today, card.dueDay) >= 0;
}

/**
 * 오늘 풀 카드. 오래 밀린 것부터, 같은 날이면 헷갈린 개념(튜터)·틀린 문제(퀴즈)·레슨 순, 그다음 만든 순.
 * 한 번에 REVIEW_SESSION_MAX장까지
 */
export function pickDue<T extends DueCandidate>(cards: readonly T[], today: DayKey, restingToday: boolean, max = REVIEW_SESSION_MAX): T[] {
  return cards
    .filter((c) => isDue(c, today, restingToday))
    .sort(
      (a, b) =>
        diffDays(a.dueDay, b.dueDay) ||
        (SOURCE_RANK[a.source] ?? 9) - (SOURCE_RANK[b.source] ?? 9) ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    )
    .slice(0, Math.max(0, max));
}

/** 내일부터 셀 때 가장 이른 복습 날(쉬는 날은 건너뛴 날). 없으면 null */
export function nextDueDay(
  cards: readonly Pick<DueCandidate, "dueDay" | "retired">[],
  today: DayKey,
  restDays: ReadonlySet<DayKey> = new Set(),
): DayKey | null {
  const tomorrow = addDays(today, 1);
  const days = cards
    .filter((c) => !c.retired && diffDays(c.dueDay, today) > 0)
    .map((c) => skipRestDays(diffDays(c.dueDay, tomorrow) > 0 ? c.dueDay : tomorrow, restDays));
  return days.length ? days.sort()[0] : null;
}

/** n장에 드는 시간(분). 1장이어도 1분 */
export function reviewMinutes(n: number): number {
  return Math.max(1, Math.ceil((Math.max(0, n) * REVIEW_SECONDS_PER_CARD) / 60));
}

/** 홈 진입점 문구: "오늘 복습 4개 · 2분" */
export function reviewEntryLabel(n: number): string {
  return `오늘 복습 ${n}개 · ${reviewMinutes(n)}분`;
}

/** 다음 복습까지 남은 날 문구 */
export function nextLabel(s: ReviewSchedule, today: DayKey): string {
  if (s.retired) return "이제 오래 기억할 거예요";
  const n = diffDays(s.dueDay, today);
  return n <= 1 ? "내일 한 번 더 볼게요" : `${n}일 뒤에 다시 볼게요`;
}

/** 퀴즈 응시에서 틀린 문제 번호 */
export function wrongIndexes(answers: readonly { correct: boolean }[]): number[] {
  return answers.flatMap((a, i) => (a.correct ? [] : [i]));
}

/** 튜터 확인이 끝났을 때 이 판정이면 헷갈린 개념으로 카드를 만든다(3번 틀려 정답을 들으면 미흡) */
export function tutorNeedsReview(understanding: string | null | undefined): boolean {
  return understanding === "미흡" || understanding === "부분";
}

export function lessonKey(lessonId: string): string {
  return `lesson:${lessonId}`;
}

export function quizKey(weekId: string, index: number): string {
  return `quiz:${weekId}:${index}`;
}

/**
 * 한 장을 푼 뒤 출처. 헷갈린 개념(튜터) 카드를 맞히면 보통 레슨 카드로 돌아간다:
 * 더는 "헷갈렸던 개념"으로 표시하거나 먼저 꺼내지 않고, AI에게도 헷갈렸다고 알리지 않는다. 틀리면 그대로 둔다
 */
export function sourceAfterAnswer(source: string, correct: boolean): string {
  return source === "tutor" && correct ? "lesson" : source;
}

/** 카드 위 출처 한 줄 */
export function sourceLabel(source: string, title: string): string {
  if (source === "quiz") return `${title}에서 틀린 문제`;
  if (source === "tutor") return `헷갈렸던 개념 · ${title}`;
  return `지난 레슨 · ${title}`;
}

export interface ReviewQuestionShape {
  q: string;
  choices: string[];
  answer: number;
  why: string;
}

/** AI나 저장된 값이 복습 문제 모양(보기 2~4개, 정답 번호가 범위 안)인지 확인한다 */
export function validQuestion(v: unknown): v is ReviewQuestionShape {
  if (!v || typeof v !== "object") return false;
  const q = v as Record<string, unknown>;
  return (
    typeof q.q === "string" &&
    q.q.trim().length > 0 &&
    typeof q.why === "string" &&
    Array.isArray(q.choices) &&
    q.choices.length >= 2 &&
    q.choices.length <= 4 &&
    q.choices.every((c) => typeof c === "string" && c.trim().length > 0) &&
    new Set(q.choices).size === q.choices.length &&
    typeof q.answer === "number" &&
    Number.isInteger(q.answer) &&
    q.answer >= 0 &&
    q.answer < q.choices.length
  );
}

/** 결과 화면 선생님 한마디 */
export const REVIEW_DONE_LINE: Record<TeacherName, string> = {
  온: "오늘 복습 끝! 이렇게 한 번씩 꺼내 보면 오래 남아요.",
  결: "복습 완료. 틀린 건 내일 다시 나옵니다.",
  새: "꺼내 볼 때마다 기억 길이 넓어져요. 다음엔 어떤 게 나올까요?",
};

/** 스케줄러가 남기는 복습 알림 본문. {n}은 카드 수 */
export const REVIEW_LINE: Record<TeacherName, string> = {
  온: "복습 카드 {n}개가 기다려요. 3분이면 끝나요.",
  결: "복습 {n}개 남았습니다. 3분이면 됩니다.",
  새: "지난번에 배운 게 {n}개 돌아왔어요! 기억나는지 볼래요?",
};

export function reviewLine(who: TeacherName, n: number): string {
  return REVIEW_LINE[who].replace("{n}", String(n));
}

/** "11월 6일 금요일" */
export function reviewDayLabel(day: DayKey): string {
  const [, m, d] = day.split("-").map(Number);
  return `${m}월 ${d}일 ${WEEKDAY_KO[weekday(day)]}요일`;
}

/** 결과 화면 안내: 복습은 잔디·연속 기록에 세지 않는다. 오늘이 학습일인데 레슨이 남았으면 레슨으로 이끈다 */
export function grassNote(studyDay: boolean, studiedToday: boolean): string {
  if (studyDay && !studiedToday) return "복습은 잔디와 연속 기록에 세지 않아요. 오늘 칸은 레슨으로 채워요.";
  return "복습은 잔디와 연속 기록에 세지 않아요. 기억을 오래 남기는 몫이에요.";
}
