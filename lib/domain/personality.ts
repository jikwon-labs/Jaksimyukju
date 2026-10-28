// 성향 질문 3개와 추천 규칙 (목업 Personality.dc.html 그대로)
import type { TeacherName } from "@/lib/design/types";

export interface PersonalityQuestion {
  title: string;
  /** 보기 순서는 항상 온, 결, 새 */
  options: { label: string; teacher: TeacherName }[];
}

export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    title: "공부를 빼먹은 다음 날, 듣고 싶은 말은?",
    options: [
      { label: "괜찮아요, 오늘은 5분만 해요", teacher: "온" },
      { label: "어제 빠졌으니 오늘은 두 개 합니다", teacher: "결" },
      { label: "오늘 건 이런 게 궁금하지 않아요?", teacher: "새" },
    ],
  },
  {
    title: "어떤 선생님이 편한가요?",
    options: [
      { label: "칭찬을 많이 해 주는 선생님", teacher: "온" },
      { label: "목표를 분명하게 짚어 주는 선생님", teacher: "결" },
      { label: "엉뚱한 질문을 던지는 선생님", teacher: "새" },
    ],
  },
  {
    title: "혼자 공부를 그만둘 때, 가장 큰 이유는?",
    options: [
      { label: "지쳐서", teacher: "온" },
      { label: "느슨해져서", teacher: "결" },
      { label: "지루해져서", teacher: "새" },
    ],
  },
];

export const TEACHER_WHY: Record<TeacherName, string> = {
  온: "지친 날에도 부담 없이 돌아올 수 있게, 5분 버전부터 다정하게 권해 줄 거예요.",
  결: "느슨해질 틈이 없게, 목표와 남은 분량을 숫자로 짚어 줄 거예요.",
  새: "지루해질 틈이 없게, 다른 분야와 엮은 질문으로 흥미를 붙여 줄 거예요.",
};

const ORDER: TeacherName[] = ["온", "결", "새"];

/**
 * 가장 많이 고른 선생님. 동점이면 첫 질문의 답이 이긴다.
 * 답이 없으면 온.
 */
export function recommendTeacher(answers: readonly TeacherName[]): TeacherName {
  const counts: Record<TeacherName, number> = { 온: 0, 결: 0, 새: 0 };
  for (const a of answers) counts[a] += 1;
  let best: TeacherName = answers[0] ?? "온";
  for (const k of ORDER) if (counts[k] > counts[best]) best = k;
  return best;
}
