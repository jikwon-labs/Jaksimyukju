"use client";

import Link from "next/link";
import { useRef } from "react";
import { useDraft, writeDraft } from "../draft";
import { DAY_LABELS, DAY_NUMBERS, formatTime, MINUTE_OPTIONS, RECOMMENDED_WEEKS, scheduleSummary, toggleDay, WEEK_OPTIONS } from "../logic";
import { StepHeader } from "../StepHeader";
import st from "../start.module.css";
import s from "./schedule.module.css";

export function Schedule() {
  const draft = useDraft();
  const { studyDays, minutes, weeks, notifyTime } = draft;
  const perWeek = studyDays.length;
  const ready = perWeek > 0;
  const sum = scheduleSummary(perWeek, minutes, weeks);
  const timeRef = useRef<HTMLInputElement>(null);

  function openTime() {
    const el = timeRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  }

  return (
    <main className={s.root}>
      <div className={s.scroll}>
        <StepHeader step={3} backHref="/start/topic" backLabel="주제 정하기로 돌아가기" />
        <div className={s.titleBlock}>
          <h1 className={s.title}>언제, 얼마나 공부할까요?</h1>
          <p className={s.sub}>지친 날에도 할 수 있는 만큼으로 정해요. 나중에 내 정보에서 바꿀 수 있어요.</p>
        </div>

        <section className={s.section} aria-labelledby="days-h">
          <div className={s.sectionHead}>
            <h2 id="days-h">학습 요일</h2>
            <span className={s.note}>고르지 않은 날은 쉬어도 연속이 이어져요</span>
          </div>
          <div className={s.grid} style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {DAY_LABELS.map((label, i) => {
              const d = DAY_NUMBERS[i];
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={studyDays.includes(d)}
                  aria-label={`${label}요일`}
                  className={s.opt}
                  onClick={() => writeDraft({ studyDays: toggleDay(studyDays, d) })}
                  data-testid={`day-${d}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className={s.section}>
          <h2 id="min-h">하루 분량</h2>
          <div role="radiogroup" aria-labelledby="min-h" className={s.grid} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {MINUTE_OPTIONS.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={minutes === m} className={s.opt} onClick={() => writeDraft({ minutes: m })} data-testid={`minutes-${m}`}>
                {m}분
              </button>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionHead}>
            <h2 id="weeks-h">과정 길이</h2>
            <span className={s.reco}>선생님 추천 {RECOMMENDED_WEEKS}주</span>
          </div>
          <div role="radiogroup" aria-labelledby="weeks-h" className={s.grid} style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
            {WEEK_OPTIONS.map((w) => (
              <button key={w} type="button" role="radio" aria-checked={weeks === w} className={s.opt} onClick={() => writeDraft({ weeks: w })} data-testid={`weeks-${w}`}>
                {w}주
              </button>
            ))}
          </div>
        </section>

        <div className={s.alarm} role="group" aria-label="알림 시각">
          <span className={s.alarmLabel} id="alarm-l">
            학습 알림
          </span>
          <button type="button" className={s.timeBtn} onClick={openTime} aria-label={`학습 알림 ${formatTime(notifyTime)}, 바꾸기`} data-testid="notify-time">
            {formatTime(notifyTime)}
          </button>
          <input
            ref={timeRef}
            type="time"
            className={s.timeInput}
            value={notifyTime}
            onChange={(e) => e.target.value && writeDraft({ notifyTime: e.target.value })}
            aria-labelledby="alarm-l"
            tabIndex={-1}
          />
        </div>

        <section aria-label="요약" className={s.summary}>
          <span className={s.summaryEyebrow}>이렇게 진행돼요</span>
          <strong className={s.summaryMain} aria-live="polite">
            {sum.main}
          </strong>
          <span className={s.summarySub}>{sum.sub}</span>
        </section>
      </div>

      <div className={s.footer}>
        {ready ? (
          <Link href="/start/preview" className={st.cta} data-testid="schedule-next">
            커리큘럼 만들기
          </Link>
        ) : (
          <div aria-disabled="true" className={s.disabled} data-testid="schedule-next">
            학습 요일을 하루 이상 골라 주세요
          </div>
        )}
      </div>
    </main>
  );
}
