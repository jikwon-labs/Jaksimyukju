// 실제 Claude 호출. 서버(Route Handler)에서만 쓴다. 키는 .env.local의 ANTHROPIC_API_KEY.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { lessonsPerWeek } from "@/lib/domain/course";
import { WEEKDAY_KO } from "@/lib/domain/dates";
import { systemPrompt } from "./teachers";
import { AiError, type AiProvider } from "./types";

// 무거운 일(커리큘럼, 마일스톤 피드백)과 가벼운 일(튜터, 회고)을 나눈다
export const HEAVY_MODEL = "claude-sonnet-5-5";
export const LIGHT_MODEL = "claude-haiku-5-5";

const Section = z.object({
  heading: z.string(),
  text: z.string(),
  example: z.string(),
  ref: z.number().int().min(0).max(2),
});
const Plan = z.object({
  goal: z.string(),
  excludes: z.array(z.string()),
  weeks: z.array(
    z.object({
      title: z.string(),
      milestone: z.string(),
      criteria: z.array(z.string()),
      lessons: z.array(
        z.object({
          title: z.string(),
          body: z.object({ core: z.string(), sections: z.array(Section) }),
        }),
      ),
      quiz: z.array(
        z.object({
          q: z.string(),
          choices: z.array(z.string()),
          answer: z.number().int(),
          why: z.string(),
        }),
      ),
    }),
  ),
});
const Tutor = z.object({
  content: z.string(),
  understanding: z.enum(["이해", "부분", "미흡"]),
  done: z.boolean(),
});
const Milestone = z.object({
  headline: z.string(),
  criteria: z.array(z.object({ label: z.string(), status: z.enum(["충족", "보완 필요", "빠짐"]) })),
  fixes: z.array(z.string()),
  passed: z.boolean(),
});
const Retro = z.object({ bridge: z.string(), pledge: z.string() });

function parsed<T>(res: { parsed_output: T | null; stop_reason: string | null }): T {
  if (res.stop_reason === "refusal") throw new AiError("AI가 답을 거절했어요", "refusal");
  if (res.parsed_output === null) throw new AiError("AI 응답을 읽지 못했어요", "parse");
  return res.parsed_output;
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.APIConnectionError) throw new AiError("AI 서버에 연결하지 못했어요", "network");
    if (e instanceof Anthropic.APIError) throw new AiError(`AI 오류 ${e.status}`, "unknown");
    throw e;
  }
}

export function createAnthropicProvider(apiKey: string): AiProvider {
  const client = new Anthropic({ apiKey });
  return {
    name: "anthropic",
    generateCurriculum: (input) =>
      guard(async () => {
        const perWeek = lessonsPerWeek(input.studyDays.length);
        const days = input.studyDays.map((d) => WEEKDAY_KO[d]).join("");
        const res = await client.messages.parse({
          model: HEAVY_MODEL,
          max_tokens: 16000,
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
                `기간: ${input.weeks}주. 주마다 레슨 ${perWeek}개, 퀴즈 3문제(4지선다), 마일스톤 1개와 평가 기준 3개.`,
                "레슨 본문은 핵심 한 줄과 섹션 2개(소제목, 설명, 예시, 근거 자료 번호 0~2)로 쓴다.",
              ].join("\n"),
            },
          ],
          output_config: { format: zodOutputFormat(Plan) },
        });
        return parsed(res);
      }),
    tutorReply: (input) =>
      guard(async () => {
        const res = await client.messages.parse({
          model: LIGHT_MODEL,
          max_tokens: 2000,
          system: systemPrompt(
            input.teacher,
            input.free
              ? `Tutor. 레슨 "${input.lessonTitle}"(핵심: ${input.core}) 확인은 끝났고 사용자가 자유롭게 묻는다. 답을 바로 주지 않고 스스로 찾게 되묻는다. 한 번에 질문 하나. done=true, understanding="이해".`
              : `Tutor. 레슨 "${input.lessonTitle}"(핵심: ${input.core})을 이해했는지 되묻는다. 답을 바로 주지 않고 한 번에 질문 하나만 한다. 두 번 제대로 답하면 마무리하고 done=true.`,
          ),
          messages:
            input.history.length === 0
              ? [{ role: "user", content: "레슨을 다 읽었어요. 확인 질문을 해 주세요." }]
              : input.history.map((h) => ({
                  role: h.role === "ai" ? ("assistant" as const) : ("user" as const),
                  content: h.content,
                })),
          output_config: { format: zodOutputFormat(Tutor) },
        });
        return parsed(res);
      }),
    milestoneFeedback: (input) =>
      guard(async () => {
        const res = await client.messages.parse({
          model: HEAVY_MODEL,
          max_tokens: 4000,
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
          output_config: { format: zodOutputFormat(Milestone) },
        });
        return parsed(res);
      }),
    roommate: (input) =>
      guard(async () => {
        const res = await client.messages.parse({
          model: LIGHT_MODEL,
          max_tokens: 1000,
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
          output_config: { format: zodOutputFormat(Retro) },
        });
        return parsed(res);
      }),
  };
}
