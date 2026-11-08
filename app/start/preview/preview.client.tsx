"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Teacher } from "@/components/teacher/Teacher";
import type { TeacherName } from "@/lib/design/types";
import type { OnboardingSummary } from "@/lib/server/onboarding";
import { ADD_MESSAGES } from "@/lib/domain/courses";
import { draftTeacher, readDraft, useDraft, useTeacherFallback, writeDraft, type Draft } from "../draft";
import st from "../start.module.css";
import s from "./preview.module.css";
import { WeekList } from "./WeekList.client";

const STEPS = [
  { doing: "목적지를 정리하는 중", done: "목적지를 정리했어요" },
  { doing: "배울 순서를 짜는 중", done: "배울 순서를 짰어요" },
  { doing: "주차별 마일스톤을 정하는 중", done: "주차별 마일스톤을 정했어요" },
];
const STEP_MS = 1100;

const DONE_LINE: Record<TeacherName, string> = {
  온: "천천히, 하지만 끝까지 갈 수 있게 짰어요.",
  결: "빈틈없이 짰습니다. 이대로 갑니다.",
  새: "중간중간 재밌는 샛길도 숨겨 뒀어요.",
};

// States.md "AI 응답 실패" 본문
const FAIL_BODY: Record<TeacherName, string> = {
  온: "미안해요, 답을 만들다 끊겼어요. 질문은 그대로 저장해 뒀어요.",
  결: "응답이 끊겼습니다. 질문은 저장했습니다. 다시 시도하세요.",
  새: "어, 생각하다 길을 잃었어요. 질문은 잘 챙겨 뒀어요!",
};

type Result =
  | { ok: true; data: OnboardingSummary }
  | { ok: false; kind: "ai" | "invalid" | "server" | "consent" | "too_many" };

async function post(d: Draft): Promise<Result> {
  try {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        teacher: draftTeacher(d),
        topic: d.topic,
        goal: d.goal,
        level: d.level,
        studyDays: d.studyDays,
        minutes: d.minutes,
        weeks: d.weeks,
        notifyTime: d.notifyTime,
        ...(d.materialId ? { materialId: d.materialId } : {}),
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as OnboardingSummary;
      // 자료는 이제 이 과정에 붙었다. 다음에 시작 흐름을 다시 밟을 때 따라오지 않게 초안에서 뺀다
      if (d.materialId) writeDraft({ materialId: null, materialTitle: "" });
      return { ok: true, data };
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: string[] };
    // 다른 탭에서 AI 동의를 철회한 경우 등. 화면이 안내로 보낸다
    if (body.error === "consent") return { ok: false, kind: "consent" };
    if (body.error === "too_many") return { ok: false, kind: "too_many" };
    // 올린 자료를 쓸 수 없게 됐으면(다른 기기, 로그아웃, 이미 다른 과정에 붙음) 초안에서 빼고 다시 고르게 한다
    if (body.issues?.includes("materialId")) writeDraft({ materialId: null, materialTitle: "" });
    return {
      ok: false,
      kind: body.error === "ai" ? "ai" : body.error === "invalid" ? "invalid" : "server",
    };
  } catch {
    return { ok: false, kind: "server" };
  }
}

export function Preview() {
  const router = useRouter();
  const draft = useDraft();
  const who = draftTeacher(draft, useTeacherFallback());
  const [phase, setPhase] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  // 개발 모드 StrictMode에서 effect가 두 번 돌아도 요청은 한 번만 보낸다
  const reqRef = useRef<Promise<Result> | null>(null);

  useEffect(() => {
    const d = readDraft();
    if (!d.topic || !d.goal || !d.level) {
      router.replace("/start/topic");
      return;
    }
    if (d.studyDays.length === 0) {
      router.replace("/start/schedule");
      return;
    }
    reqRef.current ??= post(d);
    const req = reqRef.current;
    let alive = true;
    const started = Date.now();
    const timers = [1, 2].map((i) =>
      setTimeout(() => alive && setPhase((p) => Math.max(p, i)), STEP_MS * i),
    );
    req.then((r) => {
      if (!r.ok && r.kind === "consent") {
        router.replace("/ai-consent?next=%2Fstart%2Fpreview");
        return;
      }
      const wait = Math.max(0, STEP_MS * 3 - (Date.now() - started));
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          setResult(r);
          setPhase(3);
        }, wait),
      );
    });
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [attempt, router]);

  function remake() {
    reqRef.current = null;
    setResult(null);
    setPhase(0);
    setAttempt((a) => a + 1);
  }

  const shown = phase >= 3 ? result : null;

  if (shown && !shown.ok && shown.kind === "too_many") {
    return (
      <main className={s.fail}>
        <div className={s.failMid}>
          <Teacher who={who} state="sad" size={120} jump label={`${who} 선생님, 과정 한도`} />
          <span className={s.tag}>과정 한도</span>
          <h1 className={s.failTitle}>지금 하는 과정이 이미 가득 찼어요</h1>
          <p className={s.failBody} role="alert" data-testid="preview-too-many">
            {ADD_MESSAGES.too_many}
          </p>
        </div>
        <Link href="/courses" className={st.cta}>
          내 과정 보기
        </Link>
      </main>
    );
  }

  if (shown && !shown.ok) {
    return (
      <main className={s.fail}>
        <div className={s.failMid}>
          <Teacher
            who={who}
            state="sad"
            size={120}
            jump
            label={`${who} 선생님, 커리큘럼 생성 실패`}
          />
          <span className={s.tag}>커리큘럼 생성 실패</span>
          <h1 className={s.failTitle}>선생님이 잠깐 말을 놓쳤어요</h1>
          <p className={s.failBody} role="alert">
            {shown.kind === "invalid"
              ? "답변 중에 빠진 게 있어요. 앞 단계에서 한 번만 다시 확인해 주세요."
              : FAIL_BODY[who]}
          </p>
        </div>
        {shown.kind === "invalid" ? (
          <Link href="/start/topic" className={st.cta}>
            주제 다시 정하기
          </Link>
        ) : (
          <button type="button" className={st.cta} onClick={remake} data-testid="preview-retry">
            다시 만들기
          </button>
        )}
        <Link href="/start/schedule" className={s.secondary}>
          학습 시간 다시 정하기
        </Link>
      </main>
    );
  }

  if (!shown) {
    return (
      <main className={s.making}>
        <Teacher who={who} state="think" size={150} label={`커리큘럼을 짜는 ${who} 선생님`} />
        <div className={s.makingText}>
          <h1 className={s.makingTitle}>{who} 선생님이 과정을 짜고 있어요</h1>
          <p className={s.makingSub}>
            {draft.topic || "나만의 과정"} · {draft.weeks}주 · 주 {draft.studyDays.length}일{" "}
            {draft.minutes}분
          </p>
        </div>
        <ol className={s.steps} aria-live="polite" data-testid="preview-steps">
          {STEPS.map((x, i) => {
            const state = phase > i ? "done" : phase === i ? "active" : "wait";
            return (
              <li key={i} className={s.step} data-state={state}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={s.stepIcon}
                >
                  {state === "done" ? (
                    <>
                      <circle cx="12" cy="12" r="11" fill="var(--a-btn-bg)" />
                      <path
                        d="M7 12.5l3.2 3.2L17 9"
                        fill="none"
                        stroke="var(--a-btn-ink)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : (
                    <g className={state === "active" ? s.spin : undefined}>
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke="var(--line)"
                        strokeWidth="3"
                      />
                      {state === "active" && (
                        <path
                          d="M12 3a9 9 0 0 1 9 9"
                          fill="none"
                          stroke="var(--a-text)"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      )}
                    </g>
                  )}
                </svg>
                <span>{state === "done" ? x.done : x.doing}</span>
              </li>
            );
          })}
        </ol>
      </main>
    );
  }

  const d = shown.data;
  return (
    <main className={s.readyRoot}>
      <div className={s.scroll}>
        <div className={s.hero}>
          <Teacher who={who} state="joy" size={64} label={`${who} 선생님`} />
          <div className={s.heroText}>
            <h1 className={s.heroTitle}>나만의 과정이 준비됐어요</h1>
            <p className={s.heroSub}>{DONE_LINE[who]}</p>
          </div>
        </div>
        <section aria-label="과정 요약" className={s.summary} data-testid="preview-summary">
          <span className={s.summaryMeta}>
            {d.weeksCount}주 · 주 {d.perWeek}일 · 하루 {d.minutes}분 · 레슨 {d.lessons}개
          </span>
          <strong className={s.summaryTopic}>{d.topic}</strong>
          <span className={s.summaryGoal}>목적지: {d.goal}</span>
          {d.material && (
            <span className={s.summaryGoal} data-testid="preview-material">
              내 자료: {d.material}
            </span>
          )}
        </section>
        <WeekList key={d.weeks.map((w) => w.title).join("|")} initial={d.weeks} />
        {d.excludes.length > 0 && (
          <section aria-label="지금은 건너뛰는 것" className={s.skip}>
            <h2 className={s.skipTitle}>지금은 건너뛰어요</h2>
            <ul className={s.pills}>
              {d.excludes.map((x) => (
                <li key={x} className={s.pill}>
                  {x}
                </li>
              ))}
            </ul>
            <p className={s.skipNote}>
              목적지에 필요 없는 것은 빼 두었어요. 나중에 과정 수정에서 넣을 수 있어요.
            </p>
          </section>
        )}
      </div>
      <div className={s.footer}>
        <button
          type="button"
          className={`${st.ghostBtn} ${s.remake}`}
          onClick={remake}
          data-testid="preview-remake"
        >
          다시 만들기
        </button>
        <Link href="/home" className={`${st.cta} ${s.start}`} data-testid="preview-start">
          이대로 시작하기
        </Link>
      </div>
    </main>
  );
}
