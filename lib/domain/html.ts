// 웹 글(HTML)을 토막(글, 태그)으로 나눈다.
// 정규식 하나로 "여는 태그 ~ 닫는 태그"를 찾으면 닫는 태그가 없을 때(</p>, </li>는 HTML에서 빼도 된다)
// 여는 태그마다 문서 끝까지 다시 훑어 시간이 길이의 제곱으로 는다. 여기서는 문서를 한 번만 앞으로 훑고,
// 닫는 태그도 이름별 목록에서 앞으로만 찾는다. 그래서 몇 MB짜리 페이지도 길이에 비례한 시간이 든다.

export type HtmlToken =
  | { kind: "text"; text: string }
  /** raw: 정규식으로 속성을 볼 meta 태그 원문(짧을 때만) */
  | { kind: "tag"; name: string; end: boolean; self: boolean; raw?: string }
  /** 주석, <!doctype> 같이 글도 태그도 아닌 자리 */
  | { kind: "gap" };

/** 안을 태그로 읽지 않는 요소. 스크립트 속 "a<b" 같은 글이 태그로 잘못 읽히지 않게 한다 */
const RAW_TEXT_TAGS = new Set(["script", "style"]);
/** meta 태그 원문을 남기는 길이 상한(아주 긴 태그에 정규식을 돌리지 않게) */
const META_RAW_MAX = 2000;

function isTagStart(c: number): boolean {
  // 영문자, /, !, ?
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 47 || c === 33 || c === 63;
}

/** 문서를 토막으로 나눈다. 찾기는 모두 앞으로만 가서 길이에 비례한 시간이 든다 */
export function tokenizeHtml(html: string): HtmlToken[] {
  const out: HtmlToken[] = [];
  const n = html.length;
  // 한 번 못 찾은 스크립트·스타일 닫는 태그는 그 뒤에도 없다
  const noRawClose = new Set<string>();
  let i = 0;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt < 0) {
      out.push({ kind: "text", text: html.slice(i) });
      break;
    }
    if (lt > i) out.push({ kind: "text", text: html.slice(i, lt) });
    if (html.startsWith("<!--", lt)) {
      const close = html.indexOf("-->", lt + 4);
      // 닫히지 않은 주석은 문서 끝까지 주석이다
      if (close < 0) break;
      out.push({ kind: "gap" });
      i = close + 3;
      continue;
    }
    if (!isTagStart(html.charCodeAt(lt + 1))) {
      out.push({ kind: "text", text: "<" });
      i = lt + 1;
      continue;
    }
    const gt = html.indexOf(">", lt + 1);
    // >가 더 없으면 남은 것은 모두 글이다
    if (gt < 0) {
      out.push({ kind: "text", text: html.slice(lt) });
      break;
    }
    i = gt + 1;
    const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(lt, Math.min(i, lt + 64)));
    if (!m) {
      out.push({ kind: "gap" });
      continue;
    }
    const name = m[2].toLowerCase();
    const end = m[1] === "/";
    const self = html.charCodeAt(gt - 1) === 47;
    const raw = name === "meta" && i - lt <= META_RAW_MAX ? html.slice(lt, i) : undefined;
    out.push({ kind: "tag", name, end, self, raw });
    if (!end && !self && RAW_TEXT_TAGS.has(name) && !noRawClose.has(name)) {
      const re = new RegExp(`</${name}\\s*>`, "gi");
      re.lastIndex = i;
      const c = re.exec(html);
      if (!c) {
        noRawClose.add(name);
        continue;
      }
      if (c.index > i) out.push({ kind: "text", text: html.slice(i, c.index) });
      out.push({ kind: "tag", name, end: true, self: false });
      i = c.index + c[0].length;
    }
  }
  return out;
}

/**
 * tokens에서 "after 뒤 첫 닫는 태그(name)"의 자리를 찾는 함수. 없으면 -1.
 * 이름마다 커서를 앞으로만 옮기므로 같은 이름은 after가 커지는 순서로 물어야 한다(앞에서부터 훑는 한 번의 순회).
 */
export function closeFinder(tokens: HtmlToken[]): (name: string, after: number) => number {
  const lists = new Map<string, number[]>();
  tokens.forEach((t, i) => {
    if (t.kind !== "tag" || !t.end) return;
    const list = lists.get(t.name);
    if (list) list.push(i);
    else lists.set(t.name, [i]);
  });
  const cursor = new Map<string, number>();
  return (name, after) => {
    const list = lists.get(name);
    if (!list) return -1;
    let p = cursor.get(name) ?? 0;
    while (p < list.length && list[p] <= after) p++;
    cursor.set(name, p);
    return p < list.length ? list[p] : -1;
  };
}
