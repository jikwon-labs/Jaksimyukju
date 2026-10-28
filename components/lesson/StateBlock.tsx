import type { ReactNode } from "react";
import { Teacher } from "@/components/teacher/Teacher";
import type { FaceState, TeacherName } from "@/lib/design/types";
import { OFFLINE_BAR } from "./copy";
import s from "./parts.module.css";

/** 목업 States의 한 칸(AI 실패, 자료 없음, 오프라인)을 화면 안에 끼워 넣는 블록 */
export function StateBlock({
  who,
  face,
  tag,
  title,
  body,
  note,
  actions,
  size = 120,
  compact,
  testId,
}: {
  who: TeacherName;
  face: FaceState;
  tag: string;
  title: string;
  body: string;
  note?: ReactNode;
  actions?: ReactNode;
  size?: number;
  compact?: boolean;
  testId?: string;
}) {
  return (
    <section className={compact ? `${s.state} ${s.stateCompact}` : s.state} aria-label={tag} data-testid={testId}>
      <div className={s.stateCenter}>
        <Teacher who={who} state={face} size={size} jump label={`${who} 선생님, ${tag}`} />
        <span className={s.stateTag}>{tag}</span>
        <h2 className={s.stateTitle}>{title}</h2>
        <p className={s.stateBody}>{body}</p>
        {note && <div className={s.stateNote}>{note}</div>}
      </div>
      {actions && <div className={s.stateActions}>{actions}</div>}
    </section>
  );
}

export function WifiOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 8.8a15 15 0 0 1 4.2-2.6" />
      <path d="M22 8.8A15 15 0 0 0 12 5c-.7 0-1.4 0-2 .1" />
      <path d="M5.5 12.4a10 10 0 0 1 3-1.8" />
      <path d="M18.5 12.4a10 10 0 0 0-2.4-1.5" />
      <path d="M9 15.9a5 5 0 0 1 6 0" />
      <path d="M12 20h.01" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

/** 오프라인 띠 */
export function OfflineBar() {
  return (
    <div role="status" className={s.offlineBar} data-testid="offline-banner">
      <WifiOffIcon />
      {OFFLINE_BAR}
    </div>
  );
}

export function ArrowOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
