"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReadingPart } from "./speech";
import s from "./speech.module.css";

/**
 * 듣기 버튼이 지금 이 덩어리를 읽고 있으면 표시하고, 화면 밖이면 보이게 굴린다.
 * group은 ListenButton의 id, index는 그 버튼에 넘긴 text 배열의 몇 번째인지.
 */
export function ReadingMark({ group, index, children }: { group: string; index: number; children: ReactNode }) {
  const on = useReadingPart(group) === index;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!on || !ref.current) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    ref.current.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [on]);
  return (
    <div ref={ref} className={s.reading} data-reading={on || undefined}>
      {children}
    </div>
  );
}
