"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Teacher } from "@/components/teacher/Teacher";
import { TEACHER_NAMES } from "@/lib/design/tokens";
import type { TeacherName } from "@/lib/design/types";
import { applyTeacher, draftTeacher, useDraft, writeDraft } from "../draft";
import { StepHeader } from "../StepHeader";
import st from "../start.module.css";
import s from "./teacher.module.css";

const INFO: Record<TeacherName, { title: string; desc: string; label: string }> = {
  온: { title: "다정한 페이스메이커", desc: "지친 날엔 5분 버전부터 권해 줘요", label: "파란 동그라미 온" },
  결: { title: "단호하고 성격 급한 코치", desc: "목표까지 남은 분량을 숫자로 짚어 줘요", label: "빨간 동그라미 결" },
  새: { title: "호기심 많은 탐험가", desc: "다른 분야와 엮은 질문으로 흥미를 붙여 줘요", label: "초록 동그라미 새" },
};

export function TeacherPick() {
  const draft = useDraft();
  const picked = draftTeacher(draft);
  const reco = draft.reco ?? "온";

  // 저장된 선택(또는 추천)을 강조색에 반영한다
  useEffect(() => {
    applyTeacher(picked);
  }, [picked]);

  function pick(who: TeacherName) {
    writeDraft({ teacher: who });
    applyTeacher(who);
  }

  return (
    <main className={st.screen}>
      <StepHeader step={1} backHref="/start/personality" backLabel="성향 질문으로 돌아가기" />
      <div className={s.stage}>
        <span className={s.floor} aria-hidden="true" />
        <Teacher key={picked} who={picked} size={168} jump label={INFO[picked].label} className={s.arrive} />
      </div>
      <div className={s.titleBlock}>
        <h1 className={s.title}>함께할 선생님을 데려오세요</h1>
        <p className={s.sub}>
          답변을 보니 <strong className={s.recoName} data-who={reco}>{reco}</strong> 선생님이 잘 맞아요. 언제든 바꿀 수 있고, 진도는 그대로예요.
        </p>
      </div>
      <div role="radiogroup" aria-label="선생님" className={s.cards}>
        {TEACHER_NAMES.map((who) => (
          <button
            key={who}
            type="button"
            role="radio"
            aria-checked={who === picked}
            className={s.card}
            data-who={who}
            onClick={() => pick(who)}
            data-testid={`teacher-card-${who}`}
          >
            <Teacher who={who} size={60} decorative />
            <span className={s.cardText}>
              <span className={s.cardRow}>
                <span className={s.name}>{who}</span>
                <span className={s.cardTitle}>{INFO[who].title}</span>
                {who === reco && <span className={s.badge}>추천</span>}
              </span>
              <span className={s.desc}>{INFO[who].desc}</span>
            </span>
            <span className={s.radio} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          </button>
        ))}
      </div>
      <div className={st.spacer} />
      <Link href="/start/topic" className={st.cta} data-testid="teacher-next">
        {picked} 선생님과 시작하기
      </Link>
    </main>
  );
}
