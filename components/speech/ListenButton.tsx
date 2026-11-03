"use client";

import { useEffect, useId } from "react";
import { speak, stop, stopIf, usePlaying, useSpeechPrefs, useSpeechSupported } from "./speech";
import { useHqState, warmHq } from "./supertonic";
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
  id: given,
  label = "듣기",
  compact = false,
  testId,
}: {
  /** 배열이면 화면의 덩어리별 글. 읽는 동안 useReadingPart(id)로 지금 덩어리를 알 수 있다 */
  text: string | readonly string[];
  /** 읽는 덩어리를 화면에 표시하려면 같은 id를 ReadingMark·useReadingPart에 넘긴다 */
  id?: string;
  /** 화면에 보이는 글자. 스크린리더용 이름도 이걸로 만든다 */
  label?: string;
  /** 말풍선 옆처럼 좁은 자리에서는 아이콘만 */
  compact?: boolean;
  testId?: string;
}) {
  const auto = useId();
  const id = given ?? auto;
  const prefs = useSpeechPrefs();
  const hq = useHqState();
  const ok = useSpeechSupported() || (prefs.engine === "hq" && hq.kind === "ready");
  const playing = usePlaying() === id;

  // 고품질 목소리는 세션 준비에 몇 초 걸려서, 버튼이 보일 때 미리 준비한다
  const warm = prefs.on && prefs.engine === "hq" && hq.kind === "ready";
  useEffect(() => {
    if (warm) warmHq();
  }, [warm]);

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
