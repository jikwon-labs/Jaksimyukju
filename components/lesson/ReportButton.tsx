"use client";

import { useState, useTransition } from "react";
import { reportAction } from "@/app/actions/report";
import s from "./lesson.module.css";

const REASONS = ["설명이 틀린 것 같아요", "자료 링크가 이상해요", "너무 어려워요"] as const;

/** AI가 틀린 내용을 가르칠 때를 대비한 "이상해요" 신고 */
export function ReportButton({
  lessonId,
  resourceId,
  label = "이상해요",
  reasons = REASONS,
}: {
  lessonId?: string;
  resourceId?: string;
  label?: string;
  reasons?: readonly (typeof REASONS)[number][];
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  if (done) {
    return (
      <p role="status" className={s.reported} data-testid="report-done">
        알려 줘서 고마워요. 선생님이 다시 확인해 볼게요.
      </p>
    );
  }
  return (
    <div className={s.reportBox}>
      <button
        type="button"
        className={s.reportBtn}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-testid="report-open"
      >
        {label}
      </button>
      {open && (
        <div role="group" aria-label="무엇이 이상한가요" className={s.reportReasons}>
          {reasons.map((r) => (
            <button
              key={r}
              type="button"
              className={s.reportReason}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setDone(await reportAction({ lessonId, resourceId, reason: r }));
                })
              }
            >
              {r}
            </button>
          ))}
        </div>
      )}
      {done === false && (
        <p role="status" className={s.reported}>
          보내지 못했어요. 잠시 뒤 다시 눌러 주세요.
        </p>
      )}
    </div>
  );
}
