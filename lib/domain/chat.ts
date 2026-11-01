// 채팅 말풍선: 선생님의 긴 답을 빈 줄마다 나눠 여러 말풍선으로 보여 준다.

/** 빈 줄(공백만 있는 줄 포함)로 나눈 덩어리. 비어 있으면 원문 하나 */
export function splitBubbles(text: string): string[] {
  const parts = text
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
}
