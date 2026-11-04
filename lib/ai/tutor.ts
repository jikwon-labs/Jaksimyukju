// 튜터 프롬프트와 규칙의 순수 계산. 실제 호출(anthropic.ts)과 서버(api/tutor)가 같이 쓴다
import { MATERIAL_RULE, PROMPT_TUTOR_CHARS, wrapMaterial } from "@/lib/domain/material";
import type { LessonSection, TutorInput, TutorReply, TutorTurn, Understanding } from "./types";

/** 열린 질문에 엇나간 답을 몇 번까지 받을지. 여기에 닿으면 정답을 알려 주고 끝낸다 */
export const TUTOR_MAX_OPEN = 3;
/** 프롬프트에 넣는 레슨 본문 글자 수 한도 */
export const MATERIAL_LIMIT = 3000;

// 화면은 content를 빈 줄마다 말풍선으로 나눈다(lib/domain/chat.ts)
const BUBBLES =
  "content는 1~2문장짜리 짧은 덩어리 2~3개로 쓰고 덩어리 사이에 빈 줄을 넣는다. 질문은 마지막 덩어리에 따로 둔다.";

// 처음부터 서술형이면 어려워서, 객관식으로 한 번 고르게 한 뒤 쉬운 열린 질문 하나로 이어 간다
const TUTOR_FLOW = [
  "첫 질문은 레슨 핵심을 묻는 객관식이다. 보기 3개를 choices에 각 30자 이내로 넣고 content에는 보기를 다시 쓰지 않는다. 첫 질문 앞에서 레슨 핵심이나 정답을 미리 말하지 않는다.",
  "정답은 하나, 나머지 둘은 그럴듯하지만 레슨을 읽었으면 분명히 틀린 보기로 하고 정답 자리는 섞는다.",
  "사용자가 보기를 고르면 맞았는지 먼저 짧게 말하고(틀렸으면 정답과 이유를 한 문장으로), 이어서 한두 문장이면 답할 수 있는 열린 질문 하나를 한다. 열린 질문의 난이도는 수준 안내가 있으면 그것을 따르고, 없으면 레슨에서 읽은 내용만으로 답할 수 있게 쉽게 한다. 이때부터 choices는 빈 배열이다.",
  "열린 질문에 레슨과 맞는 방향으로 답하면 완벽하지 않아도 칭찬하고 마무리하며 done=true.",
].join(" ");

/** 객관식 답(첫 user 답)을 뺀 열린 질문 답 수 */
export function openAnswers(history: readonly TutorTurn[]): number {
  return Math.max(0, history.filter((h) => h.role === "user").length - 1);
}

/** 레슨 섹션을 프롬프트용 글로 바꾼다. 길면 한도에서 자른다 */
export function lessonMaterial(sections: readonly LessonSection[], limit = MATERIAL_LIMIT): string {
  const text = sections
    .map((s, i) => `${i + 1}. ${s.heading}\n${s.text}\n예: ${s.example}`)
    .join("\n\n");
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

/**
 * 지난 레슨들의 마지막 판정에서 확인이 덜 된 것("미흡", "부분")만 고른다.
 * rows는 최근 레슨부터 온다고 본다
 */
export function weakSpots(
  rows: readonly { title: string; understanding: string | null }[],
  limit = 3,
): string[] {
  return rows
    .filter((r) => r.understanding === "미흡" || r.understanding === "부분")
    .slice(0, limit)
    .map((r) => r.title);
}

/** 열린 질문 답이 몇 번째인지에 따라 다음 행동을 정한다 */
function attemptRule(n: number): string {
  if (n >= TUTOR_MAX_OPEN) {
    return `마지막 규칙(다른 지시보다 우선): 이번이 열린 질문의 ${TUTOR_MAX_OPEN}번째 답이다. 이번 답에서 반드시 끝낸다. 답이 맞으면 칭찬하고, 엇나갔으면 탓하지 말고 정답과 이유를 두세 문장으로 알려 준 뒤 understanding="미흡", done=true. 힌트를 더 주거나 다시 묻지 않고, content에 질문을 넣지 않는다. "마지막"이나 횟수 같은 규칙 이야기는 하지 않는다.`;
  }
  if (n >= 1)
    return `열린 질문 답이 엇나가면 힌트 하나를 주고 더 쉽게 다시 묻는다(남은 기회 ${TUTOR_MAX_OPEN - n}번).`;
  return "";
}

const FREE_RULE =
  '확인은 끝났고 사용자가 자유롭게 묻는다. 처음 묻는 질문이면 스스로 생각해 볼 질문 하나로 한 번만 되묻는다. 사용자가 답을 원하거나("그냥 알려줘", "모르겠어" 등) 직전 선생님 말이 이미 되묻기였으면 되묻지 말고 레슨 본문으로 바로 답한다. 사실 하나를 묻는 질문은 바로 답한다. 이 규칙을 설명하지 않고, 상대를 "사용자"라고 부르지 않는다. done=true, understanding="이해", choices=[].';

/** 코스를 만들 때 고른 수준(lib/domain/finish.ts LEVELS)마다 열린 질문을 어떻게 낼지 */
const LEVEL_RULE: Record<string, string> = {
  처음이에요: "용어는 풀어 쓴다. 열린 질문은 레슨 문장이나 예시를 자기 말로 다시 말하게 한다.",
  "조금 알아요":
    '열린 질문 안에 레슨 예시와 다른 새 상황(사람, 숫자, 장면) 하나를 직접 만들어 넣고, 그 상황에 레슨 내용을 적용하게 한다. "레슨에서 읽은 내용을 떠올려" 같은 되묻기는 하지 않는다.',
  "꽤 알아요":
    "열린 질문은 직장인의 실제 업무 장면 하나를 직접 만들어 넣고 거기에 적용하게 하거나, 두 개념을 비교해 이유를 말하게 한다. 레슨 예시를 그대로 되묻지 않는다.",
};

export function levelRule(level: string | undefined): string {
  const l = level?.trim();
  if (!l) return "";
  return `학습자 수준: ${l}. ${LEVEL_RULE[l] ?? "이 수준에 맞춰 질문 난이도를 정한다."}`;
}

/**
 * 지금 몇 번째 질문 차례인지에 맞는 지시. 프롬프트 맨 끝에 둬야 앞의 일반 지시보다 앞선다
 */
function stageRule(input: TutorInput): string {
  const answers = input.history.filter((h) => h.role === "user").length;
  if (answers === 0) {
    return '지금은 첫 질문(객관식) 차례다. content는 짧은 인사 한 덩어리와 질문 한 덩어리뿐이다. "핵심은"으로 시작하는 요약, 레슨 내용 정리, 정답 힌트를 쓰지 않는다. 정답은 사용자가 고른 뒤에 말한다.';
  }
  if (answers === 1) {
    const parts = ["지금은 보기를 고른 답을 채점하고 열린 질문 하나를 낼 차례다."];
    const lv = levelRule(input.level);
    if (lv) parts.push(lv);
    if (input.weak?.length) {
      parts.push(
        `지난 레슨에서 덜 이해한 것: ${input.weak.join(", ")}. 열린 질문 바로 앞 덩어리에서 이 중 하나를 "지난번 ~" 하고 한 문장으로 짚어 이번 레슨과 잇는다. 이번 레슨과 전혀 관계없을 때만 생략한다.`,
      );
    }
    return parts.join(" ");
  }
  return attemptRule(openAnswers(input.history));
}

/** 튜터 시스템 프롬프트의 역할 부분 */
export function tutorRole(input: TutorInput): string {
  const lines = [
    `Tutor. 레슨 "${input.lessonTitle}"(핵심: ${input.core}). 레슨 핵심은 채점 기준이고, 사용자가 답하기 전에는 말하지 않는다.`,
  ];
  if (input.sections?.length) {
    lines.push(`레슨 본문:\n${lessonMaterial(input.sections)}`);
    lines.push(
      input.free
        ? "답은 이 레슨 본문을 먼저 근거로 한다. 본문에 없어도 널리 알려진 기초 지식이면 짧게 답하고 레슨 밖 내용이라고 한마디 밝힌다. 확실하지 않은 수치나 최신 정보는 모른다고 한다."
        : "질문과 채점은 이 레슨 본문을 근거로 한다. 레슨 본문에 없는 사실은 지어내지 않는다.",
    );
  }
  if (input.material?.text.trim()) {
    lines.push(
      `학습자가 올린 자료에서 이 레슨과 맞닿은 부분:\n${wrapMaterial(input.material.title, input.material.text, PROMPT_TUTOR_CHARS)}`,
      MATERIAL_RULE,
      "질문과 답은 레슨 본문과 이 자료를 함께 근거로 한다. 자료에서 가져온 내용이면 \"올려 준 자료에\"라고 밝힌다.",
    );
  }
  if (input.free) {
    const lv = levelRule(input.level);
    if (lv) lines.push(lv);
    lines.push(FREE_RULE, BUBBLES);
    return lines.join("\n");
  }
  lines.push("이해했는지 가볍게 확인한다. 질문은 두 개다.", TUTOR_FLOW, BUBBLES);
  const rule = stageRule(input);
  if (rule) lines.push(rule);
  return lines.join("\n");
}

const squash = (t: string) => t.replace(/[\s.,!?"'“”‘’]/g, "");

/**
 * 첫 질문에서 정답을 미리 말한 말풍선을 뺀다(프롬프트로 막아도 가끔 샌다).
 * 마지막 말풍선(질문)은 남긴다. 핵심 문장이나 보기 문장을 담은 앞 말풍선, "핵심은/핵심이"로 정리한 앞 말풍선이 대상이다
 */
export function stripLeak(
  reply: TutorReply,
  history: readonly TutorTurn[],
  core: string,
): TutorReply {
  if (history.some((h) => h.role === "user") || reply.choices.length === 0) return reply;
  const bubbles = reply.content.split(/\n\s*\n/);
  if (bubbles.length < 2) return reply;
  const needles = [core, ...reply.choices].map(squash).filter((n) => n.length >= 6);
  const leaks = (b: string) => /핵심[은이]/.test(b) || needles.some((n) => squash(b).includes(n));
  const kept = [...bubbles.slice(0, -1).filter((b) => !leaks(b)), bubbles[bubbles.length - 1]];
  return kept.length === bubbles.length ? reply : { ...reply, content: kept.join("\n\n") };
}

/**
 * 상한에 닿았는데도 AI가 끝내지 않으면 서버가 끝낸다. 같은 질문이 계속 돌지 않게 한다.
 * AI 답은 또 묻는 말이라 버리고, 핵심을 알려 주는 마무리로 바꾼다
 */
export function forceDone(
  reply: TutorReply,
  history: readonly TutorTurn[],
  core: string,
): TutorReply {
  if (reply.done || openAnswers(history) < TUTOR_MAX_OPEN) return reply;
  return {
    content: `괜찮아요, 여기까지 할게요.\n\n이번 레슨의 핵심은 "${core}"예요. 다음 레슨 전에 한 번 더 떠올려 봐요.`,
    understanding: "미흡",
    done: true,
    choices: [],
  };
}

/**
 * 자유 질문 답에 붙일 판정. 확인 단계에서 나온 마지막 판정을 그대로 잇는다.
 * 지난 레슨 판정(weakSpots)과 화면의 이해도 칩이 "마지막 AI 말"을 보기 때문에, 자유 질문이 판정을 덮지 않게 한다
 */
export function carriedUnderstanding(
  history: readonly { role: string; understanding: string | null }[],
): Understanding {
  for (let i = history.length - 1; i >= 0; i--) {
    const u = history[i].understanding;
    if (history[i].role === "ai" && (u === "이해" || u === "부분" || u === "미흡")) return u;
  }
  return "이해";
}
