"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { completeLessonAction } from "@/app/actions/lesson";
import { ListenButton } from "@/components/speech/ListenButton";
import { useReadingPart } from "@/components/speech/speech";
import { Teacher } from "@/components/teacher/Teacher";
import { AI_FAIL_BODY } from "@/components/lesson/copy";
import { BackIcon, OfflineBar, StateBlock } from "@/components/lesson/StateBlock";
import { useOnline } from "@/components/lesson/offline";
import { ChatInput } from "@/components/ui/ChatInput";
import { useFitToKeyboard } from "@/components/ui/keyboard";
import type { TutorMessageView, TutorResponse } from "@/components/lesson/tutor-types";
import type { TeacherName } from "@/lib/design/types";
import { splitBubbles, typingMs } from "@/lib/domain/chat";
import { tutorStatus, understandingChip } from "@/lib/domain/lesson";
import p from "@/components/lesson/parts.module.css";
import s from "./tutor.module.css";

const TMP = "tmp-";

/** 선생님 답은 빈 줄마다 말풍선을 나누고, 듣는 동안 지금 읽는 말풍선을 표시한다 */
function AiBubbles({
  id,
  content,
  who,
  shown,
}: {
  id: string;
  content: string;
  who: string;
  shown?: number;
}) {
  const listenId = `tutor-${id}`;
  const bubbles = splitBubbles(content);
  const reading = useReadingPart(listenId);
  // 막 도착한 답은 말풍선을 하나씩 올린다. 다 올라오기 전엔 듣기 버튼을 숨긴다
  const visible = shown === undefined ? bubbles : bubbles.slice(0, shown);
  return (
    <>
      {visible.map((part, i) => (
        <p key={i} className={s.bubble} data-from="ai" data-reading={reading === i || undefined}>
          {part}
        </p>
      ))}
      {visible.length === bubbles.length && (
        <ListenButton
          id={listenId}
          text={bubbles}
          label={`${who} 선생님 말 듣기`}
          compact
          testId="tutor-listen"
        />
      )}
    </>
  );
}

function CompleteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.complete} disabled={pending} data-testid="tutor-complete">
      {pending ? "잔디 채우는 중" : "레슨 완료하고 잔디 채우기"}
    </button>
  );
}

export function TutorChat({
  lessonId,
  title,
  who,
  initial,
  initialDone,
}: {
  lessonId: string;
  title: string;
  who: TeacherName;
  initial: TutorMessageView[];
  initialDone: boolean;
}) {
  const needsTurn =
    !initialDone && (initial.length === 0 || initial[initial.length - 1].role === "user");
  const [messages, setMessages] = useState(initial);
  const [done, setDone] = useState(initialDone);
  const [thinking, setThinking] = useState(needsTurn);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  // 막 도착한 선생님 답을 몇 번째 말풍선까지 보였는지. from 은 지금 말풍선을 "치기" 시작한 시각
  const [reveal, setReveal] = useState<{ id: string; shown: number; from: number } | null>(null);
  const started = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const online = useOnline();

  /** 서버에 한 턴을 요청한다. 실패해도 내 말은 화면과 서버에 남는다 */
  async function post(text?: string) {
    const from = Date.now();
    const known = new Set(messages.map((m) => m.id));
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(text ? { lessonId, text } : { lessonId }),
      });
      const data = (await res.json()) as Partial<TutorResponse>;
      if (Array.isArray(data.messages)) {
        const fresh = [...data.messages].reverse().find((m) => m.role === "ai" && !known.has(m.id));
        // 기다린 시간도 첫 말풍선을 치는 시간으로 친다. 응답이 늦었으면 바로 보인다
        if (fresh) setReveal({ id: fresh.id, shown: 0, from });
        setMessages(data.messages);
      }
      if (typeof data.done === "boolean") setDone(data.done);
      setFailed(!res.ok || data.error === "ai");
    } catch {
      setFailed(true);
    } finally {
      setThinking(false);
    }
  }

  const firstTurn = useEffectEvent(() => {
    if (!needsTurn || started.current) return;
    started.current = true;
    void post();
  });

  // 처음 열 때 한 번만: 대화가 비었으면 첫 질문, 내 말로 끝났으면 답을 받는다
  useEffect(() => {
    firstTurn();
  }, []);

  function toBottom() {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // 말풍선을 길이만큼 "치는" 시간을 두고 하나씩 올린다. 마지막 말풍선까지 올리면 끝낸다
  useEffect(() => {
    if (!reveal) return;
    const msg = messages.find((m) => m.id === reveal.id);
    const bubbles = msg ? splitBubbles(msg.content) : [];
    const next = bubbles[reveal.shown] ?? "";
    const wait = Math.max(0, typingMs(next) - (Date.now() - reveal.from));
    const t = setTimeout(() => {
      const shown = reveal.shown + 1;
      setReveal(shown >= bubbles.length ? null : { id: reveal.id, shown, from: Date.now() });
    }, wait);
    return () => clearTimeout(t);
  }, [reveal, messages]);

  useEffect(toBottom, [messages, thinking, failed, done, reveal]);
  // 키보드가 올라와 보이는 영역이 줄면 마지막 말이 가려지지 않게 다시 맨 아래로
  useFitToKeyboard(screenRef, toBottom);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || typing) return;
    setDraft("");
    say(text);
    // 메신저처럼 보낸 뒤에도 키보드를 띄워 둔다(엔터로 보낸 경우에도 초점을 지킨다)
    inputRef.current?.focus();
  }

  /** 내 말을 화면에 먼저 올리고 서버에 보낸다. 보기를 누른 것도 같은 길로 간다 */
  function say(text: string) {
    setFailed(false);
    setThinking(true);
    setMessages((m) => [
      ...m,
      { id: `${TMP}${Date.now()}`, role: "user", content: text, understanding: null, choices: [] },
    ]);
    void post(text);
  }

  function retry() {
    if (typing) return;
    const last = messages[messages.length - 1];
    setFailed(false);
    setThinking(true);
    // 서버에 닿지 못한 내 말이면 다시 보내고, 저장돼 있으면 답만 다시 받는다
    if (last && last.role === "user" && last.id.startsWith(TMP)) {
      void post(last.content);
    } else void post();
  }

  /** 메신저처럼 대화 영역을 누르면 키보드를 내린다. 안의 버튼·링크는 그대로 눌린다 */
  function closeKeyboard(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("a, button, input, textarea")) return;
    inputRef.current?.blur();
  }

  // 답을 기다리는 동안과 말풍선을 올리는 동안 모두 "입력 중"으로 보인다
  const typing = thinking || reveal !== null;
  const lastAi = [...messages].reverse().find((m) => m.role === "ai");
  const userAnswers = messages.filter((m) => m.role === "user").length;
  const aiTurns = messages.filter((m) => m.role === "ai").length;
  const chip = understandingChip(lastAi?.understanding ?? null, userAnswers);
  const status = tutorStatus({ thinking: typing, done, aiTurns });
  const face = typing ? "think" : draft.trim() ? "listen" : "base";
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const last = messages[messages.length - 1];
  // 마지막 말이 객관식 질문이고 아직 고르지 않았을 때만 보기를 띄운다
  const choices = !done && !typing && !failed && last?.role === "ai" ? last.choices : [];

  return (
    <main className={s.screen} ref={screenRef}>
      {!online && <OfflineBar />}
      <header className={s.header} data-testid="tutor-header">
        <Link href={`/lesson/${lessonId}`} aria-label="레슨으로 돌아가기" className={s.back}>
          <BackIcon />
        </Link>
        <Teacher who={who} state={face} size={44} label={`${who} 선생님`} />
        <div className={s.name}>
          <span className={s.nameMain}>{who} 선생님</span>
          <span className={s.status} aria-live="polite">
            {status}
          </span>
        </div>
        <span className={s.chip} data-tone={chip.tone} data-testid="understanding">
          {chip.label}
        </span>
      </header>

      <div
        className={s.list}
        ref={listRef}
        aria-live="polite"
        onClick={closeKeyboard}
        data-testid="tutor-list"
      >
        <span className={s.topic}>{title}</span>
        {messages.map((m) =>
          reveal?.id === m.id && reveal.shown === 0 ? null : (
            // 선생님 답은 빈 줄마다 말풍선을 나눈다. 메시지 하나가 한 묶음이다
            <div
              key={m.id}
              className={s.row}
              data-from={m.role}
              data-testid={m.role === "ai" ? "tutor-ai" : "tutor-user"}
            >
              {m.role === "ai" ? (
                <AiBubbles
                  id={m.id}
                  content={m.content}
                  who={who}
                  shown={reveal?.id === m.id ? reveal.shown : undefined}
                />
              ) : (
                <p className={s.bubble} data-from={m.role}>
                  {m.content}
                </p>
              )}
            </div>
          ),
        )}
        {choices.length > 0 && (
          <div
            role="group"
            aria-label="보기 고르기"
            className={s.choices}
            data-testid="tutor-choices"
          >
            {choices.map((c, i) => (
              <button
                key={i}
                type="button"
                className={s.choice}
                onClick={() => say(c)}
                data-testid="tutor-choice"
              >
                <span className={s.choiceNo} aria-hidden="true">
                  {i + 1}
                </span>
                {c}
              </button>
            ))}
          </div>
        )}
        {typing && (
          <div role="status" aria-label="선생님이 생각하는 중" className={s.typing}>
            <span className={s.dot} />
            <span className={`${s.dot} ${s.dot2}`} />
            <span className={`${s.dot} ${s.dot3}`} />
          </div>
        )}
        {failed && !thinking && (
          <StateBlock
            who={who}
            face="sad"
            tag="튜터 응답 실패"
            title="선생님이 잠깐 말을 놓쳤어요"
            body={AI_FAIL_BODY[who]}
            note={lastUser ? `저장된 질문: "${lastUser.content}"` : undefined}
            size={72}
            compact
            testId="tutor-failed"
            actions={
              <>
                <button
                  type="button"
                  className={p.primary}
                  onClick={retry}
                  data-testid="tutor-retry"
                >
                  다시 물어보기
                </button>
                <Link href={`/lesson/${lessonId}`} className={p.secondary}>
                  레슨 먼저 다시 읽기
                </Link>
              </>
            }
          />
        )}
        {done && !typing && (
          <form
            action={completeLessonAction.bind(null, lessonId, "full")}
            className={s.completeForm}
          >
            <CompleteButton />
          </form>
        )}
      </div>

      <form className={s.composer} onSubmit={send} data-testid="tutor-composer">
        <label htmlFor="tutor-input" className={s.srOnly}>
          선생님에게 답하기
        </label>
        <ChatInput
          ref={inputRef}
          id="tutor-input"
          className={s.input}
          placeholder={
            done
              ? "더 궁금한 게 있으면 물어보세요"
              : choices.length > 0
                ? "보기를 고르거나 직접 적어 보세요"
                : "내 생각을 적어 보세요"
          }
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          data-testid="tutor-input"
        />
        <button
          type="submit"
          aria-label="보내기"
          className={s.send}
          disabled={typing || !draft.trim()}
          // 버튼이 초점을 가져가면 입력칸이 흐려져 iOS 키보드가 내려간다
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          data-testid="tutor-send"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V5" />
            <path d="M6 11l6-6 6 6" />
          </svg>
        </button>
      </form>
    </main>
  );
}
