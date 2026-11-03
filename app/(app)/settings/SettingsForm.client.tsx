"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { logoutAction, saveSettingsAction } from "@/app/actions/settings";
import { SpeechSettings } from "@/components/speech/SpeechSettings";
import { ThemeControl } from "@/components/ThemeControl";
import { Switch } from "@/components/ui";
import { SocialButton } from "@/components/ui/SocialButton";
import type { TeacherName } from "@/lib/design/types";
import { WEEKDAY_KO } from "@/lib/domain/dates";
import {
  GUEST_LOSS_WARNING,
  LINK_ERROR_MESSAGE,
  linkSucceeded,
  messageFor,
  PROVIDER_LABEL,
  type ProviderId,
} from "@/lib/domain/oauth-copy";
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

const POLICY_ROWS = [
  { label: "AI 선생님과 데이터", href: "/ai-consent?from=settings" },
  { label: "개인정보 처리방침", href: "/privacy" },
  { label: "이용약관", href: "/terms" },
];

interface Account {
  linked: boolean;
  label: string;
  providers: ProviderId[];
  result: string | null;
}

function ProviderLinks({ providers }: { providers: ProviderId[] }) {
  if (providers.length === 0) return <p className={s.note}>계정 연결은 곧 열려요.</p>;
  return (
    <div className={s.providers}>
      {providers.map((p) => (
        <SocialButton
          key={p}
          provider={p}
          href={`/api/auth/${p}/start?mode=link&next=%2Fsettings`}
          className={s.provider}
        >
          {PROVIDER_LABEL[p]}로 연결
        </SocialButton>
      ))}
    </div>
  );
}

/** 계정 줄과 로그아웃. 연결 전이면 로그아웃 전에 기록을 잃는다고 한 번 더 묻는다 */
function AccountSection({ account }: { account: Account }) {
  const [confirm, setConfirm] = useState(false);
  const error = messageFor(LINK_ERROR_MESSAGE, account.result);
  return (
    <section aria-label="계정" className={s.section}>
      <h2 className={s.label}>계정</h2>
      <div className={`${s.card} ${s.pad}`}>
        <div className={s.accountRow}>
          <span className={s.rowLabel}>계정</span>
          <span className={s.rowValue} data-testid="account-label">
            {account.label}
          </span>
        </div>
        {linkSucceeded(account.result) && (
          <p role="status" className={s.good} data-testid="link-done">
            계정을 연결했어요. 기록이 안전하게 저장돼요.
          </p>
        )}
        {error && (
          <p role="alert" className={s.warn} data-testid="link-error">
            {error}
          </p>
        )}
        {!account.linked && (
          <>
            <p className={s.note}>
              {GUEST_LOSS_WARNING} 휴대폰을 바꿔도 이어 하려면 연결해 두세요.
            </p>
            <ProviderLinks providers={account.providers} />
          </>
        )}
        {confirm ? (
          <div role="alert" className={s.confirm} data-testid="logout-confirm">
            <p>
              지금 로그아웃하면 이 과정과 잔디를 다시 열 수 없어요. 위에서 계정을 먼저 연결해
              주세요.
            </p>
            <div className={s.confirmBtns}>
              <button type="button" className={s.ghost} onClick={() => setConfirm(false)}>
                취소
              </button>
              <form action={logoutAction}>
                <button type="submit" className={s.danger}>
                  그래도 로그아웃
                </button>
              </form>
            </div>
          </div>
        ) : account.linked ? (
          <form action={logoutAction}>
            <button type="submit" className={s.logout}>
              로그아웃
            </button>
          </form>
        ) : (
          <button type="button" className={s.logout} onClick={() => setConfirm(true)}>
            로그아웃
          </button>
        )}
        <Link href="/settings/delete" className={s.deleteLink} data-testid="settings-delete">
          계정 삭제
        </Link>
      </div>
    </section>
  );
}

function Chevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={s.chev}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function SettingsForm({
  initial,
  teacher,
  restLeft,
  duration,
  account,
}: {
  initial: Prefs;
  teacher: TeacherName;
  restLeft: number;
  duration: string;
  account: Account;
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
    {
      label: "쉬어 가기 예약",
      value: `남은 ${restLeft}일`,
      href: "/pause",
      testid: "settings-pause",
    },
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
            <span className={s.caption}>
              고르지 않은 날은 쉬는 날이에요. 연속 기록이 끊기지 않아요.
            </span>
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
            <button
              type="button"
              aria-label="30분 앞으로"
              className={s.step}
              onClick={() => moveTime(-30)}
            >
              -
            </button>
            <span aria-live="polite" className={s.time} data-testid="notify-time">
              {timeLabel(p.notifyTime)}
            </span>
            <button
              type="button"
              aria-label="30분 뒤로"
              className={s.step}
              onClick={() => moveTime(30)}
            >
              +
            </button>
          </div>
          <div className={s.divider} />
          <Switch
            label="선생님 알림"
            sub="정한 시각에 하루 한 번"
            on={p.notifyTeacher}
            onChange={(v) => save({ notifyTeacher: v })}
          />
          <div className={s.divider} />
          <Switch
            label="콕 찌르기 받기"
            sub="하루 최대 1번"
            on={p.notifyNudge}
            onChange={(v) => save({ notifyNudge: v })}
          />
          <div className={s.divider} />
          <Switch
            label="주간 회고"
            sub="일요일 밤 9시"
            on={p.notifyRetro}
            onChange={(v) => save({ notifyRetro: v })}
          />
          <div className={s.divider} />
          <Switch
            label="그룹 소식"
            sub="연속 기록, 완료 소식"
            on={p.notifyGroup}
            onChange={(v) => save({ notifyGroup: v })}
          />
        </div>
        <p className={s.note}>하루 최대 2번 · 밤 11시~아침 7시는 보내지 않아요</p>
      </section>

      <section aria-label="화면 테마" className={s.section}>
        <h2 className={s.label}>화면 테마</h2>
        <div data-testid="theme-control">
          <ThemeControl initial={p.theme} onChange={(m) => save({ theme: m })} />
        </div>
      </section>

      <section aria-label="읽어 주기" className={s.section} data-testid="speech-settings">
        <h2 className={s.label}>읽어 주기</h2>
        <SpeechSettings
          classes={{
            card: s.card,
            pad: s.pad,
            block: s.block,
            blockLabel: s.blockLabel,
            caption: s.caption,
            seg: s.seg,
            segs: s.mins,
            voice: s.voices,
            divider: s.divider,
            note: s.note,
            preview: s.preview,
          }}
        />
      </section>

      <section aria-label="과정" className={s.section}>
        <h2 className={s.label}>과정</h2>
        <div className={s.card}>
          {rows.map((r) => (
            <Link key={r.label} href={r.href} className={s.row} data-testid={r.testid}>
              <span className={s.rowLabel}>{r.label}</span>
              {r.value && <span className={s.rowValue}>{r.value}</span>}
              <Chevron />
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="약관과 정책" className={s.section}>
        <h2 className={s.label}>약관과 정책</h2>
        <div className={s.card}>
          {POLICY_ROWS.map((r) => (
            <Link key={r.href} href={r.href} className={s.row}>
              <span className={s.rowLabel}>{r.label}</span>
              <Chevron />
            </Link>
          ))}
        </div>
      </section>

      <AccountSection account={account} />
    </>
  );
}
