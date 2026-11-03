// 채팅 말풍선: 선생님의 긴 답을 빈 줄마다 나눠 여러 말풍선으로 보여 준다.

/** 빈 줄(공백만 있는 줄 포함)로 나눈 덩어리. 비어 있으면 원문 하나 */
export function splitBubbles(text: string): string[] {
  const parts = text
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

/**
 * 말풍선 하나를 "치는" 데 걸린 것처럼 보일 시간(ms).
 * 답이 한꺼번에 뜨면 어색하니 길이에 비례해 기다리되, 너무 짧거나 길지 않게 자른다.
 */
export function typingMs(text: string): number {
  const ms = 300 + text.length * 25;
  return Math.min(2000, Math.max(600, ms));
}
