// Librarian 흐름: 웹 검색 후보 -> 서버에서 링크가 열리는지 확인 -> 열린 것만 3개까지, 요약은 세 줄까지(기획서 F11).
// 검색과 링크 확인은 바꿔 끼울 수 있게 나눴다. 키가 없는 지금은 둘 다 mock이다.
import type { Librarian, ResourceItem } from "./types";

export const RESOURCE_MAX = 3;
export const SUMMARY_MAX = 3;

export interface SearchQuery {
  topic: string;
  lessonTitle: string;
  level: string;
}

/** 웹 검색 후보. 열리는지 모르는 링크가 섞여 있다고 본다 */
export interface WebSearch {
  search(q: SearchQuery): Promise<ResourceItem[]>;
}

/** 링크가 열리면 true. 실패나 시간 초과도 false */
export type LinkCheck = (url: string) => Promise<boolean>;

export function createLibrarian(web: WebSearch, check: LinkCheck): Librarian {
  return {
    async search(topic, lessonTitle, level) {
      const candidates = await web.search({ topic, lessonTitle, level });
      const seen = new Set<string>();
      const out: ResourceItem[] = [];
      for (const c of candidates) {
        if (out.length >= RESOURCE_MAX) break;
        if (!/^https:\/\//.test(c.url) || seen.has(c.url)) continue;
        seen.add(c.url);
        if (!(await check(c.url).catch(() => false))) continue;
        out.push({ ...c, summary: c.summary.slice(0, SUMMARY_MAX) });
      }
      return out;
    },
  };
}
