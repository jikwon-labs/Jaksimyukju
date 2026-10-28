// 설정·내 정보 화면의 순수 계산
import { sortStudyDays, WEEKDAY_KO } from "./dates";

export const MINUTE_OPTIONS = [5, 10, 20, 30] as const;
export const NOTIFY_EARLIEST = 6 * 60;
export const NOTIFY_LATEST = 23 * 60;

function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return 21 * 60;
  return Number(m[1]) * 60 + Number(m[2]);
}

function fromMinutes(n: number): string {
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "21:30" -> "오후 9:30" */
export function timeLabel(hhmm: string): string {
  const n = toMinutes(hhmm);
  const h = Math.floor(n / 60);
  const m = String(n % 60).padStart(2, "0");
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
}

/** 30분 단위로 옮긴다. 오전 6시 ~ 오후 11시 */
export function shiftTime(hhmm: string, delta: number): string {
  const n = toMinutes(hhmm) + delta;
  return fromMinutes(Math.min(NOTIFY_LATEST, Math.max(NOTIFY_EARLIEST, n)));
}

export function normalizeTime(hhmm: string): string {
  const n = toMinutes(hhmm);
  const rounded = Math.round(n / 30) * 30;
  return fromMinutes(Math.min(NOTIFY_LATEST, Math.max(NOTIFY_EARLIEST, rounded)));
}

/** [1,2,3,4,5] -> "월–금", [1,3,5] -> "월·수·금". 월요일부터 센다 */
export function studyDaysLabel(days: number[]): string {
  const sorted = sortStudyDays(days);
  if (sorted.length === 0) return "없음";
  if (sorted.length === 7) return "매일";
  const pos = (d: number) => (d + 6) % 7;
  const runs: number[][] = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && pos(d) === pos(last[last.length - 1]) + 1) last.push(d);
    else runs.push([d]);
  }
  return runs
    .map((r) =>
      r.length >= 3 ? `${WEEKDAY_KO[r[0]]}–${WEEKDAY_KO[r[r.length - 1]]}` : r.map((d) => WEEKDAY_KO[d]).join("·"),
    )
    .join("·");
}

/** 하나는 남긴다 */
export function toggleStudyDay(days: number[], d: number): number[] {
  const has = days.includes(d);
  if (has && days.length === 1) return sortStudyDays(days);
  return sortStudyDays(has ? days.filter((x) => x !== d) : [...days, d]);
}

/** "6주", "6주 3일". 늘어난 학습일이 한 주 분량을 넘으면 주로 올린다 */
export function durationLabel(weeks: number, extraDays: number, perWeek: number): string {
  const per = Math.max(1, perWeek);
  const w = weeks + Math.floor(Math.max(0, extraDays) / per);
  const d = Math.max(0, extraDays) % per;
  return d > 0 ? `${w}주 ${d}일` : `${w}주`;
}

export interface ChartPoint {
  x: number;
  y: number;
  value: number;
  week: number;
}

/** 주차별 퀴즈 % 꺾은선 좌표. 아직 안 푼 주는 점이 없다 */
export function quizChart(
  values: (number | null)[],
  width: number,
  height: number,
  pad = 12,
): { points: ChartPoint[]; path: string; xs: number[] } {
  const n = Math.max(1, values.length);
  const step = n > 1 ? (width - pad * 2) / (n - 1) : 0;
  const xs = values.map((_, i) => (n > 1 ? pad + i * step : width / 2));
  const points: ChartPoint[] = [];
  values.forEach((v, i) => {
    if (v === null) return;
    const clamped = Math.min(100, Math.max(0, v));
    points.push({ x: xs[i], y: pad + (1 - clamped / 100) * (height - pad * 2), value: v, week: i + 1 });
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return { points, path, xs };
}

export function quizChartLabel(values: (number | null)[]): string {
  const done = values.map((v, i) => (v === null ? null : `${i + 1}주차 퀴즈 ${v}점`)).filter(Boolean);
  const next = values.findIndex((v) => v === null);
  const parts = done.length ? done.join(", ") : "아직 푼 퀴즈 없음";
  return next >= 0 ? `${parts}. ${next + 1}주차부터는 아직 퀴즈 전` : parts;
}
