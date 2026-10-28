// 주차 퀴즈 채점
export interface QuizAnswer {
  choice: number;
  correct: boolean;
}

export const MARKS = ["A", "B", "C", "D"];

/** picks: 문제마다 고른 보기 번호. 문제 수와 다르거나 범위를 벗어나면 null */
export function scoreQuiz(questions: { answer: number; choices: string[] }[], picks: number[]): { score: number; answers: QuizAnswer[] } | null {
  if (picks.length !== questions.length) return null;
  const answers: QuizAnswer[] = [];
  for (const [i, q] of questions.entries()) {
    const c = picks[i];
    if (!Number.isInteger(c) || c < 0 || c >= q.choices.length) return null;
    answers.push({ choice: c, correct: c === q.answer });
  }
  return { score: answers.filter((a) => a.correct).length, answers };
}

export function feedbackTitle(correct: boolean, answer: number): string {
  return correct ? "정답이에요" : `아쉬워요. 정답은 ${MARKS[answer] ?? ""}예요`;
}

/** 진행 막대에 칠할 칸 수 */
export function quizDoneCount(idx: number, answered: boolean, total = 3): number {
  return Math.min(idx + (answered ? 1 : 0), total);
}
