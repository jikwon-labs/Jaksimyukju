"use client";

import { type ReactNode, useEffect, useState, useTransition } from "react";
import { regenerateInviteAction } from "@/app/actions/social";
import { inviteExpired, inviteLeftLabel, inviteUrl } from "@/lib/domain/social";
import s from "./invite.module.css";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 권한이 없으면 숨은 입력창으로 한 번 더 시도한다
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function InviteLink({
  origin,
  groupName,
  count,
  max,
  code: initialCode,
  expiresAt: initialExpires,
  children,
}: {
  origin: string;
  groupName: string;
  count: number;
  max: number;
  code: string;
  expiresAt: string;
  children: ReactNode;
}) {
  const [code, setCode] = useState(initialCode);
  const [expiresAt, setExpiresAt] = useState(initialExpires);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    // 남은 기간은 브라우저 시각으로 계산한다(서버 렌더와 어긋나지 않게 마운트 뒤에)
    const id = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(id);
  }, []);
  const url = inviteUrl(origin, code);
  const exp = new Date(expiresAt);
  const expired = now ? inviteExpired(exp, now) : false;

  async function copy() {
    const ok = await copyText(url);
    setCopied(ok);
    setMsg(ok ? "복사했어요" : "복사하지 못했어요. 링크를 길게 눌러 복사해 주세요");
  }

  async function send() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${groupName}에 초대해요`, text: "작심육주에서 같이 공부해요", url });
        setMsg("보냈어요");
        return;
      } catch {
        // 공유 창을 닫으면 복사로 넘어간다
      }
    }
    await copy();
  }

  function regenerate() {
    start(async () => {
      const r = await regenerateInviteAction();
      if (!r) {
        setMsg("새 링크를 만들지 못했어요");
        return;
      }
      setCode(r.code);
      setExpiresAt(r.expiresAt);
      setCopied(false);
      setNow(new Date());
      setMsg("새 링크를 만들었어요. 이전 링크는 이제 열리지 않아요");
    });
  }

  return (
    <>
      <section aria-label="초대 링크" className={s.card}>
        <div className={s.cardRow}>
          <span className={s.groupName}>{groupName}</span>
          <span className={s.meta}>
            {count} / {max}명
          </span>
        </div>
        <div className={s.field} data-expired={expired ? "true" : "false"}>
          <span className={s.url} data-testid="invite-link">
            {url}
          </span>
          <button
            type="button"
            className={s.copy}
            data-copied={copied ? "true" : "false"}
            data-testid="copy-invite"
            onClick={copy}
            disabled={expired}
          >
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
        <div className={s.noteRow}>
          <span className={s.note}>
            {expired
              ? "만료된 링크예요. 새로 만들어 주세요."
              : `링크는 7일 뒤 만료돼요. 새로 만들면 이전 링크는 막혀요.${now ? ` (${inviteLeftLabel(exp, now)})` : ""}`}
          </span>
          <button type="button" className={s.regen} onClick={regenerate} disabled={pending} data-testid="regenerate-invite">
            {pending ? "만드는 중" : "새 링크 만들기"}
          </button>
        </div>
        <span role="status" aria-live="polite" className={s.status}>
          {msg}
        </span>
      </section>
      {children}
      <button type="button" className={s.primary} onClick={send} disabled={expired}>
        초대 링크 보내기
      </button>
    </>
  );
}
