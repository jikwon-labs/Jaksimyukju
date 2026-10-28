import Link from "next/link";
import s from "./start.module.css";

/** 뒤로 버튼 + 3단계 점 + "n / 3" */
export function StepHeader({ step, backHref, backLabel }: { step: 1 | 2 | 3; backHref: string; backLabel: string }) {
  return (
    <header className={s.header}>
      <Link href={backHref} aria-label={backLabel} className={s.back}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <div className={s.dots} role="img" aria-label={`3단계 중 ${step}단계`}>
        {[1, 2, 3].map((i) => (
          <span key={i} className={s.dot} data-on={i <= step ? "true" : "false"} data-current={i === step ? "true" : "false"} />
        ))}
      </div>
      <span className={s.count} aria-hidden="true">
        {step} / 3
      </span>
    </header>
  );
}
