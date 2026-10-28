// 한국어 조사: 앞 글자의 받침에 따라 고른다

function lastHangul(word: string): number | null {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 ? code - 0xac00 : null;
}

/** 받침이 있으면 true. 한글이 아니면 false */
export function hasBatchim(word: string): boolean {
  const c = lastHangul(word);
  return c !== null && c % 28 !== 0;
}

/** "로/으로": 받침이 없거나 ㄹ 받침이면 "로" */
export function ro(word: string): string {
  const c = lastHangul(word);
  const rieul = c !== null && c % 28 === 8;
  return `${word}${hasBatchim(word) && !rieul ? "으로" : "로"}`;
}

function pick(word: string, withBatchim: string, without: string): string {
  return `${word}${hasBatchim(word) ? withBatchim : without}`;
}

/** 을/를 */
export const eul = (w: string) => pick(w, "을", "를");
/** 이/가 */
export const iga = (w: string) => pick(w, "이", "가");
/** 은/는 */
export const eun = (w: string) => pick(w, "은", "는");
