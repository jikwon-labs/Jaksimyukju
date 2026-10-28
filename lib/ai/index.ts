import "server-only";
import { createAnthropicProvider } from "./anthropic";
import { mockLibrarian, mockProvider } from "./mock";
import type { AiProvider, Librarian } from "./types";

/** 키가 있으면 Claude, 없으면 결정적 mock */
export function getAi(): AiProvider {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key && process.env.J6_FORCE_MOCK !== "1") return createAnthropicProvider(key);
  return mockProvider;
}

/** 자료 검색은 이번 범위에서 mock만 둔다 */
export function getLibrarian(): Librarian {
  return mockLibrarian;
}

export * from "./types";
