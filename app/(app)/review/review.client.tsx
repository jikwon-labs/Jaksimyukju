"use client";

import Link from "next/link";
import { type ReactNode, useState, useTransition } from "react";
import { answerReviewAction, finishReviewAction } from "@/app/actions/review";
import { Teacher } from "@/components/teacher/Teacher";
import type { TeacherName } from "@/lib/design/types";
import { feedbackTitle, MARKS, quizDoneCount } from "@/lib/domain/quiz";
import type { SessionCard } from "@/lib/server/review";
import q from "../quiz/[week]/quiz.module.css";
import s from "./review.module.css";

interface Props {
  who: TeacherName;
  cards: SessionCard[];
  doneLine: string;
  /** 복습과 잔디의 관계 안내 */
  note: string;
  /** 오늘 레슨이 남았으면 결과 화면에서 레슨으로 이끈다 */
  lessonLeft: boolean;
  /** 처음부터 풀 카드가 없을 때 보여 줄 화면 */
  empty: ReactNode;
}

type Saved = { state: "saving" } | { state: "ok"; next: string } | { state: "error"; message: string };

export function ReviewPlay({ who, cards: initial, doneLine, note, lessonLeft, empty }: Props) {
  // 다 풀고 홈을 갱신할 때 서버가 이 화면도 다시 그리며 남은 카드 목록을 보낸다. 풀던 묶음이 밀리지 않게 처음 받은 목록을 쓴다
  const [cards] = useState(initial);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [saved, setSaved] = useState<Record<number, Saved>>({});
  const [, startTransition] = useTransition();
  const total = cards.length;
  const finished = idx >= total;
  const card = finished ? null : cards[idx];
  const picked = finished ? null : (picks[idx] ?? null);
  const answered = picked !== null;
  const right = answered && card !== null && picked === card.question.answer;
  const score = picks.reduce((n, v, i) => n + (v === cards[i]?.question.answer ? 1 : 0), 0);
  const cur = saved[idx];
  if (total === 0) return empty;

  function pick(i: number) {
    if (answered || !card) return;
    const at = idx;
    const next = picks.slice();
    next[at] = i;
    setPicks(next);
    setSaved((m) => ({ ...m, [at]: { state: "saving" } }));
    startTransition(async () => {
      const r = await answerReviewAction(card.id, i);
      setSaved((m) => ({ ...m, [at]: r.ok ? { state: "ok", next: r.next } : { state: "error", message: r.message } }));
      // 채점 응답을 받은 뒤 따로 홈을 갱신한다. 이 화면도 같이 다시 그려지지만(다음 묶음의 문제를 미리 만들어 둘 수 있다)
      // 이미 채점이 끝나 기다리는 표시는 없다. 중간에 나가도 홈은 동적 화면이라 링크로 가면 새로 그린다
      if (at === total - 1) startTransition(() => finishReviewAction());
    });
  }

  return (
    <main className={q.frame}>
      <header className={q.header}>
        <Link href="/home" prefetch={false} aria-label="홈으로 돌아가기" className={q.close}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </Link>
        <span className={q.title}>오늘 복습</span>
        <span className={q.counter}>{finished ? "완료" : `${idx + 1} / ${total}`}</span>
      </header>

      <div
        role="progressbar"
        aria-label="복습 진행"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={quizDoneCount(idx, answered, total)}
        className={q.bars}
        style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}
      >
        {cards.map((c, i) => (
          <span key={c.id} data-state={picks[i] === undefined ? "none" : picks[i] === c.question.answer ? "good" : "bad"} />
        ))}
      </div>

      {card ? (
        <div className={q.question}>
          <span className={s.source}>{card.label}</span>
          <h1 className={q.q}>{card.question.q}</h1>
          <div role="radiogroup" aria-label="보기" className={q.options}>
            {card.question.choices.map((label, i) => {
              const st = !answered ? "none" : i === card.question.answer ? "good" : i === picked ? "bad" : "none";
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={i === picked}
                  aria-disabled={answered || undefined}
                  className={q.option}
                  data-state={st}
                  onClick={() => pick(i)}
                  data-testid={`review-choice-${i}`}
                >
                  <span className={q.mark}>{MARKS[i]}</span>
                  <span className={q.label}>{label}</span>
                </button>
              );
            })}
          </div>
          <div aria-live="polite">
            {answered && (
              <div className={q.feedback} data-state={right ? "good" : "bad"}>
                <strong>{feedbackTitle(right, card.question.answer)}</strong>
                <p>{card.question.why}</p>
                <span className={s.next}>
                  {cur?.state === "ok" ? cur.next : cur?.state === "error" ? `저장하지 못했어요. ${cur.message}` : "다음 복습 날을 정하는 중이에요..."}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={q.result}>
          <Teacher who={who} state="joy" size={140} label={`기뻐서 통통 튀는 ${who} 선생님`} />
          <span className={q.resultKicker}>오늘 복습 결과</span>
          <strong className={q.score} data-testid="review-score">
            {score} / {total}
          </strong>
          <div className={s.tally}>
            <span>맞힌 카드 {score}개 · 간격이 늘어요</span>
            {total - score > 0 && <span>틀린 카드 {total - score}개 · 1일 간격부터 다시</span>}
          </div>
          <p className={q.resultLine}>{doneLine}</p>
          <p className={q.note}>{note}</p>
        </div>
      )}

      <div className={q.spacer} />

      {finished ? (
        <Link href="/home" prefetch={false} className={q.cta} data-testid="review-home">
          {lessonLeft ? "오늘 레슨 하러 가기" : "홈으로"}
        </Link>
      ) : (
        answered && (
          <button type="button" className={q.cta} onClick={() => setIdx(idx + 1)} data-testid="review-next">
            {idx === total - 1 ? "결과 보기" : "다음 문제"}
          </button>
        )
      )}
    </main>
  );
}
