"use client";

import Link from "next/link";
import { Teacher } from "@/components/teacher/Teacher";
import type { TeacherName } from "@/lib/design/types";
import { PERSONALITY_QUESTIONS, recommendTeacher, TEACHER_WHY } from "@/lib/domain/personality";
import { applyTeacher, useDraft, writeDraft } from "../draft";
import st from "../start.module.css";
import s from "./personality.module.css";

export function Personality() {
  const draft = useDraft();
  const answers = draft.answers.slice(0, 3);
  const step = answers.length;
  const finished = step >= 3;
  const reco = recommendTeacher(answers);
  const q = PERSONALITY_QUESTIONS[Math.min(step, 2)];

  function pick(who: TeacherName) {
    const next = answers.concat([who]);
    if (next.length >= 3) {
      const r = recommendTeacher(next);
      // 추천이 나오면 그 선생님으로 바로 고른 상태가 된다(선생님 고르기에서 바꿀 수 있다)
      writeDraft({ answers: next, reco: r, teacher: r });
      applyTeacher(r);
    } else {
      writeDraft({ answers: next });
    }
  }

  const dim = (who: TeacherName) => (finished && who !== reco ? 0.35 : 1);

  return (
    <main className={`${st.screen} ${s.root}`}>
      <header className={st.header}>
        <span className={s.logo}>작심육주</span>
        <span className={s.stepLabel} aria-live="polite">
          {finished ? "완료" : `질문 ${step + 1} / 3`}
        </span>
      </header>
      <div className={s.bars} role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={Math.min(step, 3)} aria-label="성향 질문 진행">
        {[1, 2, 3].map((i) => (
          <span key={i} className={s.bar} data-on={step >= i || (!finished && step === i - 1) ? "true" : "false"} />
        ))}
      </div>
      <div className={s.trio} aria-hidden="true">
        <Teacher who="온" size={76} decorative style={{ opacity: dim("온") }} />
        <Teacher who="결" size={88} decorative style={{ opacity: dim("결") }} />
        <Teacher who="새" size={76} decorative style={{ opacity: dim("새") }} />
      </div>

      {!finished ? (
        <section className={s.asking} key={step}>
          <div className={s.titleBlock}>
            <span className={s.eyebrow}>나에게 맞는 선생님 찾기</span>
            <h1 className={s.title}>{q.title}</h1>
          </div>
          <div role="radiogroup" aria-label={q.title} className={s.options}>
            {q.options.map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked="false"
                className={s.option}
                onClick={() => pick(o.teacher)}
                data-testid="personality-option"
                data-teacher={o.teacher}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className={s.note}>정답은 없어요. 가장 가까운 걸 골라 주세요. 선생님은 나중에 언제든 바꿀 수 있어요.</p>
        </section>
      ) : (
        <section className={s.result} aria-live="polite">
          <span className={s.eyebrow}>답변을 모두 받았어요</span>
          <h1 className={s.title}>
            <span className={s.reco}>{reco}</span> 선생님이 잘 맞아요
          </h1>
          <p className={s.why}>{TEACHER_WHY[reco]}</p>
          <button type="button" className={s.restart} onClick={() => writeDraft({ answers: [] })} data-testid="personality-restart">
            다시 답하기
          </button>
        </section>
      )}

      <div className={st.spacer} />
      {finished ? (
        <Link href="/start/teacher" className={st.cta} data-testid="personality-next">
          선생님 만나러 가기
        </Link>
      ) : step === 0 ? (
        // 첫 질문에는 돌아갈 질문이 없으니 시작 화면으로 보낸다
        <Link href="/" className={s.prev} data-testid="personality-prev">
          처음 화면으로
        </Link>
      ) : (
        <button type="button" className={s.prev} onClick={() => writeDraft({ answers: answers.slice(0, -1) })} data-testid="personality-prev">
          이전 질문
        </button>
      )}
    </main>
  );
}
