"use client";

import { useState, useTransition } from "react";
import { renameWeekAction } from "@/app/actions/start";
import s from "./preview.module.css";

type Week = { title: string; milestone: string };

/** 주차별 계획. 주차마다 제목과 마일스톤을 고칠 수 있다(F3) */
export function WeekList({ initial }: { initial: Week[] }) {
  const [weeks, setWeeks] = useState(initial);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Week>({ title: "", milestone: "" });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function open(i: number) {
    setEditing(i);
    setDraft(weeks[i]);
    setMsg("");
  }

  function save(i: number) {
    start(async () => {
      const r = await renameWeekAction(i + 1, draft.title, draft.milestone);
      if (!r.ok) {
        setMsg(r.message ?? "저장하지 못했어요");
        return;
      }
      setWeeks((ws) => ws.map((w, k) => (k === i ? { title: draft.title.trim(), milestone: draft.milestone.trim() } : w)));
      setEditing(null);
      setMsg(`${i + 1}주차를 고쳤어요`);
    });
  }

  return (
    <section aria-label="주차별 계획" className={s.weeks}>
      {weeks.map((w, i) =>
        editing === i ? (
          <form
            key={i}
            className={s.weekEdit}
            onSubmit={(e) => {
              e.preventDefault();
              save(i);
            }}
          >
            <label className={s.editLabel}>
              {i + 1}주 제목
              <input
                className={s.editInput}
                value={draft.title}
                maxLength={40}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                data-testid={`week-title-input-${i + 1}`}
              />
            </label>
            <label className={s.editLabel}>
              마일스톤
              <input
                className={s.editInput}
                value={draft.milestone}
                maxLength={80}
                onChange={(e) => setDraft({ ...draft, milestone: e.target.value })}
              />
            </label>
            <div className={s.editActions}>
              <button type="button" className={s.editCancel} onClick={() => setEditing(null)}>
                취소
              </button>
              <button type="submit" className={s.editSave} disabled={pending} data-testid={`week-save-${i + 1}`}>
                저장
              </button>
            </div>
          </form>
        ) : (
          <div key={i} className={s.week}>
            <span className={s.badge} data-first={i === 0 ? "true" : "false"}>
              {i + 1}주
            </span>
            <div className={s.weekText}>
              <span className={s.weekTitle} data-testid={`week-title-${i + 1}`}>
                {w.title}
              </span>
              <span className={s.weekMs}>마일스톤: {w.milestone}</span>
            </div>
            <button
              type="button"
              className={s.editBtn}
              onClick={() => open(i)}
              aria-label={`${i + 1}주차 고치기`}
              data-testid={`week-edit-${i + 1}`}
            >
              고치기
            </button>
          </div>
        ),
      )}
      <p role="status" aria-live="polite" className={s.editMsg}>
        {msg}
      </p>
    </section>
  );
}
