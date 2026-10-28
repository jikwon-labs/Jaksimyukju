"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { comebackAction } from "@/app/actions/rest";
import type { TeacherName } from "@/lib/design/types";
import type { ReplanKind } from "@/lib/domain/rest";
import s from "./comeback.module.css";

function Submit({ to, className, children, testid }: { to: string; className: string; children: string; testid: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="to" value={to} className={className} disabled={pending} data-testid={testid}>
      {pending ? "다시 짜는 중" : children}
    </button>
  );
}

export function ComebackForm({
  options,
  recommended,
  who,
  n,
}: {
  options: { kind: ReplanKind; title: string; desc: string }[];
  recommended: ReplanKind;
  who: TeacherName;
  n: number;
}) {
  const [pick, setPick] = useState<ReplanKind>(recommended);
  return (
    <form action={comebackAction} className={s.form}>
      <input type="hidden" name="plan" value={pick} />
      <section aria-label="밀린 진도 다시 짜기" className={s.section}>
        <h2 className={s.h2}>밀린 레슨 {n}개, 어떻게 할까요?</h2>
        <div role="radiogroup" aria-label="다시 짜는 방법" className={s.options}>
          {options.map((o) => (
            <button
              key={o.kind}
              type="button"
              role="radio"
              aria-checked={pick === o.kind}
              className={s.option}
              data-testid={`replan-${o.kind}`}
              onClick={() => setPick(o.kind)}
            >
              <span className={s.ring} aria-hidden>
                <span className={s.ringDot} />
              </span>
              <span className={s.optText}>
                <span className={s.optTitleRow}>
                  <span className={s.optTitle}>{o.title}</span>
                  {o.kind === recommended && <span className={s.reco}>{who} 추천</span>}
                </span>
                <span className={s.optDesc}>{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <p className={s.privacy}>
        그룹에는 &quot;돌아왔어요&quot;만 알려요. 왜 쉬었는지는 묻지 않아요. 야근 주간이나 휴가처럼 미리 알면{" "}
        <Link href="/pause" className={s.pauseLink}>
          쉬어 가기
        </Link>
        를 걸어 두세요. 연속 기록이 끊기지 않아요.
      </p>

      <div className={s.actions}>
        <Submit to="home" className={s.primary} testid="comeback-submit">
          이대로 다시 짜기
        </Submit>
        <Submit to="short" className={s.secondary} testid="comeback-short">
          다시 짜고 오늘 5분만 하기
        </Submit>
      </div>
    </form>
  );
}
