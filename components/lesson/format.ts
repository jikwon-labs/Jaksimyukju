/** 링크 주소에서 출처 사이트 이름 */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "출처 미상";
  }
}

/** 10월 29일 */
export function monthDay(d: Date, timeZone = "Asia/Seoul"): string {
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone, month: "numeric", day: "numeric" }).formatToParts(d);
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${m}월 ${day}일`;
}
