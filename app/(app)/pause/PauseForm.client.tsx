"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelRestAction, pauseAction } from "@/app/actions/rest";
import { PAUSE_LIMIT } from "@/lib/domain/rest";
import { josa, PAUSE_REASONS, pauseDayLabel, type PausePreset, presetDays, type PauseWeek } from "@/lib/domain/pause";
import { durationLabel } from "@/lib/domain/prefs";
import s from "./pause.module.css";

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={s.check}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

const PRESETS: [PausePreset, string][] = [
  ["rest", "이번 주 남은 날"],
  ["next", "다음 주"],
  ["custom", "직접 고르기"],
];

export function PauseForm({
  weeks,
  reserved,
  restLeft,
  streak,
  weeksCount,
  extraDays,
  perWeek,
}: {
  weeks: PauseWeek[];
  reserved: { day: string; label: string }[];
  restLeft: number;
  streak: number;
  weeksCount: number;
  extraDays: number;
  perWeek: number;
}) {
  const router = useRouter();
  const initialPreset: PausePreset = "next";
  const [preset, setPreset] = useState<PausePreset>(initialPreset);
  const [picked, setPicked] = useState<string[]>(() => presetDays(weeks, initialPreset).slice(0, restLeft));
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const n = picked.length;
  const left = Math.max(0, restLeft - n);
  const over = n > restLeft;
  const before = durationLabel(weeksCount, extraDays, perWeek);
  const after = durationLabel(weeksCount, extraDays + n, perWeek);

  function toggle(day: string) {
    setPreset("custom");
    setPicked((cur) => (cur.includes(day) ? cur.filter((x) => x !== day) : [...cur, day].sort()));
  }

  function submit() {
    if (n === 0 || over) return;
    start(async () => {
      const r = await pauseAction(picked, reason || null);
      setMsg(r.message);
      if (r.ok) {
        setPicked([]);
        setPreset("custom");
        setReason("");
        router.refresh();
      }
    });
  }

  function cancel(day: string) {
    start(async () => {
      const r = await cancelRestAction(day);
      setMsg(r.ok ? "쉬는 날을 취소했어요" : "취소하지 못했어요");
      router.refresh();
    });
  }

  const effects =
    n === 0
      ? ["쉴 날을 골라 주세요"]
      : [
          `연속 기록 ${streak}일은 그대로 이어져요`,
          `과정이 ${n}일 늘어나요. ${before} 과정이 ${josa(after, "이", "가")} 돼요`,
          "쉬는 날엔 알림과 콕 찌르기가 멈춰요",
          '그룹에는 "쉬어 가는 중"으로만 보여요',
        ];

  return (
    <>
      <section aria-label="쉴 날" className={s.section}>
        <h2 className={s.h2}>언제 쉴까요?</h2>
        <div role="radiogroup" aria-label="빠른 선택" className={s.presets}>
          {PRESETS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={preset === id}
              className={s.seg}
              onClick={() => {
                setPreset(id);
                if (id !== "custom") setPicked(presetDays(weeks, id));
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={s.calendar}>
          {weeks.map((w) => (
            <div key={w.label} className={s.week}>
              <span className={s.weekLabel}>{w.label}</span>
              <div className={s.days} style={{ gridTemplateColumns: `repeat(${Math.max(w.days.length, 1)}, 1fr)` }}>
                {w.days.map((d) => {
                  const on = picked.includes(d.day);
                  const disabled = d.past || d.reserved;
                  return (
                    <button
                      key={d.day}
                      type="button"
                      className={s.day}
                      aria-pressed={on || d.reserved}
                      aria-disabled={disabled}
                      aria-label={pauseDayLabel(d, on) + (d.reserved ? " 예약됨" : "")}
                      data-past={d.past ? "true" : "false"}
                      data-reserved={d.reserved ? "true" : "false"}
                      data-testid={`pause-day-${d.day}`}
                      onClick={() => {
                        if (!disabled) toggle(d.day);
                      }}
                    >
                      <span className={s.wd}>{d.wd}</span>
                      <span className={s.date}>{d.date}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className={s.foot}>학습일만 골라요. 원래 쉬는 주말은 빠져 있어요.</p>
        </div>
      </section>

      {reserved.length > 0 && (
        <section aria-label="예약한 쉬는 날" className={s.section}>
          <h2 className={s.h2}>예약한 쉬는 날</h2>
          <ul className={s.reserved} data-testid="pause-reserved">
            {reserved.map((r) => (
              <li key={r.day} className={s.reservedItem}>
                <span>{r.label}</span>
                <button type="button" className={s.cancel} onClick={() => cancel(r.day)} disabled={pending} data-testid={`pause-cancel-${r.day}`}>
                  취소
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="이유" className={s.section}>
        <h2 className={s.h2}>
          이유 <span className={s.h2sub}>선택 · 그룹에는 보이지 않아요</span>
        </h2>
        <div className={s.reasons}>
          {PAUSE_REASONS.map((r) => (
            <button key={r} type="button" aria-pressed={reason === r} className={s.reason} onClick={() => setReason(reason === r ? "" : r)}>
              {r}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="쉬면 이렇게 돼요" className={s.effects}>
        <span className={s.kicker}>쉬면 이렇게 돼요</span>
        {effects.map((e) => (
          <p key={e} className={s.effect}>
            <Check />
            {e}
          </p>
        ))}
      </section>

      <p className={s.limit}>
        한 과정에서 최대 {PAUSE_LIMIT}일까지 미리 쉬어 갈 수 있어요. 남은 날 {left}일. 쉬는 중에도 언제든 돌아와 바로 이어 할 수 있어요.
      </p>
      {over && <p className={s.error}>남은 날보다 많이 골랐어요. {restLeft}일까지만 고를 수 있어요.</p>}

      <span role="status" aria-live="polite" className={s.status} data-testid="pause-status">
        {msg}
      </span>
      <button type="button" className={s.cta} disabled={n === 0 || over || pending} onClick={submit} data-testid="pause-submit">
        {n === 0 ? "쉴 날을 골라 주세요" : `${n}일 쉬어 가기`}
      </button>
    </>
  );
}
