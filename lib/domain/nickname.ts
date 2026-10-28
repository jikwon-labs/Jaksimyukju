// 새 사용자 별명. 그룹에서 서로 "나"로 보이지 않게, 겹치지 않는 이름을 붙인다
const WORDS = ["하늘", "바다", "솔", "별", "달", "구름", "나무", "봄비", "여름", "가을", "새벽", "노을"];

export function nickname(n: number): string {
  const word = WORDS[n % WORDS.length];
  const round = Math.floor(n / WORDS.length);
  return round === 0 ? word : `${word}${round + 1}`;
}
