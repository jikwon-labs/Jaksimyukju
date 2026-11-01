// 실제 Claude 호출. 서버(Route Handler)에서만 쓴다. 키는 .env.local의 ANTHROPIC_API_KEY.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { lessonsPerWeek } from "@/lib/domain/course";
import { WEEKDAY_KO } from "@/lib/domain/dates";
import { systemPrompt } from "./teachers";
import { AiError, type AiProvider, type TutorTurn } from "./types";

// 무거운 일(커리큘럼, 마일스톤 피드백)과 가벼운 일(튜터, 회고)을 나눈다
export const HEAVY_MODEL = "claude-sonnet-5-5";
export const LIGHT_MODEL = "claude-haiku-5-5";

const Section = z.object({
  heading: z.string(),
  text: z.string(),
  example: z.string(),
  ref: z.number().int().min(0).max(2),
});
// 앱이 기대하는 모양(주 1개 이상, 레슨 1개 이상, 퀴즈 3문제 4지선다)을 여기서 확인한다
export const Plan = z.object({
  goal: z.string(),
  excludes: z.array(z.string()),
  weeks: z
    .array(
      z.object({
        title: z.string(),
        milestone: z.string(),
        criteria: z.array(z.string()).min(1),
        lessons: z
          .array(
            z.object({
              title: z.string(),
              body: z.object({ core: z.string(), sections: z.array(Section).min(1) }),
            }),
          )
          .min(1),
        quiz: z
          .array(
            z.object({
              q: z.string(),
              choices: z.array(z.string()).length(4),
              answer: z.number().int().min(0).max(3),
              why: z.string(),
            }),
          )
          .length(3),
      }),
    )
    .min(1),
});
export const Tutor = z.object({
  content: z.string().min(1),
  understanding: z.enum(["이해", "부분", "미흡"]),
  done: z.boolean(),
});
export const Milestone = z.object({
  headline: z.string(),
  criteria: z.array(z.object({ label: z.string(), status: z.enum(["충족", "보완 필요", "빠짐"]) })),
  fixes: z.array(z.string()),
  passed: z.boolean(),
});
export const Retro = z.object({ bridge: z.string(), pledge: z.string() });

/** 응답에서 쓰는 부분만. 테스트는 이 모양으로 가짜 응답을 만든다 */
export type ClaudeReply = Pick<BetaMessage, "content" | "stop_reason">;

/** SDK 호출 자리. 테스트에서 네트워크 없이 바꿔 끼운다 */
export interface ClaudeTransport {
  send(params: MessageCreateParamsNonStreaming, opts: { stream: boolean; timeout: number }): Promise<ClaudeReply>;
}

export function sdkTransport(apiKey: string): ClaudeTransport {
  const client = new Anthropic({ apiKey });
  return {
    // 긴 출력은 스트리밍으로 받아 HTTP 타임아웃을 피하고, 완성본만 쓴다
    send: (params, { stream, timeout }) =>
      stream
        ? client.beta.messages.stream(params, { timeout }).finalMessage()
        : client.beta.messages.create(params, { timeout }),
  };
}

/** JSON 스키마만 보낸다. 검증은 readReply가 직접 해서 실패를 AiError로 바꾼다 */
function jsonFormat(schema: z.ZodType) {
  return { type: "json_schema" as const, schema: zodOutputFormat(schema).schema };
}

/** 거절, 잘림, 깨진 JSON, 모양이 다른 답은 모두 AiError로 바꾼다 */
export function readReply<T>(schema: z.ZodType<T>, res: ClaudeReply): T {
  if (res.stop_reason === "refusal") throw new AiError("AI가 답을 거절했어요", "refusal");
  if (res.stop_reason === "max_tokens" || res.stop_reason === "model_context_window_exceeded") {
    throw new AiError("AI 응답이 중간에 잘렸어요", "parse");
  }
  // 다른 모델로 넘어갔으면(fallback 블록) 그 뒤의 답만 쓴다
  let start = 0;
  res.content.forEach((b, i) => {
    if (b.type === "fallback") start = i + 1;
  });
  const text = res.content
    .slice(start)
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AiError("AI 응답을 읽지 못했어요", "parse");
  }
  const out = schema.safeParse(json);
  if (!out.success) {
    // 어느 칸이 어떻게 달랐는지 서버 로그에서 볼 수 있게 처음 몇 개만 붙인다(사용자 화면에는 나가지 않는다)
    const where = out.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new AiError(`AI 응답 모양이 달라요 (${where})`, "parse");
  }
  return out.data;
}

export async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AiError) throw e;
    // 시간 초과도 연결 오류에 들어간다
    if (e instanceof Anthropic.APIConnectionError) throw new AiError("AI 서버에 연결하지 못했어요", "network");
    if (e instanceof Anthropic.APIError) throw new AiError(`AI 오류 ${e.status}`, "unknown");
    if (e instanceof Anthropic.AnthropicError) throw new AiError("AI 응답을 받지 못했어요", "unknown");
    throw e;
  }
}

const OPENER = "레슨을 다 읽었어요. 확인 질문을 해 주세요.";

/** 대화는 user로 시작해야 한다. 저장된 기록은 AI 첫 질문부터라 여는 말을 앞에 붙인다 */
export function tutorMessages(history: TutorTurn[]): MessageCreateParamsNonStreaming["messages"] {
  const turns = history.map((h) => ({
    role: h.role === "ai" ? ("assistant" as const) : ("user" as const),
    content: h.content,
  }));
  if (turns[0]?.role !== "user") turns.unshift({ role: "user", content: OPENER });
  return turns;
}

// Sonnet은 거절되면 서버가 다른 모델로 한 번 더 돌린다. Haiku는 서버 fallback이 없다
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

/** 모양이 틀린 답(parse)일 때만 한 번 더 부른다. 거절·연결 실패는 다시 불러도 같으니 그대로 던진다 */
async function retryOnParse<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!(e instanceof AiError) || e.reason !== "parse") throw e;
    console.warn(`[ai] ${label} 다시 만든다:`, e.message);
    return fn();
  }
}

export function createAnthropicProvider(apiKey: string, transport: ClaudeTransport = sdkTransport(apiKey)): AiProvider {
  const provider: AiProvider = {
    name: "anthropic",
    generateCurriculum: (input) =>
      guard(async () => {
        const perWeek = lessonsPerWeek(input.studyDays.length);
        const days = input.studyDays.map((d) => WEEKDAY_KO[d]).join("");
        const res = await transport.send(
          {
            model: HEAVY_MODEL,
            // 12주 과정은 출력이 길다. 생각 토큰도 여기에 들어간다
            max_tokens: 64000,
            thinking: { type: "adaptive" },
            ...FALLBACK,
            system: systemPrompt(
              input.teacher,
              "Advisor. 목적지에서 거꾸로 커리큘럼을 짠다. 레슨 하나는 하루 분량을 넘지 않는다. 목적지에 필요 없는 것은 제외 목록에 둔다.",
            ),
            messages: [
              {
                role: "user",
                content: [
                  `주제: ${input.topic}`,
                  `목적지: ${input.goal}`,
                  `지금 수준: ${input.level}`,
                  `학습 요일: ${days} (주 ${input.studyDays.length}일), 하루 ${input.minutes}분`,
                  `기간: ${input.weeks}주. 주마다 레슨 ${perWeek}개, 퀴즈 3문제(4지선다, answer는 0~3), 마일스톤 1개와 평가 기준 3개.`,
                  "레슨 본문은 핵심 한 줄과 섹션 2개(소제목, 설명, 예시, 근거 자료 번호 0~2)로 쓴다.",
                ].join("\n"),
              },
            ],
            output_config: { effort: "medium", format: jsonFormat(Plan) },
          },
          { stream: true, timeout: 10 * 60_000 },
        );
        return readReply(Plan, res);
      }),
    tutorReply: (input) =>
      guard(async () => {
        const res = await transport.send(
          {
            model: LIGHT_MODEL,
            max_tokens: 4000,
            thinking: { type: "adaptive" },
            system: systemPrompt(
              input.teacher,
              input.free
                ? `Tutor. 레슨 "${input.lessonTitle}"(핵심: ${input.core}) 확인은 끝났고 사용자가 자유롭게 묻는다. 답을 바로 주지 않고 스스로 찾게 되묻는다. 한 번에 질문 하나. done=true, understanding="이해".`
                : `Tutor. 레슨 "${input.lessonTitle}"(핵심: ${input.core})을 이해했는지 되묻는다. 답을 바로 주지 않고 한 번에 질문 하나만 한다. 두 번 제대로 답하면 마무리하고 done=true.`,
            ),
            messages: tutorMessages(input.history),
            // 대화는 빨라야 해서 생각을 짧게 한다
            output_config: { effort: "low", format: jsonFormat(Tutor) },
          },
          { stream: false, timeout: 60_000 },
        );
        return readReply(Tutor, res);
      }),
    milestoneFeedback: (input) =>
      guard(async () => {
        const res = await transport.send(
          {
            model: HEAVY_MODEL,
            max_tokens: 16000,
            thinking: { type: "adaptive" },
            ...FALLBACK,
            system: systemPrompt(
              input.teacher,
              "Editor. 마일스톤 결과물을 기준별로 평가하고 고칠 점을 3개 이내로 구체적으로 짚는다. 대신 써 주지 않는다.",
            ),
            messages: [
              {
                role: "user",
                content: `마일스톤: ${input.milestone}\n기준: ${input.criteria.join(" / ")}\n제출 차수: ${input.round}\n결과물:\n${input.content}`,
              },
            ],
            output_config: { effort: "medium", format: jsonFormat(Milestone) },
          },
          { stream: false, timeout: 3 * 60_000 },
        );
        return readReply(Milestone, res);
      }),
    roommate: (input) =>
      guard(async () => {
        const res = await transport.send(
          {
            model: LIGHT_MODEL,
            max_tokens: 4000,
            thinking: { type: "adaptive" },
            system: systemPrompt(
              input.teacher,
              "Roommate. 한 주를 돌아본 답을 보고 전혀 다른 분야와 잇는 질문 하나와 다음 주 다짐 한 줄을 만든다.",
            ),
            messages: [
              {
                role: "user",
                content: `주제: ${input.topic}, ${input.weekIndex}주차\n답: ${input.answers.join(" / ")}`,
              },
            ],
            output_config: { effort: "low", format: jsonFormat(Retro) },
          },
          { stream: false, timeout: 60_000 },
        );
        return readReply(Retro, res);
      }),
  };
  // 커리큘럼은 출력이 길어 가끔 모양이 어긋난다. 실패하면 온보딩 전체가 막히니 한 번 다시 만든다
  const once = provider.generateCurriculum;
  return { ...provider, generateCurriculum: (input) => retryOnParse(() => once(input), "커리큘럼") };
}
