// 그룹·초대·알림 화면의 순수 계산
import { addDays, type DayKey, dayKeyAt, diffDays, mondayOf, WEEKDAY_KO, weekday } from "./dates";
import { dayKind, type GrassLevel, type StudyCalendar } from "./rest";

export const GROUP_MAX = 6;
export const INVITE_DAYS = 7;
/** 로그인 전에 받은 초대 코드. 온보딩이 끝나면 이 코드로 그룹에 넣는다 */
export const INVITE_COOKIE = "j6_invite";

const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** "7KQ2-MX" 꼴. 헷갈리는 글자(0 O 1 I)는 뺀다 */
export function newInviteCode(rand: () => number = Math.random): string {
  const pick = () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length) % CODE_CHARS.length];
  let s = "";
  for (let i = 0; i < 6; i++) s += pick();
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function inviteExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITE_DAYS * 86_400_000);
}

export function inviteExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}

/** 남은 기간 문구 */
export function inviteLeftLabel(expiresAt: Date, now: Date): string {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "만료된 링크예요";
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days}일 뒤 만료`;
  return `${Math.max(1, Math.ceil(ms / 3_600_000))}시간 뒤 만료`;
}

export function inviteUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/invite/${encodeURIComponent(code)}`;
}

export type StripKind = "level" | "missed" | "off" | "rest" | "today" | "future";
export interface StripCell {
  day: DayKey;
  kind: StripKind;
  level: GrassLevel;
}

/** 그룹 카드의 최근 2주(지난주 월요일 ~ 이번 주 일요일) 잔디 줄 */
export function recentStrip(
  cal: StudyCalendar,
  levels: ReadonlyMap<DayKey, GrassLevel>,
  today: DayKey,
): StripCell[] {
  const start = addDays(mondayOf(today), -7);
  const out: StripCell[] = [];
  for (let i = 0; i < 14; i++) {
    const day = addDays(start, i);
    const level = levels.get(day) ?? 0;
    const k = dayKind(cal, day);
    let kind: StripKind;
    if (day === today) kind = "today";
    else if (diffDays(day, today) > 0) kind = k === "study" ? "future" : k;
    else if (level > 0) kind = "level";
    else if (k !== "study") kind = k;
    else if (diffDays(day, cal.startDate) < 0) kind = "off";
    else kind = "missed";
    out.push({ day, kind, level });
  }
  return out;
}

const DAYS_KO = ["", "하루째", "이틀째", "사흘째", "나흘째", "닷새째"];

export interface MemberStatusInput {
  me: boolean;
  studiedToday: boolean;
  resting: boolean;
  comeback: boolean;
  streak: number;
  missed: number;
}

export interface MemberStatus {
  chip: "done" | "wait";
  chipText: string;
  line: string;
  /** 이틀 이상 비어서 경고색·서운한 얼굴로 보여 줄지 */
  away: boolean;
  /** 콕 찌르기 버튼을 보여 줄지(실제 허용 여부는 canNudge) */
  canPoke: boolean;
}

export function memberStatus(m: MemberStatusInput): MemberStatus {
  const chip = m.studiedToday ? "done" : "wait";
  const chipText = m.studiedToday ? "오늘 완료" : "오늘 아직";
  const away = !m.studiedToday && !m.resting && m.missed >= 2;
  let line: string;
  if (m.resting) line = "쉬어 가는 중";
  else if (m.comeback) line = "돌아왔어요";
  else if (!m.studiedToday && m.missed >= 1) line = `${DAYS_KO[Math.min(m.missed, 5)]} 쉬는 중`;
  else if (m.streak > 0) line = `${m.streak}일째 연속`;
  else line = "이제 시작해요";
  return { chip, chipText, line, away, canPoke: !m.me && !m.studiedToday };
}

// 알림 목록

export type NotifIcon = "poke" | "bell" | "fire" | "moon" | "users" | "route" | "book" | "repeat";

export function notifIcon(kind: string): NotifIcon {
  switch (kind) {
    case "nudge":
      return "poke";
    case "teacher":
      return "bell";
    case "group":
      return "fire";
    case "retro":
      return "moon";
    case "invite":
      return "users";
    case "comeback":
      return "route";
    case "review":
      return "repeat";
    default:
      return "book";
  }
}

export function clockLabel(date: Date, timeZone = "Asia/Seoul"): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
}

/** 오늘은 시각, 어제는 "어제", 일주일 안은 요일, 그 전은 "M월 D일" */
export function notifTimeLabel(date: Date, today: DayKey, timeZone = "Asia/Seoul"): string {
  const day = dayKeyAt(date, timeZone);
  const gap = diffDays(today, day);
  if (gap <= 0) return clockLabel(date, timeZone);
  if (gap === 1) return "어제";
  if (gap < 7) return `${WEEKDAY_KO[weekday(day)]}요일`;
  const [, m, d] = day.split("-").map(Number);
  return `${m}월 ${d}일`;
}

export function groupByDay<T extends { createdAt: Date }>(
  items: T[],
  today: DayKey,
  timeZone = "Asia/Seoul",
): { label: "오늘" | "이전"; items: T[] }[] {
  const todays = items.filter((i) => diffDays(today, dayKeyAt(i.createdAt, timeZone)) <= 0);
  const older = items.filter((i) => diffDays(today, dayKeyAt(i.createdAt, timeZone)) > 0);
  const out: { label: "오늘" | "이전"; items: T[] }[] = [];
  if (todays.length) out.push({ label: "오늘", items: todays });
  if (older.length) out.push({ label: "이전", items: older });
  return out;
}
