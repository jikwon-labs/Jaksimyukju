import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { describe, expect, it } from "vitest";
import {
  type ClaudeReply,
  type ClaudeTransport,
  createAnthropicProvider,
  guard,
  HEAVY_MODEL,
  LIGHT_MODEL,
  Plan,
  readReply,
  Retro,
  tutorMessages,
} from "./anthropic";
import { mockCurriculum, mockMilestone, mockTutor } from "./mock";
import { AiError } from "./types";

const base = {
  topic: "재무제표 읽기",
  goal: "재무제표를 혼자 읽고 한 장으로 요약하기",
  level: "처음이에요",
  studyDays: [1, 3, 5],
  minutes: 10,
  weeks: 4,
  teacher: "온" as const,
};

function textReply(body: unknown, stop: ClaudeReply["stop_reason"] = "end_turn"): ClaudeReply {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { stop_reason: stop, content: [{ type: "text", text, citations: null }] };
}

/** 네트워크 없이 보낸 요청을 모으고 정해 둔 응답을 돌려준다 */
function stub(reply: ClaudeReply | Error) {
  const calls: { params: MessageCreateParamsNonStreaming; opts: { stream: boolean; timeout: number } }[] = [];
  const transport: ClaudeTransport = {
    async send(params, opts) {
      calls.push({ params, opts });
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
  return { calls, ai: createAnthropicProvider("test-key", transport) };
}

/** 커리큘럼 계획을 뼈대 답과 주차 답으로 나눈다(실제 호출 순서: 뼈대 1번, 주차마다 1번) */
function splitPlan(plan: ReturnType<typeof mockCurriculum>) {
  const outline = {
    goal: plan.goal,
    excludes: plan.excludes,
    weeks: plan.weeks.map((w) => ({
      title: w.title,
      milestone: w.milestone,
      criteria: w.criteria,
      lessons: w.lessons.map((l) => ({ title: l.title, core: l.body.core })),
    })),
  };
  return { outline: textReply(outline), week: (i: number) => textReply({ lessons: plan.weeks[i].lessons, quiz: plan.weeks[i].quiz }) };
}

function isWeekCall(params: MessageCreateParamsNonStreaming) {
  return JSON.stringify(params.messages).includes("이번 주:");
}

function weekIndex(params: MessageCreateParamsNonStreaming) {
  return Number(/이번 주: (\d+)주차/.exec(JSON.stringify(params.messages))?.[1]) - 1;
}

/** 뼈대 답은 차례로(재시도 확인용), 주차 답은 요청한 주차에 맞춰 돌려준다 */
function curriculumStub(outlines: ClaudeReply[], week: (i: number) => ClaudeReply | Error) {
  const calls: MessageCreateParamsNonStreaming[] = [];
  const opts: { stream: boolean; timeout: number }[] = [];
  let n = 0;
  const transport: ClaudeTransport = {
    async send(params, o) {
      calls.push(params);
      opts.push(o);
      if (!isWeekCall(params)) return outlines[Math.min(n++, outlines.length - 1)];
      const r = week(weekIndex(params));
      if (r instanceof Error) throw r;
      return r;
    },
  };
  return { calls, opts, outlineCalls: () => n, ai: createAnthropicProvider("test-key", transport) };
}

describe("Claude 모델과 요청 모양", () => {
  it("모델: 무거운 일은 Sonnet 5.5, 가벼운 일은 Haiku 5.5", () => {
    expect(HEAVY_MODEL).toBe("claude-sonnet-5-5");
    expect(LIGHT_MODEL).toBe("claude-haiku-5-5");
  });
  it("커리큘럼: 뼈대는 Haiku 한 번, 주차 본문은 Sonnet으로 주마다 한 번, 모두 스트리밍", async () => {
    const plan = mockCurriculum(base);
    const parts = splitPlan(plan);
    const { calls, opts, ai } = curriculumStub([parts.outline], parts.week);
    const out = await ai.generateCurriculum(base);
    expect(out).toEqual(Plan.parse(plan));
    expect(calls).toHaveLength(1 + plan.weeks.length);
    const [outline, ...weeks] = calls;
    expect(outline.model).toBe(LIGHT_MODEL);
    expect(outline).not.toHaveProperty("fallbacks");
    for (const w of weeks) {
      expect(w.model).toBe(HEAVY_MODEL);
      expect(w.fallbacks).toBe("default");
      expect(w.betas).toEqual(["server-side-fallback-2026-07-01"]);
    }
    for (const p of calls) {
      expect(p.thinking).toEqual({ type: "adaptive" });
      expect(p.output_config?.effort).toBe("low");
      expect(p.output_config?.format?.type).toBe("json_schema");
      expect(p).not.toHaveProperty("temperature");
    }
    expect(opts.every((o) => o.stream)).toBe(true);
  });
  it("주차 본문의 레슨 수가 뼈대와 다르면 그 주만 다시 만든다", async () => {
    const plan = mockCurriculum(base);
    const parts = splitPlan(plan);
    const tries = new Map<number, number>();
    const { ai } = curriculumStub([parts.outline], (i) => {
      const n = (tries.get(i) ?? 0) + 1;
      tries.set(i, n);
      if (i === 0 && n === 1) return textReply({ lessons: plan.weeks[0].lessons.slice(1), quiz: plan.weeks[0].quiz });
      return parts.week(i);
    });
    await ai.generateCurriculum(base);
    expect(tries.get(0)).toBe(2);
    expect(tries.get(1)).toBe(1);
  });
  it("튜터와 회고는 Haiku, 낮은 effort, fallback 없음", async () => {
    const t = stub(textReply(mockTutor({ teacher: "온", lessonTitle: "x", core: "y", history: [] })));
    await t.ai.tutorReply({ teacher: "온", lessonTitle: "x", core: "y", history: [] });
    const r = stub(textReply({ bridge: "질문", pledge: "다짐" }));
    await r.ai.roommate({ teacher: "결", topic: "t", weekIndex: 1, answers: ["a", "b", "c"] });
    for (const { params, opts } of [t.calls[0], r.calls[0]]) {
      expect(params.model).toBe(LIGHT_MODEL);
      expect(params.output_config?.effort).toBe("low");
      expect(params).not.toHaveProperty("fallbacks");
      expect(opts.stream).toBe(false);
      expect(opts.timeout).toBeLessThanOrEqual(60_000);
    }
  });
  it("마일스톤 피드백은 Sonnet, fallback 켜짐", async () => {
    const input = { teacher: "새" as const, milestone: "m", criteria: ["a", "b", "c"], content: "c", round: 1, nextWeek: 2 };
    const { calls, ai } = stub(textReply(mockMilestone(input)));
    await ai.milestoneFeedback(input);
    expect(calls[0].params.model).toBe(HEAVY_MODEL);
    expect(calls[0].params.fallbacks).toBe("default");
  });
});

describe("튜터 대화 순서", () => {
  it("빈 기록이면 여는 말 하나", () => {
    expect(tutorMessages([])).toEqual([{ role: "user", content: expect.any(String) }]);
  });
  it("AI 첫 질문부터 저장된 기록이면 user 여는 말을 앞에 붙인다", () => {
    const m = tutorMessages([
      { role: "ai", content: "무엇을 배웠나요?" },
      { role: "user", content: "자산이요" },
    ]);
    expect(m.map((x) => x.role)).toEqual(["user", "assistant", "user"]);
  });
  it("객관식 질문은 보기를 붙여 보낸다", () => {
    const m = tutorMessages([
      { role: "ai", content: "핵심은?", choices: ["가", "나", "다"] },
      { role: "user", content: "나" },
    ]);
    expect(m[1].content).toBe("핵심은?\n\n보기: 1) 가 / 2) 나 / 3) 다");
  });
  it("user로 시작하면 그대로 둔다", () => {
    expect(tutorMessages([{ role: "user", content: "질문" }])).toEqual([{ role: "user", content: "질문" }]);
  });
});

describe("Claude 응답 검증", () => {
  it("정상 JSON은 타입대로 돌려준다", async () => {
    const { ai } = stub(textReply({ bridge: "요리와 잇는다면?", pledge: "매일 10분" }));
    await expect(ai.roommate({ teacher: "온", topic: "t", weekIndex: 1, answers: ["a", "b", "c"] })).resolves.toEqual({
      bridge: "요리와 잇는다면?",
      pledge: "매일 10분",
    });
  });
  it("거절은 refusal 사유", () => {
    expect(() => readReply(Retro, textReply("", "refusal"))).toThrow(expect.objectContaining({ reason: "refusal" }));
  });
  it("max_tokens로 잘린 답은 parse 사유", () => {
    expect(() => readReply(Retro, textReply('{"bridge":"반쯤', "max_tokens"))).toThrow(expect.objectContaining({ reason: "parse" }));
  });
  it("깨진 JSON, 빈 답, 모양이 다른 답은 parse 사유", () => {
    expect(() => readReply(Retro, textReply("not json"))).toThrow(/읽지 못했어요/);
    expect(() => readReply(Retro, { stop_reason: "end_turn", content: [] })).toThrow(AiError);
    expect(() => readReply(Retro, textReply({ bridge: "x" }))).toThrow(/모양이 달라요/);
  });
  it("앱이 못 쓰는 커리큘럼(빈 주, 보기 3개, 범위 밖 정답)은 실패로 본다", () => {
    const plan = mockCurriculum(base);
    expect(() => readReply(Plan, textReply({ ...plan, weeks: [] }))).toThrow(AiError);
    const badQuiz = structuredClone(plan);
    badQuiz.weeks[0].quiz[0].answer = 7;
    expect(() => readReply(Plan, textReply(badQuiz))).toThrow(AiError);
    const fewChoices = structuredClone(plan);
    fewChoices.weeks[0].quiz[0].choices = ["a", "b", "c"];
    expect(() => readReply(Plan, textReply(fewChoices))).toThrow(AiError);
  });
  it("mock 커리큘럼은 Claude 스키마를 통과한다(두 경로가 같은 모양)", () => {
    expect(Plan.safeParse(mockCurriculum(base)).success).toBe(true);
    expect(Plan.safeParse(mockCurriculum({ ...base, weeks: 12, studyDays: [0, 1, 2, 3, 4, 5, 6] })).success).toBe(true);
  });
  it("fallback 블록이 있으면 그 뒤의 답만 읽는다", () => {
    const res: ClaudeReply = {
      stop_reason: "end_turn",
      content: [
        { type: "text", text: '{"bridge":"앞', citations: null },
        {
          type: "fallback",
          from: { model: HEAVY_MODEL },
          to: { model: "claude-sonnet-5" },
          trigger: { type: "refusal", category: "cyber" },
        },
        { type: "text", text: JSON.stringify({ bridge: "뒤", pledge: "p" }), citations: null },
      ],
    };
    expect(readReply(Retro, res)).toEqual({ bridge: "뒤", pledge: "p" });
  });
  it("생각 블록이 앞에 와도 text만 읽는다", () => {
    const res: ClaudeReply = {
      stop_reason: "end_turn",
      content: [
        { type: "thinking", thinking: "", signature: "sig" },
        { type: "text", text: JSON.stringify({ bridge: "b", pledge: "p" }), citations: null },
      ],
    };
    expect(readReply(Retro, res)).toEqual({ bridge: "b", pledge: "p" });
  });
});

describe("Claude 오류 처리", () => {
  const retro = { teacher: "온" as const, topic: "t", weekIndex: 1, answers: ["a", "b", "c"] };
  it("연결 오류와 시간 초과는 network 사유", async () => {
    await expect(stub(new Anthropic.APIConnectionError({ message: "down" })).ai.roommate(retro)).rejects.toMatchObject({
      name: "AiError",
      reason: "network",
    });
    await expect(stub(new Anthropic.APIConnectionTimeoutError()).ai.roommate(retro)).rejects.toMatchObject({ reason: "network" });
  });
  it("API 오류(과부하 등)는 unknown 사유", async () => {
    const err = new Anthropic.APIError(529, undefined, "overloaded", new Headers());
    await expect(stub(err).ai.roommate(retro)).rejects.toMatchObject({ name: "AiError", reason: "unknown" });
  });
  it("SDK 자체 오류(스트림 끊김 등)도 AiError로 바꾼다", async () => {
    await expect(stub(new Anthropic.AnthropicError("stream ended")).ai.generateCurriculum(base)).rejects.toBeInstanceOf(AiError);
  });
  it("AiError는 그대로 통과시킨다", async () => {
    await expect(guard(async () => Promise.reject(new AiError("x", "refusal")))).rejects.toMatchObject({ reason: "refusal" });
  });
});

describe("커리큘럼 뼈대는 모양이 틀리면 한 번 다시 만든다", () => {
  const parts = splitPlan(mockCurriculum(base));
  const broken = textReply({ goal: "x", excludes: [], weeks: [] });

  it("첫 답이 틀리고 두 번째가 맞으면 두 번째 답을 쓴다", async () => {
    const { ai, outlineCalls } = curriculumStub([broken, parts.outline], parts.week);
    const plan = await ai.generateCurriculum(base);
    expect(plan.weeks.length).toBeGreaterThan(0);
    expect(outlineCalls()).toBe(2);
  });
  it("두 번 다 틀리면 실패하고 세 번째는 부르지 않는다", async () => {
    const { ai, outlineCalls } = curriculumStub([broken, broken, parts.outline], parts.week);
    await expect(ai.generateCurriculum(base)).rejects.toMatchObject({ reason: "parse" });
    expect(outlineCalls()).toBe(2);
  });
  it("거절이나 연결 실패는 다시 부르지 않는다", async () => {
    const refused = curriculumStub([textReply("", "refusal"), parts.outline], parts.week);
    await expect(refused.ai.generateCurriculum(base)).rejects.toMatchObject({ reason: "refusal" });
    expect(refused.outlineCalls()).toBe(1);
  });
});


describe("복습 문제", () => {
  const input = {
    teacher: "새" as const,
    lessonTitle: "레슨",
    core: "핵심 한 줄",
    sections: [{ heading: "소제목", text: "설명", example: "예시", ref: 0 }],
    focus: "lesson" as const,
    step: 1,
  };
  it("가벼운 모델로 레슨 본문을 넣어 부르고 답을 그대로 쓴다", async () => {
    const q = { q: "핵심은?", choices: ["a", "b", "c", "d"], answer: 1, why: "이유" };
    const { calls, ai } = stub(textReply(q));
    await expect(ai.reviewQuestion(input)).resolves.toEqual(q);
    expect(calls[0].params.model).toBe(LIGHT_MODEL);
    expect(String(calls[0].params.system)).toContain("소제목");
    expect(calls[0].opts.stream).toBe(false);
  });
  it("보기가 4개가 아니면 parse 오류", async () => {
    const { ai } = stub(textReply({ q: "핵심은?", choices: ["a", "b"], answer: 1, why: "이유" }));
    await expect(ai.reviewQuestion(input)).rejects.toMatchObject({ reason: "parse" });
  });
});
