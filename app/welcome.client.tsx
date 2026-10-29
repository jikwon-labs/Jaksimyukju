"use client";

import Link from "next/link";
import { useState } from "react";
import { Teacher } from "@/components/teacher/Teacher";
import type { TeacherName } from "@/lib/design/types";
import { PROVIDER_LABEL, type ProviderId } from "@/lib/domain/oauth";
import s from "./welcome.module.css";

const POINTS = [
  "배우고 싶은 걸 말하면 몇 주짜리 길을 짜 줘요",
  "하루 10분, 한 칸씩 채우면 잔디가 자라요",
  "쉬는 날엔 동료가 콕 찔러 줘요",
];

const LOGIN_MESSAGE: Record<string, string> = {
  none: "이 계정에 연결된 기록이 없어요. 처음이라면 뒤로 가서 시작하기를 눌러 주세요.",
  cancel: "로그인을 취소했어요.",
  failed: "로그인하지 못했어요. 잠시 뒤 다시 해 주세요.",
};

export function Welcome({
  teacher,
  invite,
  providers,
  loginResult,
  guestAtRisk,
}: {
  teacher: TeacherName;
  invite: { inviter: string; group: string } | null;
  providers: ProviderId[];
  loginResult: string | null;
  guestAtRisk: boolean;
}) {
  // 로그인에서 돌아온 경우(?login=사유)에는 로그인 단계를 바로 보여 준다
  const [step, setStep] = useState<"intro" | "login">(loginResult ? "login" : "intro");
  const error = loginResult ? LOGIN_MESSAGE[loginResult] : undefined;
  const [accepted, setAccepted] = useState(false);
  const showProviders = !guestAtRisk || accepted;

  if (step === "login") {
    return (
      <main className={s.login}>
        <button type="button" aria-label="뒤로" className={s.back} onClick={() => setStep("intro")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className={s.loginMid}>
          <Teacher who={teacher} size={88} jump style={{ alignSelf: "flex-start" }} />
          <h1 className={s.loginTitle}>
            계정으로
            <br />
            이어서 하기
          </h1>
          <p className={s.loginText}>전에 쓰던 휴대폰의 잔디, 선생님, 그룹을 그대로 불러와요.</p>
        </div>
        {error && (
          <p role="alert" className={s.error} data-testid="login-error">
            {error}
          </p>
        )}
        {!showProviders && (
          <div role="alert" className={s.warnBox} data-testid="guest-warning">
            <p>
              이 휴대폰에 계정을 연결하지 않은 기록이 있어요. 다른 계정으로 들어가면 그 기록은 다시 열 수 없어요.
            </p>
            <button type="button" className={s.warnBtn} onClick={() => setAccepted(true)}>
              알겠어요, 다른 계정으로 들어갈게요
            </button>
          </div>
        )}
        <div className={s.providers} hidden={!showProviders}>
          {providers.map((p) => (
            <a key={p} href={`/api/auth/${p}/start?mode=login`} className={s.provider} data-kind={p} data-testid={`login-${p}`}>
              {PROVIDER_LABEL[p]}로 계속하기
            </a>
          ))}
        </div>
        <p className={s.footnote}>
          {providers.length > 0 ? "처음이라면 뒤로 가서 시작하기를 눌러 주세요." : "계정 로그인은 곧 열려요. 처음이라면 시작하기를 눌러 주세요."}
        </p>
      </main>
    );
  }

  return (
    <main className={s.intro}>
      <div className={s.hero}>
        <div className={s.trio} aria-hidden="true">
          <Teacher who="온" size={92} jump decorative />
          <Teacher who="결" size={112} jump decorative style={{ marginBottom: 8 }} />
          <Teacher who="새" size={92} jump decorative />
        </div>
        <h1 className={s.wordmark}>작심육주</h1>
        <p className={s.tagline}>
          작심삼일, 이번엔 끝까지.
          <br />
          AI 선생님이 길을 짜고, 동료가 같이 걸어요.
        </p>
        <ul className={s.points}>
          {POINTS.map((t) => (
            <li key={t}>
              <span className={s.check} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      {invite && (
        <p className={s.invite} data-testid="inviter">
          <strong>{invite.inviter}님</strong>이 &lsquo;{invite.group}&rsquo;에 초대했어요
        </p>
      )}
      <Link href="/start/personality" className={s.cta} data-testid="start">
        시작하기
      </Link>
      <p className={s.caption}>가입 없이 바로 시작해요. 계정은 첫 레슨을 마친 뒤에 연결해요.</p>
      <button type="button" className={s.textBtn} onClick={() => setStep("login")} data-testid="have-account">
        이미 계정이 있어요
      </button>
    </main>
  );
}
