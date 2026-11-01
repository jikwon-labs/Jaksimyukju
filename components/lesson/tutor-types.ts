export interface TutorMessageView {
  id: string;
  role: "user" | "ai";
  content: string;
  understanding: "이해" | "부분" | "미흡" | null;
  /** 객관식 질문의 보기. 없으면 빈 배열 */
  choices: string[];
}

export interface TutorResponse {
  messages: TutorMessageView[];
  done: boolean;
  error?: "ai";
}

/** DB의 Json 칸에서 보기 목록을 꺼낸다. 모양이 다르면 빈 배열 */
export function toChoices(v: unknown): string[] {
  return Array.isArray(v) && v.every((c) => typeof c === "string") ? v : [];
}

export function toMessageView(m: {
  id: string;
  role: string;
  content: string;
  understanding: string | null;
  choices?: unknown;
}): TutorMessageView {
  const u = m.understanding;
  return {
    id: m.id,
    role: m.role === "user" ? "user" : "ai",
    content: m.content,
    understanding: u === "이해" || u === "부분" || u === "미흡" ? u : null,
    choices: toChoices(m.choices),
  };
}
