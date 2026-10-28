// 날짜는 사용자 기준 "YYYY-MM-DD" 문자열로 다룬다. 계산은 UTC 자정 기준이라 시간대 영향이 없다.
export type DayKey = string;

const MS = 86_400_000;

export function toUtc(day: DayKey): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function fromUtc(ms: number): DayKey {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: DayKey, n: number): DayKey {
  return fromUtc(toUtc(day) + n * MS);
}

export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((toUtc(a) - toUtc(b)) / MS);
}

/** 0=일 ~ 6=토 */
export function weekday(day: DayKey): number {
  return new Date(toUtc(day)).getUTCDay();
}

export function mondayOf(day: DayKey): DayKey {
  const w = weekday(day);
  return addDays(day, w === 0 ? -6 : 1 - w);
}

export const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** 월요일부터 정렬 */
export function sortStudyDays(days: number[]): number[] {
  return [...new Set(days)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
}

export function parseStudyDays(csv: string): number[] {
  return sortStudyDays(
    csv
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
  );
}

/** 주어진 시간대에서 그 순간의 날짜 */
export function dayKeyAt(date: Date, timeZone = "Asia/Seoul"): DayKey {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
}

export function hourAt(date: Date, timeZone = "Asia/Seoul"): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(
    date,
  );
  return Number(h);
}
