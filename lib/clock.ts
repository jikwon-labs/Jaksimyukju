import "server-only";
import { cookies } from "next/headers";
import { dayKeyAt, hourAt, type DayKey } from "./domain/dates";

export const NOW_COOKIE = "j6_now";
export const TIME_ZONE = "Asia/Seoul";

/** 개발·E2E에서만 시간 조작 쿠키를 읽는다 */
export function devToolsEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.J6_DEV_TOOLS === "1";
}

export async function getNow(): Promise<Date> {
  if (devToolsEnabled()) {
    const v = (await cookies()).get(NOW_COOKIE)?.value;
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      // 그 날짜의 오후 8시(KST)로 본다
      return new Date(`${v}T20:00:00+09:00`);
    }
  }
  return new Date();
}

export async function getToday(): Promise<DayKey> {
  return dayKeyAt(await getNow(), TIME_ZONE);
}

export async function getHour(): Promise<number> {
  return hourAt(await getNow(), TIME_ZONE);
}
