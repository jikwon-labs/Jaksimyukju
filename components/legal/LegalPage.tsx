import Link from "next/link";
import type { ReactNode } from "react";
import { POLICY_EFFECTIVE_DATE } from "@/lib/legal";
import s from "./legal.module.css";

/** 약관·처리방침 공용 틀. 로그인 없이 열린다(App Store Connect의 개인정보 처리방침 주소로도 쓴다) */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={s.page}>
      <nav className={s.nav} aria-label="약관과 정책">
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy">개인정보 처리방침</Link>
        <Link href="/ai-consent?next=%2Fhome">AI 선생님과 데이터</Link>
      </nav>
      <h1 className={s.title}>{title}</h1>
      <p className={s.date}>시행일: {POLICY_EFFECTIVE_DATE}</p>
      <div className={s.intro}>{intro}</div>
      <div className={s.body}>{children}</div>
    </main>
  );
}

export function Article({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={s.article}>
      <h2 id={id} className={s.h2}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export const legalStyles = s;
