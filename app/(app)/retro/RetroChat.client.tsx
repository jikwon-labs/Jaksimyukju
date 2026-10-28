"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { roommateAction, saveRetroAction } from "@/app/actions/retro";
import { Switch } from "@/components/ui";
import type { TeacherName } from "@/lib/design/types";
import { RETRO_STEPS, retroPlan } from "@/lib/domain/retro";
import type { RetroCard } from "@/lib/ai/types";
import s from "./retro.module.css";

interface Msg {
  from: "ai" | "me";
  text: string;
}

export function RetroChat({
  who,
  lines,
  chips,
  nextWeek,
  milestone,
  planOpts,
}: {
  who: TeacherName;
  lines: string[];
  chips: string[][];
  nextWeek: number;
  milestone: string;
  planOpts: { days: string[]; shortDay: string | null; minutes: number; daysLabel: string };
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [card, setCard] = useState<RetroCard | null>(null);
  const [failed, setFailed] = useState(false);
  const [share, setShare] = useState(true);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, startSave] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const step = answers.length;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [answers, typing, card]);

  async function finish(all: string[]) {
    setFailed(false);
    const forAi = [all[0], all[1], retroPlan(all[2], planOpts)];
    const r = await roommateAction(forAi);
    setTyping(false);
    if (r.ok) setCard(r.card);
    else setFailed(true);
  }

  function answer(text: string) {
    const t = text.trim();
    if (!t || typing || step >= RETRO_STEPS) return;
    const next = [...answers, t];
    setAnswers(next);
    setDraft("");
    setTyping(true);
    if (timer.current) clearTimeout(timer.current);
    if (next.length >= RETRO_STEPS) {
      void finish(next);
    } else {
      timer.current = setTimeout(() => setTyping(false), 900);
    }
  }

  const msgs: Msg[] = [];
  for (let i = 0; i <= Math.min(step, RETRO_STEPS); i++) {
    if (i > 0) msgs.push({ from: "me", text: answers[i - 1] });
    const last = i === step || (i === RETRO_STEPS && step === RETRO_STEPS);
    if (i < RETRO_STEPS ? !(last && typing) : !!card) msgs.push({ from: "ai", text: lines[i] });
  }
  if (card) msgs.push({ from: "ai", text: card.bridge });

  const asking = step < RETRO_STEPS && !typing;
  const finished = !!card;

  function save() {
    if (!card) return;
    startSave(async () => {
      const r = await saveRetroAction({ answers, pledge: card.pledge, shared: share });
      if (!r.ok) {
        setMsg("저장하지 못했어요. 다시 눌러 주세요");
        return;
      }
      setMsg(share ? "다짐을 저장하고 그룹에 알렸어요" : "다짐을 저장했어요");
      router.push("/home");
    });
  }

  return (
    <>
      <div className={s.chat} aria-live="polite" data-testid="retro-chat">
        {msgs.map((m, i) => (
          <div key={i} className={s.row} data-from={m.from}>
            <p className={s.bubble} data-from={m.from}>
              {m.text}
            </p>
          </div>
        ))}
        {typing && (
          <div className={s.dots} aria-label={`${who} 선생님이 입력 중`} role="status">
            <span />
            <span />
            <span />
          </div>
        )}
        {failed && (
          <div className={s.fail} role="alert">
            <p>선생님이 잠깐 말을 놓쳤어요. 답은 그대로 저장해 뒀어요.</p>
            <button
              type="button"
              className={s.retry}
              onClick={() => {
                setTyping(true);
                void finish(answers);
              }}
            >
              다시 받아 보기
            </button>
          </div>
        )}

        {finished && card && (
          <>
            <section aria-label="다음 주 다짐" className={s.pledge} data-testid="pledge-card">
              <span className={s.eyebrow}>{nextWeek}주차 다짐 카드</span>
              <strong className={s.pledgeText}>{card.pledge}</strong>
              <span className={s.milestone}>{milestone}</span>
            </section>
            <div className={s.shareCard}>
              <Switch
                label="그룹에 다짐 공유하기"
                sub="다짐 한 줄만 보여요. 대화 내용은 나만 봐요"
                on={share}
                onChange={setShare}
              />
            </div>
          </>
        )}
        <div ref={endRef} />
      </div>

      <div className={s.bottom}>
        {asking && (
          <>
            {chips[step]?.map((c) => (
              <button key={c} type="button" className={s.chip} onClick={() => answer(c)}>
                {c}
              </button>
            ))}
            <form
              className={s.inputRow}
              onSubmit={(e) => {
                e.preventDefault();
                answer(draft);
              }}
            >
              <input
                className={s.input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="직접 답하기"
                aria-label="직접 답하기"
                maxLength={200}
                data-testid="retro-input"
              />
              <button type="submit" className={s.send} disabled={!draft.trim()} data-testid="retro-send">
                보내기
              </button>
            </form>
          </>
        )}
        {finished && (
          <button type="button" className={s.finish} onClick={save} disabled={saving} data-testid="retro-save">
            {saving ? "저장하는 중" : "다짐 저장하고 마치기"}
          </button>
        )}
        <span role="status" aria-live="polite" className={s.status}>
          {msg}
        </span>
      </div>
    </>
  );
}
