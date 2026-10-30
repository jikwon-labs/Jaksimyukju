"use client";

import { useEffect, useState, useTransition } from "react";
import { nudgeAction } from "@/app/actions/group";
import s from "./NudgeButton.module.css";

/** 안내 말풍선이 떠 있는 시간 */
export const TOAST_MS = 4000;

export function NudgeButton({
  toId,
  name,
  disabledMessage,
  label = "콕 찌르기",
}: {
  toId: string;
  name: string;
  disabledMessage?: string;
  label?: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <span className={s.wrap}>
      <button
        type="button"
        className={s.btn}
        aria-label={`${name}님 ${label}`}
        data-blocked={done || !!disabledMessage ? "true" : undefined}
        disabled={pending}
        onClick={() => {
          if (disabledMessage) {
            setMsg(disabledMessage);
            return;
          }
          start(async () => {
            const r = await nudgeAction(toId);
            setMsg(r.message);
            setDone(true);
          });
        }}
      >
        {done ? "찔렀어요" : label}
      </button>
      <span role="status" aria-live="polite" className={msg ? s.toast : s.hidden}>
        {msg}
      </span>
    </span>
  );
}
