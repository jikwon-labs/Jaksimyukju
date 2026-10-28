// 시작 흐름의 순수 로직: 목적지 추천, 일정 요약, 알림 시각 표기
import { lessonsPerWeek } from "@/lib/domain/course";
/** lib/ai/finance.ts의 FINANCE_TOPIC과 같은 값(레슨 데이터까지 번들에 넣지 않으려고 따로 둔다) */
export const FINANCE_TOPIC = "재무제표 읽기";

export const TOPIC_CHIPS = ["재무제표 읽기", "영어 회화", "디자인 기초", "파이썬 기초", "사진 보정"];

const FINANCE_GOALS = [
  "재무제표를 혼자 읽고 한 장으로 요약하기",
  "회사 숫자로 투자 판단 근거 세우기",
  "회의에서 재무 숫자를 설명하기",
];

/** 마지막 글자에 받침이 있는지 (한글이 아니면 받침 없음으로 본다) */
function hasBatchim(word: string): boolean {
  const c = word.trim().slice(-1).charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}

/** 주제에 맞는 목적지 추천 3개. 재무제표 읽기는 목업 문구 그대로 */
export function goalChips(topic: string): string[] {
  const t = topic.trim();
  if (!t) return [];
  if (t === FINANCE_TOPIC) return FINANCE_GOALS;
  const eul = hasBatchim(t) ? "을" : "를";
  return [`${t}${eul} 혼자 해 보고 결과물 하나 만들기`, `${t} 기초를 남에게 설명하기`, `업무에 ${t} 한 가지 바로 써먹기`];
}

export const LEVELS = [
  { label: "처음이에요", hint: "용어부터 차근차근" },
  { label: "조금 알아요", hint: "들어 본 적은 있지만 혼자는 어려워요" },
  { label: "꽤 알아요", hint: "기본은 되고, 깊이를 더하고 싶어요" },
] as const;

/** 화면 순서(월~일)와 요일 번호(0=일) */
export const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
export const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0];
export const MINUTE_OPTIONS = [5, 10, 20, 30];
export const WEEK_OPTIONS = [2, 4, 6, 8, 12];
export const RECOMMENDED_WEEKS = 6;

export const DEFAULT_SCHEDULE = {
  studyDays: [1, 2, 3, 4, 5],
  minutes: 10,
  weeks: 6,
  notifyTime: "21:30",
};

/** 레슨 수는 커리큘럼 생성과 같은 규칙(주마다 하루는 퀴즈·마일스톤 칸)으로 센다 */
export function lessonCount(perWeek: number, weeks: number): number {
  return perWeek > 0 ? lessonsPerWeek(perWeek) * weeks : 0;
}

export function scheduleSummary(perWeek: number, minutes: number, weeks: number): { main: string; sub: string } {
  return {
    main: `주 ${perWeek}일 × ${minutes}분, ${weeks}주 동안 레슨 ${lessonCount(perWeek, weeks)}개`,
    sub: `한 주에 ${perWeek * minutes}분이에요. 바쁜 날에는 5분 버전으로 대신할 수 있어요.`,
  };
}

/** "21:30" -> "오후 9:30", "00:05" -> "오전 12:05" */
export function formatTime(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${m[2]}`;
}

/** 요일 토글. 결과는 월요일부터 정렬 */
export function toggleDay(days: readonly number[], day: number): number[] {
  const set = new Set(days);
  if (set.has(day)) set.delete(day);
  else set.add(day);
  return DAY_NUMBERS.filter((d) => set.has(d));
}
