"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Teacher } from "@/components/teacher/Teacher";
import { MaterialUpload } from "@/components/material/MaterialUpload";
import { useFitToKeyboard } from "@/components/ui/keyboard";
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

/** 주제 정하기에서 "가지고 있는 교재·자료가 있어요"를 골랐을 때 */
export const MATERIAL_CHOICE = "가지고 있는 교재·자료가 있어요";

const MATERIAL_ASK: Record<TeacherName, string> = {
  온: "좋아요. PDF 파일이나 웹 링크를 올려 주세요. 그 자료를 바탕으로 과정을 짤게요.",
  결: "자료를 올리세요. PDF 파일이나 웹 링크 하나면 됩니다. 그 내용으로 과정을 짭니다.",
  새: "오, 지도를 갖고 왔군요! PDF 파일이나 웹 링크를 올려 주세요.",
};

const MATERIAL_DONE: Record<TeacherName, (title: string) => string> = {
  온: (t) => `"${t}" 잘 받았어요. 이 자료로 과정을 짤게요. 주제는 한 줄로 뭐라고 할까요?`,
  결: (t) => `"${t}" 받았습니다. 이 자료로 짭니다. 주제를 한 줄로 적으세요.`,
  새: (t) => `"${t}" 접수! 이 자료로 탐험 지도를 그릴게요. 주제는 뭐라고 부를까요?`,
};

/** 이미 과정을 하는 사람이 과정을 하나 더 열 때 이어받는 내 설정 */
export interface TopicSeed {
  teacher: TeacherName;
  studyDays: number[];
  minutes: number;
  notifyTime: string;
}

export function Topic({
  next,
  seed,
  backHref = "/start/teacher",
}: {
  next?: { topic: string; level: string };
  seed?: TopicSeed;
  backHref?: string;
}) {
  const draft = useDraft();

  // 과정을 더 열 때는 선생님과 학습 시간을 내 설정에서 이어받고, 주제는 새로 묻는다.
  // 지난 과정에서 왔으면 그 주제와 수준을 이어받는다. 목적지는 언제나 새로 묻는다
  useEffect(() => {
    if (!next && !seed) return;
    writeDraft({
      ...(seed ? { ...seed, materialId: null, materialTitle: "" } : {}),
      topic: next?.topic ?? "",
      goal: "",
      level: next?.level ?? "",
    });
  }, [next, seed]);

  const who = draftTeacher(draft, useTeacherFallback());
  const ans = [draft.topic, draft.goal, draft.level];
  const step = !draft.topic ? 0 : !draft.goal ? 1 : !draft.level ? 2 : 3;
  const typing = step < 2;
  const finished = step >= 3;
  const [text, setText] = useState("");
  const [materialOpen, setMaterialOpen] = useState(false);
  const hasMaterial = !!draft.materialId;
  const chatRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = QUESTIONS[who];
  const chips =
    step === 0
      ? hasMaterial && draft.materialTitle
        ? [draft.materialTitle.slice(0, 60), ...TOPIC_CHIPS]
        : TOPIC_CHIPS
      : goalChips(draft.topic);

  function toBottom() {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  useEffect(toBottom, [step, materialOpen, hasMaterial]);
  // 튜터 채팅과 같이 키보드가 올라와도 머리와 입력칸이 보이게 한다
  useFitToKeyboard(screenRef, toBottom);

  /** 대화 영역을 누르면 키보드를 내린다. 안의 버튼·링크는 그대로 눌린다 */
  function closeKeyboard(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("a, button, input, textarea")) return;
    inputRef.current?.blur();
  }

  function push(v: string) {
    const t = v.trim();
    if (!t) return;
    if (step === 0) writeDraft({ topic: t.slice(0, 60) });
    else if (step === 1) writeDraft({ goal: t.slice(0, 120) });
    else if (step === 2) writeDraft({ level: t });
    setText("");
  }

  const showMaterial = hasMaterial || (materialOpen && step === 0);
  const rows: { who: "ai" | "me" | "upload"; text: string }[] = [];
  for (let i = 0; i <= Math.min(step, 3); i++) {
    rows.push({ who: "ai", text: q[i] });
    if (i === 0 && showMaterial) {
      rows.push({ who: "me", text: MATERIAL_CHOICE }, { who: "ai", text: MATERIAL_ASK[who] });
      if (hasMaterial) rows.push({ who: "ai", text: MATERIAL_DONE[who](draft.materialTitle || "내 자료") });
      else rows.push({ who: "upload", text: "" });
    }
    if (i < step) rows.push({ who: "me", text: ans[i] });
  }

  return (
    <main className={s.root} ref={screenRef}>
      <div className={s.head} data-testid="topic-head">
        <StepHeader
          step={2}
          backHref={backHref}
          backLabel={backHref === "/start/teacher" ? "선생님 고르기로 돌아가기" : "내 과정으로 돌아가기"}
        />
      </div>
      <div className={s.chat} ref={chatRef} aria-live="polite" onClick={closeKeyboard} data-testid="topic-chat">
        {rows.map((m, i) =>
          m.who === "upload" ? (
            <div key={i} className={s.upload}>
              <MaterialUpload
                mode="start"
                teacher={who}
                onDone={(r) => {
                  writeDraft({ materialId: r.id, materialTitle: r.title.slice(0, 80) });
                  setMaterialOpen(false);
                }}
              />
              <button type="button" className={s.uploadCancel} onClick={() => setMaterialOpen(false)} data-testid="material-cancel">
                자료 없이 할게요
              </button>
            </div>
          ) : (
          <div key={i} className={s.row} data-who={m.who}>
            {m.who === "ai" && <Teacher who={who} size={36} decorative />}
            <p className={s.bubble} data-who={m.who}>
              {m.who === "ai" && <span className={st.srOnly}>{who} 선생님: </span>}
              {m.text}
            </p>
          </div>
          ),
        )}
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
              {hasMaterial && (
                <>
                  <dt>내 자료</dt>
                  <dd data-testid="topic-material">
                    {draft.materialTitle || "내 자료"}{" "}
                    <button type="button" className={s.unlink} onClick={() => writeDraft({ materialId: null, materialTitle: "" })} data-testid="material-remove">
                      빼기
                    </button>
                  </dd>
                </>
              )}
            </dl>
          </section>
        )}
      </div>

      {typing && (
        <div className={s.composer} data-testid="topic-composer">
          {step === 0 && !showMaterial && (
            <div className={s.materialRow}>
              <button type="button" className={s.materialBtn} onClick={() => setMaterialOpen(true)} data-testid="material-open">
                {MATERIAL_CHOICE}
              </button>
            </div>
          )}
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
              ref={inputRef}
              id="topic-input"
              className={s.input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={step === 0 ? "예: 재무제표 읽기" : "예: 회사 숫자를 혼자 읽기"}
              autoComplete="off"
              maxLength={step === 0 ? 60 : 120}
              data-testid="topic-input"
            />
            <button
              type="submit"
              aria-label="보내기"
              className={s.send}
              // 버튼이 초점을 가져가면 입력칸이 흐려져 iOS 키보드가 내려간다
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              data-testid="send"
            >
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
