"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeTeacherAction } from "@/app/actions/settings";
import { Teacher } from "@/components/teacher/Teacher";
import { TEACHER_NAMES } from "@/lib/design/tokens";
import type { TeacherName } from "@/lib/design/types";
import s from "./profile.module.css";

export const TEACHER_ROLES: Record<TeacherName, string> = {
  온: "다정한 페이스메이커",
  결: "단호하고 성격 급한 코치",
  새: "호기심 많은 탐험가",
};

const LOOKS: Record<TeacherName, string> = {
  온: "파란 동그라미 온",
  결: "빨간 동그라미 결",
  새: "초록 동그라미 새",
};

/** 서버 응답을 기다리지 않고 강조색을 바로 바꾼다 */
function applyTeacher(t: TeacherName) {
  document.documentElement.dataset.teacher = t;
}

/** 선생님 바꾸기. 색은 바로 바뀌고, 진도는 그대로 남는다 */
export function TeacherPicker({
  initial,
  since,
  open: startOpen = false,
}: {
  initial: TeacherName;
  since: string;
  open?: boolean;
}) {
  const [who, setWho] = useState<TeacherName>(initial);
  const [open, setOpen] = useState(startOpen);
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();
  const router = useRouter();

  function pick(t: TeacherName) {
    if (t === who) return;
    const prev = who;
    setWho(t);
    applyTeacher(t);
    start(async () => {
      const r = await changeTeacherAction(t);
      if (!r.ok) {
        setWho(prev);
        applyTeacher(prev);
        setMsg("바꾸지 못했어요. 다시 골라 주세요");
        return;
      }
      setMsg(`${t} 선생님으로 바꿨어요. 진도는 그대로예요`);
      router.refresh();
    });
  }

  return (
    <div className={s.pickerWrap} id="teacher">
      <section aria-label="내 선생님" className={s.teacherCard}>
        <span className={s.teacherSlot}>
          <Teacher who={who} size={96} jump label={LOOKS[who]} />
        </span>
        <span className={s.teacherText}>
          <span className={s.meta}>내 선생님</span>
          <span className={s.teacherNameRow}>
            <span className={s.teacherName}>{who}</span>
            <span className={s.teacherRole}>{TEACHER_ROLES[who]}</span>
          </span>
          <span className={s.meta}>{since}</span>
        </span>
        <button
          type="button"
          className={s.change}
          aria-expanded={open}
          aria-controls="teacher-options"
          data-testid="teacher-change"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "닫기" : "바꾸기"}
        </button>
      </section>
      {open && (
        <div id="teacher-options" role="radiogroup" aria-label="선생님 고르기" className={s.options}>
          {TEACHER_NAMES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={who === t}
              className={s.option}
              data-teacher={t}
              data-testid={`teacher-${t}`}
              onClick={() => pick(t)}
            >
              <Teacher who={t} size={56} decorative />
              <span className={s.optionName}>{t}</span>
              <span className={s.optionRole}>{TEACHER_ROLES[t]}</span>
            </button>
          ))}
        </div>
      )}
      <span role="status" aria-live="polite" className={s.status}>
        {msg}
      </span>
    </div>
  );
}
