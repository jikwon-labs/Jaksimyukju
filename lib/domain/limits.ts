// 알림 제한(하루 2회, 밤 11시~아침 7시 금지)과 콕 찌르기 하루 1번
import type { DayKey } from "./dates";

export const NOTIFY_DAILY_MAX = 2;
export const QUIET_START = 23;
export const QUIET_END = 7;

export function isQuietHour(hour: number): boolean {
  return hour >= QUIET_START || hour < QUIET_END;
}

export type NotifyDecision =
  | { ok: true }
  | { ok: false; reason: "quiet" | "daily_max" | "resting" | "muted" };

export function canNotify(opts: {
  hour: number;
  sentToday: number;
  resting?: boolean;
  enabled?: boolean;
}): NotifyDecision {
  if (opts.enabled === false) return { ok: false, reason: "muted" };
  if (opts.resting) return { ok: false, reason: "resting" };
  if (isQuietHour(opts.hour)) return { ok: false, reason: "quiet" };
  if (opts.sentToday >= NOTIFY_DAILY_MAX) return { ok: false, reason: "daily_max" };
  return { ok: true };
}

export type NudgeDecision =
  | { ok: true }
  | { ok: false; reason: "self" | "already" | "resting" | "studied" };

/** 같은 사람에게 하루 1번. 쉬어 가는 중이거나 오늘 이미 학습한 사람은 찌르지 않는다 */
export function canNudge(opts: {
  fromId: string;
  toId: string;
  today: DayKey;
  sentDays: DayKey[]; // from -> to 로 보낸 날들
  targetResting: boolean;
  targetStudiedToday: boolean;
}): NudgeDecision {
  if (opts.fromId === opts.toId) return { ok: false, reason: "self" };
  if (opts.targetResting) return { ok: false, reason: "resting" };
  if (opts.targetStudiedToday) return { ok: false, reason: "studied" };
  if (opts.sentDays.includes(opts.today)) return { ok: false, reason: "already" };
  return { ok: true };
}

export const NUDGE_MESSAGES: Record<Exclude<NudgeDecision, { ok: true }>["reason"], string> = {
  self: "나는 찌를 수 없어요",
  already: "오늘은 이미 콕 찔렀어요. 내일 다시 할 수 있어요",
  resting: "쉬어 가는 중이라 콕 찌르기를 멈췄어요",
  studied: "오늘 이미 학습했어요",
};
