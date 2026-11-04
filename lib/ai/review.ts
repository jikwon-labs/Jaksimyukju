// 복습 카드 문제 프롬프트와 mock. 실제 호출(anthropic.ts)과 mock(mock.ts)이 같이 쓴다
import { lessonMaterial } from "./tutor";
import type { QuizQuestion, ReviewInput } from "./types";

/** 복습 문제를 낼 때 보는 각도. 간격 번호마다 돌아가며 쓴다 */
export const REVIEW_ANGLES = [
  "레슨 핵심 한 줄을 그대로 알아보는지 묻는다.",
  "레슨 예시와 다른 새 상황(사람, 숫자, 장면) 하나를 만들어 넣고, 그 상황에 레슨 내용을 적용한 보기를 고르게 한다.",
  "사람들이 자주 헷갈리는 오해 하나를 보기로 넣고, 레슨에 맞는 설명을 고르게 한다.",
  "레슨 내용을 내 업무 장면에 쓰는 방법 중 맞는 것을 고르게 한다.",
];

export function reviewAngle(step: number): string {
  const n = REVIEW_ANGLES.length;
  return REVIEW_ANGLES[((Math.floor(step) % n) + n) % n];
}

/** 복습 문제 시스템 프롬프트의 역할 부분 */
export function reviewRole(input: ReviewInput): string {
  const lines = [
    `Reviewer. 며칠 전에 배운 레슨 "${input.lessonTitle}"(핵심: ${input.core})을 다시 꺼내 보는 간격 복습 문제를 하나 낸다.`,
    `레슨 본문:\n${lessonMaterial(input.sections)}`,
    "문제와 보기는 이 레슨 본문만 근거로 한다. 본문에 없는 사실은 지어내지 않는다.",
    "4지선다 한 문제. q는 40자 안팎 한 문장, 보기 4개는 각 30자 이내로 서로 겹치지 않게 쓴다. 정답은 하나, 나머지 셋은 그럴듯하지만 레슨을 읽었으면 분명히 틀린 보기로 하고 정답 자리는 섞는다.",
    "why는 정답인 이유를 선생님 말투로 한두 문장에 쓴다. 30초 안에 풀 수 있는 쉬운 말로 쓴다.",
    `이번 각도: ${reviewAngle(input.step)}`,
  ];
  if (input.focus === "tutor") {
    lines.push("이 학습자는 튜터 확인에서 이 레슨 핵심을 헷갈렸다. 그 핵심 개념을 바로 묻는다.");
  }
  if (input.level?.trim()) lines.push(`학습자 수준: ${input.level.trim()}. 이 수준에 맞춰 용어를 고른다.`);
  return lines.join("\n");
}

const DISTRACTORS = [
  "처음부터 모든 용어를 외우는 것",
  "도구 설치와 설정부터 끝내는 것",
  "기분 좋은 날에만 몰아서 하는 것",
  "레슨과 상관없는 다른 주제부터 보는 것",
  "결과를 보지 않고 숫자만 모으는 것",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function clip(t: string, n = 60): string {
  const s = t.trim().replace(/\s+/g, " ");
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** 결정적 mock: 같은 레슨·같은 간격이면 늘 같은 문제. 정답 자리는 제목과 간격으로 섞는다 */
export function mockReviewQuestion(input: ReviewInput): QuizQuestion {
  const core = clip(input.core || `"${input.lessonTitle}"의 핵심 한 줄`);
  const seed = hash(`${input.lessonTitle}:${input.step}`);
  const answer = seed % 4;
  const pool = DISTRACTORS.filter((d) => d !== core);
  const start = seed % pool.length;
  const wrong = [0, 1, 2].map((i) => pool[(start + i) % pool.length]);
  const choices = [...wrong];
  choices.splice(answer, 0, core);
  const q =
    input.focus === "tutor"
      ? `지난번에 헷갈렸던 "${clip(input.lessonTitle, 30)}", 핵심은 무엇일까요?`
      : input.step % 2 === 0
        ? `"${clip(input.lessonTitle, 30)}"에서 꼭 가져갈 한 가지는?`
        : `며칠 전 배운 "${clip(input.lessonTitle, 30)}", 기억나요? 핵심을 골라 봐요.`;
  const hint = input.sections[0]?.heading ? ` "${clip(input.sections[0].heading, 30)}"부터 다시 읽어 보면 더 오래 남아요.` : "";
  const why = {
    온: `핵심은 "${core}"예요.${hint}`,
    결: `정답은 "${core}"입니다.${hint}`,
    새: `"${core}", 이게 오늘의 보물이에요!${hint}`,
  }[input.teacher];
  return { q, choices, answer, why };
}
