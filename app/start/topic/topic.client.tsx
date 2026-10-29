"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Teacher } from "@/components/teacher/Teacher";
import type { TeacherName } from "@/lib/design/types";
import { draftTeacher, useDraft, useTeacherFallback, writeDraft } from "../draft";
import { goalChips, LEVELS, TOPIC_CHIPS } from "../logic";
import { StepHeader } from "../StepHeader";
import st from "../start.module.css";
import s from "./topic.module.css";

const QUESTIONS: Record<TeacherName, [string, string, string, string]> = {
  온: [
    "반가워요! 어떤 걸 배워 보고 싶어요? 편하게 적어 주세요.",
    "좋아요. 다 배우고 나면 무엇을 할 수 있으면 좋겠어요?",
    "마지막으로, 지금은 어느 정도 알고 있어요?",
    "고마워요. 이걸로 나만의 과정을 짜 볼게요.",
  ],
  결: [
    "무엇을 배울지부터 정합니다. 주제를 적으세요.",
    "끝났을 때 무엇을 할 수 있어야 합니까? 구체적으로.",
    "지금 수준은 어디입니까?",
    "됐습니다. 이걸로 과정을 짭니다.",
  ],
  새: [
    "어디로 탐험을 떠나 볼까요? 궁금한 주제를 알려 주세요!",
    "그 탐험이 끝나면 어떤 걸 해내고 싶어요?",
    "지금은 지도를 얼마나 갖고 있어요?",
    "좋아요! 이제 탐험 지도를 그려 볼게요.",
  ],
};

export function Topic({ next }: { next?: { topic: string; level: string } }) {
  const draft = useDraft();

  // 지난 과정의 주제와 수준을 이어받는다. 목적지는 새로 묻는다
  useEffect(() => {
    if (next) writeDraft({ topic: next.topic, goal: "", level: next.level });
  }, [next]);

  const who = draftTeacher(draft, useTeacherFallback());
  const ans = [draft.topic, draft.goal, draft.level];
  const step = !draft.topic ? 0 : !draft.goal ? 1 : !draft.level ? 2 : 3;
  const typing = step < 2;
  const finished = step >= 3;
  const [text, setText] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const q = QUESTIONS[who];
  const chips = step === 0 ? TOPIC_CHIPS : goalChips(draft.topic);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [step]);

  function push(v: string) {
    const t = v.trim();
    if (!t) return;
    if (step === 0) writeDraft({ topic: t.slice(0, 60) });
    else if (step === 1) writeDraft({ goal: t.slice(0, 120) });
    else if (step === 2) writeDraft({ level: t });
    setText("");
  }

  const rows: { who: "ai" | "me"; text: string }[] = [];
  for (let i = 0; i <= Math.min(step, 3); i++) {
    rows.push({ who: "ai", text: q[i] });
    if (i < step) rows.push({ who: "me", text: ans[i] });
  }

  return (
    <main className={s.root}>
      <div className={s.head}>
        <StepHeader step={2} backHref="/start/teacher" backLabel="선생님 고르기로 돌아가기" />
      </div>
      <div className={s.chat} ref={chatRef} aria-live="polite">
        {rows.map((m, i) => (
          <div key={i} className={s.row} data-who={m.who}>
            {m.who === "ai" && <Teacher who={who} size={36} decorative />}
            <p className={s.bubble} data-who={m.who}>
              {m.who === "ai" && <span className={st.srOnly}>{who} 선생님: </span>}
              {m.text}
            </p>
          </div>
        ))}
        {step === 2 && (
          <div role="radiogroup" aria-label="지금 수준" className={s.levels}>
            {LEVELS.map((l) => (
              <button key={l.label} type="button" role="radio" aria-checked="false" className={s.level} onClick={() => push(l.label)} data-testid="level-option">
                <span className={s.levelLabel}>{l.label}</span>
                <span className={s.levelHint}>{l.hint}</span>
              </button>
            ))}
          </div>
        )}
        {finished && (
          <section aria-label="정리" className={s.summary}>
            <span className={s.summaryEyebrow}>선생님이 정리한 내용</span>
            <dl className={s.dl}>
              <dt>주제</dt>
              <dd className={s.strong}>{draft.topic}</dd>
              <dt>목적지</dt>
              <dd>{draft.goal}</dd>
              <dt>지금 수준</dt>
              <dd>{draft.level}</dd>
            </dl>
          </section>
        )}
      </div>

      {typing && (
        <div className={s.composer}>
          <div className={s.chips}>
            {chips.map((c) => (
              <button key={c} type="button" className={s.chip} onClick={() => push(c)} data-testid="topic-chip">
                {c}
              </button>
            ))}
          </div>
          <form
            className={s.form}
            onSubmit={(e) => {
              e.preventDefault();
              push(text);
            }}
          >
            <label htmlFor="topic-input" className={st.srOnly}>
              {step === 0 ? "배우고 싶은 주제" : "배우고 나서 하고 싶은 것"}
            </label>
            <input
              id="topic-input"
              className={s.input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={step === 0 ? "예: 재무제표 읽기" : "예: 회사 숫자를 혼자 읽기"}
              autoComplete="off"
              maxLength={step === 0 ? 60 : 120}
              data-testid="topic-input"
            />
            <button type="submit" aria-label="보내기" className={s.send} data-testid="send">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5" />
                <path d="M6 11l6-6 6 6" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {finished && (
        <div className={s.footer}>
          <button type="button" className={`${st.ghostBtn} ${s.restart}`} onClick={() => writeDraft({ topic: "", goal: "", level: "" })} data-testid="topic-restart">
            다시 답하기
          </button>
          <Link href="/start/schedule" className={`${st.cta} ${s.next}`} data-testid="topic-next">
            학습 시간 정하기
          </Link>
        </div>
      )}
    </main>
  );
}
