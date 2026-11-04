import { describe, expect, it } from "vitest";
import { closeFinder, tokenizeHtml } from "./html";
import { htmlToText, LINK_MAX_BYTES } from "./material";

const PARA =
  "현금흐름표는 일정 기간 동안 기업의 현금이 어떻게 들어오고 나갔는지 보여 주는 재무제표다.";

describe("tokenizeHtml", () => {
  it("글과 태그로 나누고 스크립트 속 < 는 태그로 읽지 않는다", () => {
    const t = tokenizeHtml(
      `<p class="a">가</p><script>if(a<b){x="</p>"}</script>나<!-- 주석 -->다`,
    );
    expect(t).toEqual([
      { kind: "tag", name: "p", end: false, self: false, raw: undefined },
      { kind: "text", text: "가" },
      { kind: "tag", name: "p", end: true, self: false, raw: undefined },
      { kind: "tag", name: "script", end: false, self: false, raw: undefined },
      { kind: "text", text: 'if(a<b){x="</p>"}' },
      { kind: "tag", name: "script", end: true, self: false },
      { kind: "text", text: "나" },
      { kind: "gap" },
      { kind: "text", text: "다" },
    ]);
  });

  it("> 가 없는 < 와 태그가 아닌 < 는 글로 둔다", () => {
    expect(tokenizeHtml("1 < 2 그리고 <b")).toEqual([
      { kind: "text", text: "1 " },
      { kind: "text", text: "<" },
      { kind: "text", text: " 2 그리고 " },
      { kind: "text", text: "<b" },
    ]);
  });
});

describe("closeFinder", () => {
  it("뒤쪽 첫 닫는 태그 자리를 돌려주고 없으면 -1", () => {
    const t = tokenizeHtml("<p>a</p><p>b</p><li>c");
    const close = closeFinder(t);
    expect(close("p", 0)).toBe(2);
    expect(close("p", 3)).toBe(5);
    expect(close("p", 6)).toBe(-1);
    expect(close("li", 6)).toBe(-1);
  });
});

describe("htmlToText 닫는 태그가 빠진 페이지", () => {
  it("</p> 를 뺀 문단은 통째 읽기로 글을 살린다", () => {
    const html = `<body>${Array.from({ length: 4 }, () => `<p>${PARA}`).join("\n")}</body>`;
    const r = htmlToText(html);
    expect(r.text).toContain("현금흐름표는");
    expect(r.text.split("\n").length).toBeGreaterThanOrEqual(4);
  });

  it("닫힌 문단 사이에 안 닫힌 문단이 섞여도 닫힌 것은 그대로 쓴다", () => {
    const html = `<article><p>${PARA}</p><p>안 닫힘<p>${PARA} 둘째</p><p>${PARA} 셋째</p></article>`;
    const r = htmlToText(html);
    expect(r.text).toContain("둘째");
    expect(r.text).toContain("셋째");
  });

  it("안 닫힌 article 은 body 로 물러난다", () => {
    const r = htmlToText(
      `<body><nav>메뉴</nav><article><p>${PARA}</p><p>${PARA}</p><p>${PARA}</p></body>`,
    );
    expect(r.text).toContain("현금흐름표는");
    expect(r.text).not.toContain("메뉴");
  });

  it("한도 크기의 닫히지 않은 태그 투성이 페이지도 금방 끝난다", () => {
    const unit = "<p>짧은 글 <li>항목 <script>x<b <div><main><svg ";
    const html = `<html><head><title>제목</title></head><body>${unit.repeat(Math.floor(LINK_MAX_BYTES / unit.length))}`;
    const started = performance.now();
    const r = htmlToText(html);
    const ms = performance.now() - started;
    expect(r.title).toBe("제목");
    // 예전 정규식은 1MB에 3초가 넘게 걸렸다. 4MB에서도 몇 초 안쪽이어야 한다
    expect(ms).toBeLessThan(3000);
  });

  it("닫히지 않은 <p> 4만 개(1MB)도 빠르다", () => {
    const html = `<body>${`<p>${"가".repeat(20)} `.repeat(40_000)}</body>`;
    const started = performance.now();
    const r = htmlToText(html);
    expect(performance.now() - started).toBeLessThan(2000);
    expect(r.text.length).toBeGreaterThan(0);
  });
});
