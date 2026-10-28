"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { linkAccountAction, wrapUpAction } from "@/app/actions/lesson";
import { Switch } from "@/components/ui";
import { ONE_LINER_MAX } from "@/lib/domain/lesson";
import s from "./complete.module.css";

const FORM = "wrapup";

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className={s.buttons}>
      <button type="submit" name="to" value="curriculum" className={s.next} disabled={pending}>
        다음 칸 보기
      </button>
      <button type="submit" name="to" value="home" className={s.home} disabled={pending} data-testid="complete-home">
        홈으로
      </button>
    </div>
  );
}

function LinkCard() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (msg?.ok) {
    return (
      <div role="status" className={s.linked} data-testid="link-done">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        {msg.text}
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await linkAccountAction(email);
      setMsg({ ok: r.ok, text: r.message });
    });
  }

  return (
    <section aria-label="계정 연결" className={s.linkCard} data-testid="link-account">
      <h2>오늘 채운 잔디를 지키려면</h2>
      <p>계정을 연결하면 휴대폰을 바꾸거나 앱을 지워도 기록과 그룹이 남아요. 10초면 끝나요.</p>
      <div className={s.linkBtns}>
        <button type="button" className={s.apple} onClick={() => setOpen(true)} aria-expanded={open}>
          Apple
        </button>
        <button type="button" className={s.outline} onClick={() => setOpen(true)} aria-expanded={open}>
          Google
        </button>
        <button type="button" className={s.outline} onClick={() => setOpen(true)} aria-expanded={open} data-testid="link-email">
          이메일
        </button>
      </div>
      {open && (
        <form className={s.emailRow} onSubmit={submit}>
          <label htmlFor="link-email-input" className={s.srOnly}>
            이메일 주소
          </label>
          <input
            id="link-email-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={s.emailInput}
            data-testid="link-email-input"
            required
          />
          <button type="submit" className={s.emailBtn} disabled={pending} data-testid="link-submit">
            {pending ? "연결 중" : "연결"}
          </button>
        </form>
      )}
      {open && <p className={s.foot}>지금은 이메일로 연결해요. Apple·Google 연결은 곧 열려요.</p>}
      {msg && !msg.ok && (
        <p role="alert" className={s.error}>
          {msg.text}
        </p>
      )}
      <p className={s.foot}>연결하면 이용약관과 개인정보 처리방침에 동의하게 돼요.</p>
    </section>
  );
}

export function CompleteActions({
  lessonId,
  oneLiner,
  needLink,
  groupInitials,
}: {
  lessonId: string;
  oneLiner: string;
  needLink: boolean;
  groupInitials: string[];
}) {
  const [share, setShare] = useState(true);
  const [line, setLine] = useState(oneLiner);

  return (
    <>
      <section aria-label="오늘 배운 한 줄" className={s.oneLiner}>
        <label htmlFor="one-liner" className={s.oneLabel}>
          오늘 배운 한 줄
        </label>
        <textarea
          id="one-liner"
          name="oneLiner"
          form={FORM}
          rows={2}
          maxLength={ONE_LINER_MAX}
          placeholder="오늘 배운 걸 한 문장으로 적어 보세요"
          value={line}
          onChange={(e) => setLine(e.target.value)}
          className={s.oneInput}
          data-testid="one-liner"
        />
      </section>

      {needLink && <LinkCard />}

      {groupInitials.length > 0 && (
        <div className={s.switchCard}>
          <Switch
            on={share}
            onChange={setShare}
            label="그룹에 완료 알리기"
            sub={`${groupInitials.join(", ")}님에게 "오늘 완료"만 보여요`}
          />
          <input type="hidden" name="share" value={share ? "on" : "off"} form={FORM} />
        </div>
      )}

      <form id={FORM} action={wrapUpAction}>
        <input type="hidden" name="lessonId" value={lessonId} />
        <Buttons />
      </form>
    </>
  );
}
