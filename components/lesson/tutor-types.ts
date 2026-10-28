export interface TutorMessageView {
  id: string;
  role: "user" | "ai";
  content: string;
  understanding: "이해" | "부분" | "미흡" | null;
}

export interface TutorResponse {
  messages: TutorMessageView[];
  done: boolean;
  error?: "ai";
}

export function toMessageView(m: {
  id: string;
  role: string;
  content: string;
  understanding: string | null;
}): TutorMessageView {
  const u = m.understanding;
  return {
    id: m.id,
    role: m.role === "user" ? "user" : "ai",
    content: m.content,
    understanding: u === "이해" || u === "부분" || u === "미흡" ? u : null,
  };
}
