"use client";

import { useState, useTransition } from "react";
import { acceptInviteAction } from "@/app/actions/social";
import s from "./receive.module.css";

export function JoinButton({ code, label }: { code: string; label: string }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        className={s.primary}
        data-testid="join-group"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await acceptInviteAction(code);
            if (r && !r.ok) setMsg(r.message);
          })
        }
      >
        {pending ? "들어가는 중" : label}
      </button>
      <span role="status" aria-live="polite" className={s.warn}>
        {msg}
      </span>
    </>
  );
}
