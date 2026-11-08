// 목적지 도착 화면: 다음 과정 추천과 기록 요약
import type { TeacherName } from "@/lib/design/types";

/** 완주했을 때 선생님 한마디(목적지 도착·메달 수여 화면) */
export function finishLine(who: TeacherName, weeks: number): string {
  return {
    온: `${weeks}주 동안 한 번도 포기하지 않았어요. 정말 자랑스러워요.`,
    결: "목표 달성. 처음 세운 계획대로 끝냈습니다.",
    새: "처음엔 낯선 숫자였는데, 이제 회사 이야기가 읽히죠?",
  }[who];
}
export const LEVELS = ["처음이에요", "조금 알아요", "꽤 알아요"] as const;

/** 한 과정을 마치면 수준을 한 칸 올린다(꽤 알아요는 그대로) */
export function nextLevel(level: string): string {
  const i = LEVELS.findIndex((l) => level.includes(l.slice(0, 2)));
  if (i < 0) return LEVELS[1];
  return LEVELS[Math.min(i + 1, LEVELS.length - 1)];
}

export interface NextCourse {
  title: string;
  desc: string;
  href: string;
}

export function nextCourseHref(topic: string, level: string): string {
  const q = new URLSearchParams({ topic, level, from: "finish" });
  return `/start/topic?${q.toString()}`;
}

export function nextCourses(topic: string, level: string): NextCourse[] {
  const lv = nextLevel(level);
  const finance = topic.replace(/\s/g, "").includes("재무제표");
  const items = finance
    ? [
        { title: "재무제표 주석 읽기", desc: "숫자 뒤의 설명까지. 4주 · 지금 실력에서 바로 이어져요" },
        { title: "가치평가 맛보기", desc: "읽은 재무제표로 회사 값 매겨 보기. 6주" },
      ]
    : [
        { title: `${topic} 한 걸음 더`, desc: "배운 것 위에 깊이를 더해요. 4주 · 지금 실력에서 바로 이어져요" },
        { title: `${topic} 실전 프로젝트`, desc: "배운 걸로 결과물 하나 만들어 보기. 6주" },
      ];
  return items.map((x) => ({ ...x, href: nextCourseHref(x.title, lv) }));
}

/** 주차별 최근 퀴즈 점수(%)의 평균. 없으면 null */
export function quizAverage(scores: (number | null)[]): number | null {
  const xs = scores.filter((x): x is number => x !== null);
  if (xs.length === 0) return null;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

/** 목적지까지 남은 칸(완료하지 않은 칸 수) */
/** 목적지까지 남은 칸: 커리큘럼 화면과 같게 레슨만 센다 */
export function stepsLeft(weeks: { steps: { state: string; kind?: string }[] }[]): number {
  return weeks
    .flatMap((w) => w.steps)
    .filter((s) => (s.kind ?? "lesson") === "lesson" && s.state !== "done" && s.state !== "five").length;
}
