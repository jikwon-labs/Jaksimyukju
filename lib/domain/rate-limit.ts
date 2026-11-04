// 짧은 시간 안에 같은 곳에서 너무 많이 부르는 요청을 막는 창(window) 세기. 순수 계산이라 상태는 부르는 쪽이 들고 있다.

export interface RateWindow {
  /** 창이 열린 시각(ms) */
  start: number;
  count: number;
}

export interface RateRule {
  /** 창 하나에 허용하는 횟수 */
  limit: number;
  windowMs: number;
  /** 들고 있을 키 수 상한. 넘으면 끝난 창부터, 그래도 많으면 오래된 것부터 지운다 */
  maxKeys: number;
}

/** 한 번 쓴다. 허용되면 true. store를 고친다 */
export function hitRate(
  store: Map<string, RateWindow>,
  key: string,
  now: number,
  rule: RateRule,
): boolean {
  const w = store.get(key);
  if (w && now - w.start < rule.windowMs) {
    if (w.count >= rule.limit) return false;
    w.count++;
    return true;
  }
  if (!w && store.size >= rule.maxKeys) {
    for (const [k, v] of store) if (now - v.start >= rule.windowMs) store.delete(k);
    // Map은 넣은 순서를 지킨다. 그래도 가득하면 가장 먼저 넣은 키부터 뺀다
    for (const k of store.keys()) {
      if (store.size < rule.maxKeys) break;
      store.delete(k);
    }
  }
  store.delete(key);
  store.set(key, { start: now, count: 1 });
  return true;
}

/** 요청한 쪽 주소. 프록시(Vercel)가 붙인 x-forwarded-for의 첫 값, 없으면 x-real-ip */
export function clientKey(headers: { get(name: string): string | null }): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip")?.trim() || "unknown";
}
