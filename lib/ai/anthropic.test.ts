import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { guard, HEAVY_MODEL, LIGHT_MODEL, parsed } from "./anthropic";
import { AiError } from "./types";

describe("Claude 응답 처리", () => {
  it("모델: 무거운 일은 Sonnet 5.5, 가벼운 일은 Haiku 5.5", () => {
    expect(HEAVY_MODEL).toBe("claude-sonnet-5-5");
    expect(LIGHT_MODEL).toBe("claude-haiku-5-5");
  });
  it("거절과 파싱 실패는 AiError로 바꾼다", () => {
    expect(() => parsed({ parsed_output: null, stop_reason: "refusal" })).toThrow(AiError);
    expect(() => parsed({ parsed_output: null, stop_reason: "end_turn" })).toThrow(/읽지 못했어요/);
    expect(parsed({ parsed_output: { a: 1 }, stop_reason: "end_turn" })).toEqual({ a: 1 });
  });
  it("연결 오류는 network 사유의 AiError로 바꾼다", async () => {
    const err = new Anthropic.APIConnectionError({ message: "down" });
    await expect(guard(async () => Promise.reject(err))).rejects.toMatchObject({ name: "AiError", reason: "network" });
  });
  it("AiError는 그대로 통과시킨다", async () => {
    await expect(guard(async () => Promise.reject(new AiError("x", "refusal")))).rejects.toMatchObject({ reason: "refusal" });
  });
});
