"use client";

import { useEffect, useId } from "react";
import { speak, stop, stopIf, usePlaying, useSpeechPrefs, useSpeechSupported } from "./speech";
import s from "./speech.module.css";

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/**
 * 누르면 text를 읽고, 읽는 중에 누르면 멈춘다.
 * 이 기기에서 못 쓰거나 설정에서 꺼 두면 그리지 않는다.
 */
export function ListenButton({
  text,
  label = "듣기",
  compact = false,
  testId,
}: {
  text: string;
  /** 화면에 보이는 글자. 스크린리더용 이름도 이걸로 만든다 */
  label?: string;
  /** 말풍선 옆처럼 좁은 자리에서는 아이콘만 */
  compact?: boolean;
  testId?: string;
}) {
  const id = useId();
  const ok = useSpeechSupported();
  const prefs = useSpeechPrefs();
  const playing = usePlaying() === id;

  // 화면을 떠나면 읽던 것을 멈춘다
  useEffect(() => () => stopIf(id), [id]);

  if (!ok || !prefs.on) return null;
  return (
    <button
      type="button"
      className={s.listen}
      data-compact={compact || undefined}
      aria-pressed={playing}
      aria-label={playing ? "읽기 멈추기" : label}
      onClick={() => (playing ? stop() : speak(id, text, prefs))}
      data-testid={testId}
    >
      {playing ? <StopIcon /> : <SpeakerIcon />}
      {!compact && <span>{playing ? "멈추기" : label}</span>}
    </button>
  );
}
