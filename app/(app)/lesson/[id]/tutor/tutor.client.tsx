"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { completeLessonAction } from "@/app/actions/lesson";
import { Teacher } from "@/components/teacher/Teacher";
import { AI_FAIL_BODY } from "@/components/lesson/copy";
import { BackIcon, OfflineBar, StateBlock } from "@/components/lesson/StateBlock";
import { useOnline } from "@/components/lesson/offline";
import { useFitToKeyboard } from "@/components/ui/keyboard";
import type { TutorMessageView, TutorResponse } from "@/components/lesson/tutor-types";
import type { TeacherName } from "@/lib/design/types";
import { splitBubbles } from "@/lib/domain/chat";
import { tutorStatus, understandingChip } from "@/lib/domain/lesson";
import p from "@/components/lesson/parts.module.css";
import s from "./tutor.module.css";

const TMP = "tmp-";

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
  const needsTurn = !initialDone && (initial.length === 0 || initial[initial.length - 1].role === "user");
  const [messages, setMessages] = useState(initial);
  const [done, setDone] = useState(initialDone);
  const [thinking, setThinking] = useState(needsTurn);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const started = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const online = useOnline();

  /** 서버에 한 턴을 요청한다. 실패해도 내 말은 화면과 서버에 남는다 */
  async function post(text?: string) {
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(text ? { lessonId, text } : { lessonId }),
      });
      const data = (await res.json()) as Partial<TutorResponse>;
      if (Array.isArray(data.messages)) setMessages(data.messages);
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

  useEffect(toBottom, [messages, thinking, failed, done]);
  // 키보드가 올라와 보이는 영역이 줄면 마지막 말이 가려지지 않게 다시 맨 아래로
  useFitToKeyboard(screenRef, toBottom);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft("");
    setFailed(false);
    setThinking(true);
    setMessages((m) => [...m, { id: `${TMP}${Date.now()}`, role: "user", content: text, understanding: null }]);
    void post(text);
    // 메신저처럼 보낸 뒤에도 키보드를 띄워 둔다(엔터로 보낸 경우에도 초점을 지킨다)
    inputRef.current?.focus();
  }

  function retry() {
    if (thinking) return;
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

  const lastAi = [...messages].reverse().find((m) => m.role === "ai");
  const userAnswers = messages.filter((m) => m.role === "user").length;
  const aiTurns = messages.filter((m) => m.role === "ai").length;
  const chip = understandingChip(lastAi?.understanding ?? null, userAnswers);
  const status = tutorStatus({ thinking, done, aiTurns });
  const face = thinking ? "think" : draft.trim() ? "listen" : "base";
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

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

      <div className={s.list} ref={listRef} aria-live="polite" onClick={closeKeyboard} data-testid="tutor-list">
        <span className={s.topic}>{title}</span>
        {messages.map((m) => (
          // 선생님 답은 빈 줄마다 말풍선을 나눈다. 메시지 하나가 한 묶음이다
          <div key={m.id} className={s.row} data-from={m.role} data-testid={m.role === "ai" ? "tutor-ai" : "tutor-user"}>
            {(m.role === "ai" ? splitBubbles(m.content) : [m.content]).map((part, i) => (
              <p key={i} className={s.bubble} data-from={m.role}>
                {part}
              </p>
            ))}
          </div>
        ))}
        {thinking && (
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
                <button type="button" className={p.primary} onClick={retry} data-testid="tutor-retry">
                  다시 물어보기
                </button>
                <Link href={`/lesson/${lessonId}`} className={p.secondary}>
                  레슨 먼저 다시 읽기
                </Link>
              </>
            }
          />
        )}
        {done && (
          <form action={completeLessonAction.bind(null, lessonId, "full")} className={s.completeForm}>
            <CompleteButton />
          </form>
        )}
      </div>

      <form className={s.composer} onSubmit={send} data-testid="tutor-composer">
        <label htmlFor="tutor-input" className={s.srOnly}>
          선생님에게 답하기
        </label>
        <input
          ref={inputRef}
          id="tutor-input"
          className={s.input}
          placeholder={done ? "더 궁금한 게 있으면 물어보세요" : "내 생각을 적어 보세요"}
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
          disabled={thinking || !draft.trim()}
          // 버튼이 초점을 가져가면 입력칸이 흐려져 iOS 키보드가 내려간다
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          data-testid="tutor-send"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" />
            <path d="M6 11l6-6 6 6" />
          </svg>
        </button>
      </form>
    </main>
  );
}
