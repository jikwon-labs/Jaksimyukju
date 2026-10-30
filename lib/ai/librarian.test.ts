import { describe, expect, it } from "vitest";
import { createLibrarian, type WebSearch } from "./librarian";
import { mockLibrarian } from "./mock";
import type { ResourceItem } from "./types";

const item = (url: string, summary = ["가"]): ResourceItem => ({ title: url, url, kind: "글", minutes: 5, reason: "", summary });

describe("createLibrarian", () => {
  it("열리는 링크만 3개까지, 중복과 https가 아닌 링크는 뺀다", async () => {
    const web: WebSearch = {
      async search() {
        return [
          item("https://a.test/dead"),
          item("http://b.test/plain"),
          item("https://c.test/1"),
          item("https://c.test/1"),
          item("https://d.test/2"),
          item("https://e.test/3"),
          item("https://f.test/4"),
        ];
      },
    };
    const checked: string[] = [];
    const lib = createLibrarian(web, async (url) => {
      checked.push(url);
      return !url.includes("dead");
    });
    const out = await lib.search("주제", "레슨", "처음");
    expect(out.map((r) => r.url)).toEqual(["https://c.test/1", "https://d.test/2", "https://e.test/3"]);
    // 3개를 채우면 더 확인하지 않는다
    expect(checked).not.toContain("https://f.test/4");
  });

  it("링크 확인이 던져도 그 링크만 빼고, 요약은 세 줄까지", async () => {
    const web: WebSearch = {
      async search() {
        return [item("https://x.test/throw"), item("https://y.test/ok", ["1", "2", "3", "4"])];
      },
    };
    const lib = createLibrarian(web, async (url) => {
      if (url.includes("throw")) throw new Error("timeout");
      return true;
    });
    const out = await lib.search("주제", "레슨", "처음");
    expect(out.map((r) => r.url)).toEqual(["https://y.test/ok"]);
    expect(out[0].summary).toEqual(["1", "2", "3"]);
  });

  it("mock 검색의 닫힌 링크와 중복은 걸러져 3개가 남는다", async () => {
    const out = await mockLibrarian.search("재무제표 읽기", "현금흐름표 읽기", "처음");
    expect(out).toHaveLength(3);
    expect(out.some((r) => r.url.includes(".invalid"))).toBe(false);
    expect(new Set(out.map((r) => r.url)).size).toBe(3);
    expect(out[0].url).toBe("https://ko.wikipedia.org/wiki/%EC%9E%AC%EB%AC%B4%EC%A0%9C%ED%91%9C");
  });
});
