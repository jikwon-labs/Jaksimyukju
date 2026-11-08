// 짧은 시간 안에 같은 곳에서 너무 많이 부르는 요청을 막는 창(window) 세기의 순수 계산.
// 실제 횟수는 여러 서버 인스턴스가 함께 보도록 DB(lib/server/rate-limit.ts)에 둔다.

export interface RateRule {
  /** 창 하나에 허용하는 횟수 */
  limit: number;
  windowMs: number;
}

/** now가 들어가는 창의 시작 시각(ms). 같은 창 안의 요청은 모두 같은 값을 받는다 */
export function windowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

/** 이 창에서 count번째 요청을 허용하는지 */
export function withinLimit(count: number, rule: RateRule): boolean {
  return count <= rule.limit;
}

/** 요청한 쪽 주소. 프록시(Vercel)가 붙인 x-forwarded-for의 첫 값, 없으면 x-real-ip */
export function clientKey(headers: { get(name: string): string | null }): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip")?.trim() || "unknown";
}
