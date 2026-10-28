"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitMilestoneAction } from "@/app/actions/course";
import { Teacher } from "@/components/teacher/Teacher";
import type { MilestoneFeedback } from "@/lib/ai/types";
import type { TeacherName } from "@/lib/design/types";
import { initialStage, MILESTONE_MAX, type MilestoneStage } from "@/lib/domain/milestone";
import s from "./milestone.module.css";

interface Submitted {
  content: string;
  round: number;
  feedback: MilestoneFeedback;
}

interface Props {
  who: TeacherName;
  week: number;
  topic: string;
  title: string;
  labels: string[];
  last: Submitted | null;
  nextWeek: number | null;
}

const FAIL_BODY: Record<TeacherName, string> = {
  온: "미안해요, 답을 만들다 끊겼어요. 쓴 글은 그대로 저장해 뒀어요.",
  결: "응답이 끊겼습니다. 쓴 글은 저장했습니다. 다시 시도하세요.",
  새: "어, 생각하다 길을 잃었어요. 쓴 글은 잘 챙겨 뒀어요!",
};

export function MilestoneBoard({ who, week, topic, title, labels, last, nextWeek }: Props) {
  const [stage, setStage] = useState<MilestoneStage>(() => initialStage(last?.feedback ?? null));
  const [submitted, setSubmitted] = useState<Submitted | null>(last);
  const [draft, setDraft] = useState(last?.content ?? "");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function submit() {
    const text = draft.trim();
    if (!text) {
      setError("한 줄이라도 적어 주세요");
      return;
    }
    setError("");
    setPending(text);
    setStage("review");
    startTransition(async () => {
      const r = await submitMilestoneAction(week, text);
      if (r.ok) {
        setSubmitted({ content: r.content, round: r.round, feedback: r.feedback });
        setStage(r.feedback.passed ? "passed" : "feedback");
      } else if (r.reason === "ai") {
        setStage("failed");
      } else {
        setError(r.message);
        setStage("edit");
      }
    });
  }

  const reviewing = stage === "review";
  const shownText = reviewing ? pending : submitted?.content ?? "";
  const shownRound = reviewing ? (submitted?.round ?? 0) + 1 : submitted?.round ?? 1;
  const fb = submitted?.feedback ?? null;
  const headline = reviewing ? "다시 읽어 보는 중이에요..." : (fb?.headline ?? "");
  const showResult = stage === "review" || stage === "feedback" || stage === "passed";

  return (
    <div className={s.frame}>
      <main className={s.scroll}>
        <header className={s.header}>
          <Link href="/curriculum" aria-label="커리큘럼으로 돌아가기" className={s.back}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <div className={s.headText}>
            <span className={s.headSub}>
              {topic} · {week}주차
            </span>
            <span className={s.headTitle}>마일스톤 피드백</span>
          </div>
        </header>

        <section aria-label="과제" className={s.card}>
          <span className={s.kicker}>이번 주 과제</span>
          <span className={s.assign}>{title}</span>
          <span className={s.desc}>기준: {labels.join(" · ")}</span>
        </section>

        {stage === "edit" && (
          <section aria-label="고쳐 쓰기" className={s.edit}>
            <label htmlFor="ms-text" className={s.editLabel}>
              {submitted ? "고쳐 쓰기" : "결과물 쓰기"}
            </label>
            <textarea
              id="ms-text"
              rows={9}
              value={draft}
              maxLength={MILESTONE_MAX}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={labels.map((l) => `- ${l}`).join("\n")}
              className={s.textarea}
              data-testid="milestone-input"
            />
            {error && (
              <p className={s.error} role="alert">
                {error}
              </p>
            )}
          </section>
        )}

        {stage === "failed" && (
          <section aria-label="피드백 실패" className={s.fail} data-testid="milestone-status" data-stage="failed">
            <Teacher who={who} state="sad" size={120} jump />
            <span className={s.failTag}>피드백 실패</span>
            <h2 className={s.failTitle}>선생님이 잠깐 말을 놓쳤어요</h2>
            <p className={s.failBody}>{FAIL_BODY[who]}</p>
            <p className={s.failNote}>
              저장된 글: &quot;{pending.length > 60 ? pending.slice(0, 60) + "..." : pending}&quot;
            </p>
          </section>
        )}

        {showResult && (
          <>
            <section aria-label="내가 제출한 요약" className={s.submitted}>
              <span className={s.subKicker}>내가 제출한 요약 · {shownRound}차</span>
              <p className={s.subBody}>{shownText}</p>
            </section>
            <section aria-label="선생님 피드백" className={s.feedback} aria-live="polite" aria-busy={reviewing} data-testid="milestone-status" data-stage={stage}>
              <div className={s.talk}>
                <Teacher who={who} state={reviewing ? "think" : "base"} size={44} />
                <p className={s.bubble}>{headline}</p>
              </div>
              {fb && (
                <div className={s.criteria}>
                  {fb.criteria.map((c) => (
                    <div key={c.label} className={s.criterion}>
                      <span className={s.critLabel}>{c.label}</span>
                      <span className={s.status} data-ok={c.status === "충족" ? "true" : "false"}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {stage === "feedback" && fb && fb.fixes.length > 0 && (
                <>
                  <h2 className={s.fixTitle}>고칠 점 {fb.fixes.length}개</h2>
                  <ol className={s.fixes}>
                    {fb.fixes.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ol>
                </>
              )}
            </section>
          </>
        )}
      </main>

      <div className={s.bar}>
        {stage === "feedback" && (
          <button type="button" className={s.primary} onClick={() => setStage("edit")}>
            고쳐서 다시 제출
          </button>
        )}
        {stage === "edit" && (
          <>
            {submitted && !submitted.feedback.passed && (
              <button type="button" className={s.cancel} onClick={() => setStage("feedback")}>
                취소
              </button>
            )}
            <button type="button" className={s.primary} onClick={submit} data-testid="milestone-submit">
              제출하기
            </button>
          </>
        )}
        {stage === "failed" && (
          <>
            <button type="button" className={s.cancel} onClick={() => setStage("edit")}>
              고쳐 쓰기
            </button>
            <button type="button" className={s.primary} onClick={submit} data-testid="milestone-submit">
              다시 제출하기
            </button>
          </>
        )}
        {stage === "passed" &&
          (nextWeek ? (
            <Link href="/curriculum" className={s.primary}>
              {nextWeek}주차로 넘어가기
            </Link>
          ) : (
            <Link href="/finish" className={s.primary}>
              목적지로 가기
            </Link>
          ))}
      </div>
    </div>
  );
}
