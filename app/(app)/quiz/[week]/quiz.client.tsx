"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitQuizAction } from "@/app/actions/course";
import { Teacher } from "@/components/teacher/Teacher";
import type { QuizQuestion } from "@/lib/ai/types";
import type { TeacherName } from "@/lib/design/types";
import { feedbackTitle, MARKS, quizDoneCount } from "@/lib/domain/quiz";
import s from "./quiz.module.css";

interface Props {
  who: TeacherName;
  week: number;
  questions: QuizQuestion[];
  resultLine: string;
}

export function QuizPlay({ who, week, questions, resultLine }: Props) {
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [saved, setSaved] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const total = questions.length;
  const finished = idx >= total;
  const picked = finished ? null : (picks[idx] ?? null);
  const answered = picked !== null;
  const q = finished ? null : questions[idx];
  const right = answered && q !== null && picked === q.answer;
  const score = picks.reduce((n, v, i) => n + (v === questions[i]?.answer ? 1 : 0), 0);

  function save(all: number[]) {
    setSaved("saving");
    startTransition(async () => {
      const r = await submitQuizAction(week, all);
      if (r.ok) setSaved("ok");
      else {
        setSaved("error");
        setError(r.message);
      }
    });
  }

  function next() {
    const n = idx + 1;
    setIdx(n);
    if (n >= total) save(picks);
  }

  return (
    <main className={s.frame}>
      <header className={s.header}>
        <Link href="/curriculum" aria-label="커리큘럼으로 돌아가기" className={s.close}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </Link>
        <span className={s.title}>{week}주차 퀴즈</span>
        <span className={s.counter}>{finished ? "완료" : `${idx + 1} / ${total}`}</span>
      </header>

      <div
        role="progressbar"
        aria-label="퀴즈 진행"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={quizDoneCount(idx, answered, total)}
        className={s.bars}
        style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}
      >
        {questions.map((x, i) => (
          <span key={i} data-state={picks[i] === undefined ? "none" : picks[i] === x.answer ? "good" : "bad"} />
        ))}
      </div>

      {q ? (
        <div className={s.question}>
          <h1 className={s.q}>{q.q}</h1>
          <div role="radiogroup" aria-label="보기" className={s.options}>
            {q.choices.map((label, i) => {
              const st = !answered ? "none" : i === q.answer ? "good" : i === picked ? "bad" : "none";
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={i === picked}
                  aria-disabled={answered || undefined}
                  className={s.option}
                  data-state={st}
                  onClick={() => {
                    if (answered) return;
                    const nextPicks = picks.slice();
                    nextPicks[idx] = i;
                    setPicks(nextPicks);
                  }}
                  data-testid={`quiz-choice-${i}`}
                >
                  <span className={s.mark}>{MARKS[i]}</span>
                  <span className={s.label}>{label}</span>
                </button>
              );
            })}
          </div>
          <div aria-live="polite">
            {answered && (
              <div className={s.feedback} data-state={right ? "good" : "bad"}>
                <strong>{feedbackTitle(right, q.answer)}</strong>
                <p>{q.why}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={s.result}>
          <Teacher who={who} state="joy" size={140} label={`기뻐서 통통 튀는 ${who} 선생님`} />
          <span className={s.resultKicker}>{week}주차 퀴즈 결과</span>
          <strong className={s.score} data-testid="quiz-score">
            {score} / {total}
          </strong>
          <p className={s.resultLine}>{resultLine}</p>
          <p className={s.note} aria-live="polite">
            {saved === "error" ? `점수를 저장하지 못했어요. ${error}` : saved === "saving" ? "점수를 저장하는 중이에요..." : "점수는 내 정보의 실력 변화 그래프에 반영돼요."}
          </p>
          <button
            type="button"
            className={s.retry}
            onClick={() => {
              setIdx(0);
              setPicks([]);
              setSaved("idle");
            }}
          >
            다시 풀기
          </button>
        </div>
      )}

      <div className={s.spacer} />

      {finished ? (
        <Link href={`/milestone/${week}`} className={s.cta}>
          마일스톤 제출하러 가기
        </Link>
      ) : (
        answered && (
          <button type="button" className={s.cta} onClick={next} data-testid="quiz-next">
            {idx === total - 1 ? "결과 보기" : "다음 문제"}
          </button>
        )
      )}
    </main>
  );
}
