"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { logoutAction, saveSettingsAction } from "@/app/actions/settings";
import { ThemeControl } from "@/components/ThemeControl";
import { Switch } from "@/components/ui";
import type { TeacherName } from "@/lib/design/types";
import { WEEKDAY_KO } from "@/lib/domain/dates";
import { MINUTE_OPTIONS, shiftTime, timeLabel, toggleStudyDay } from "@/lib/domain/prefs";
import type { ThemeMode } from "@/lib/theme";
import s from "./settings.module.css";

interface Prefs {
  studyDays: number[];
  minutesPerDay: number;
  notifyTime: string;
  notifyNudge: boolean;
  notifyTeacher: boolean;
  notifyRetro: boolean;
  notifyGroup: boolean;
  theme: ThemeMode;
}

const WEEK = [1, 2, 3, 4, 5, 6, 0];

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={s.chev}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function SettingsForm({
  initial,
  teacher,
  restLeft,
  duration,
}: {
  initial: Prefs;
  teacher: TeacherName;
  restLeft: number;
  duration: string;
}) {
  const [p, setP] = useState<Prefs>(initial);
  const [saved, setSaved] = useState("");
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(patch: Partial<Prefs>, debounce = false) {
    setP((cur) => ({ ...cur, ...patch }));
    const run = () =>
      start(async () => {
        const r = await saveSettingsAction(patch);
        setSaved(r.ok ? "저장했어요" : "저장하지 못했어요");
      });
    if (!debounce) return run();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(run, 400);
  }

  // 시각은 연달아 누를 수 있어 마지막 값만 저장한다
  function moveTime(delta: number) {
    const next = shiftTime(p.notifyTime, delta);
    save({ notifyTime: next }, true);
  }

  const rows: { label: string; value: string; href: string; testid?: string }[] = [
    { label: "쉬어 가기 예약", value: `남은 ${restLeft}일`, href: "/pause", testid: "settings-pause" },
    { label: "선생님 바꾸기", value: teacher, href: "/profile?teacher=1#teacher" },
    { label: "과정 기간과 목표", value: duration, href: "/curriculum" },
    { label: "알림 목록", value: "", href: "/notifications" },
  ];

  return (
    <>
      <span role="status" aria-live="polite" className={s.saved}>
        {saved}
      </span>

      <section aria-label="학습 일정" className={s.section}>
        <h2 className={s.label}>학습 일정</h2>
        <div className={`${s.card} ${s.pad}`}>
          <div className={s.block}>
            <span className={s.blockLabel}>학습 요일</span>
            <div role="group" aria-label="학습 요일" className={s.days}>
              {WEEK.map((d) => {
                const on = p.studyDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    className={s.day}
                    data-testid={`study-day-${d}`}
                    onClick={() => save({ studyDays: toggleStudyDay(p.studyDays, d) })}
                  >
                    {WEEKDAY_KO[d]}
                  </button>
                );
              })}
            </div>
            <span className={s.caption}>고르지 않은 날은 쉬는 날이에요. 연속 기록이 끊기지 않아요.</span>
          </div>
          <div className={s.block}>
            <span className={s.blockLabel}>하루 학습 시간</span>
            <div role="radiogroup" aria-label="하루 학습 시간" className={s.mins}>
              {MINUTE_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={p.minutesPerDay === m}
                  className={s.seg}
                  onClick={() => save({ minutesPerDay: m })}
                >
                  {m}분
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="알림" className={s.section}>
        <h2 className={s.label}>알림</h2>
        <div className={s.card}>
          <div className={s.timeRow}>
            <span className={s.timeText}>
              <span className={s.blockLabel}>선생님 알림 시각</span>
              <span className={s.caption}>이 시각까지 안 했으면 한 번만 알려요</span>
            </span>
            <button type="button" aria-label="30분 앞으로" className={s.step} onClick={() => moveTime(-30)}>
              -
            </button>
            <span aria-live="polite" className={s.time} data-testid="notify-time">
              {timeLabel(p.notifyTime)}
            </span>
            <button type="button" aria-label="30분 뒤로" className={s.step} onClick={() => moveTime(30)}>
              +
            </button>
          </div>
          <div className={s.divider} />
          <Switch label="선생님 알림" sub="정한 시각에 하루 한 번" on={p.notifyTeacher} onChange={(v) => save({ notifyTeacher: v })} />
          <div className={s.divider} />
          <Switch label="콕 찌르기 받기" sub="하루 최대 1번" on={p.notifyNudge} onChange={(v) => save({ notifyNudge: v })} />
          <div className={s.divider} />
          <Switch label="주간 회고" sub="일요일 밤 9시" on={p.notifyRetro} onChange={(v) => save({ notifyRetro: v })} />
          <div className={s.divider} />
          <Switch label="그룹 소식" sub="연속 기록, 완료 소식" on={p.notifyGroup} onChange={(v) => save({ notifyGroup: v })} />
        </div>
        <p className={s.note}>하루 최대 2번 · 밤 11시~아침 7시는 보내지 않아요</p>
      </section>

      <section aria-label="화면 테마" className={s.section}>
        <h2 className={s.label}>화면 테마</h2>
        <div data-testid="theme-control">
          <ThemeControl initial={p.theme} onChange={(m) => save({ theme: m })} />
        </div>
      </section>

      <section aria-label="과정과 계정" className={s.section}>
        <h2 className={s.label}>과정과 계정</h2>
        <div className={s.card}>
          {rows.map((r) => (
            <Link key={r.label} href={r.href} className={s.row} data-testid={r.testid}>
              <span className={s.rowLabel}>{r.label}</span>
              {r.value && <span className={s.rowValue}>{r.value}</span>}
              <Chevron />
            </Link>
          ))}
          <form action={logoutAction}>
            <button type="submit" className={s.row}>
              <span className={s.rowLabel}>로그아웃</span>
              <Chevron />
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
