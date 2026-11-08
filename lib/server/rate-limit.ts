import "server-only";
// 요청 횟수 제한을 DB에 센다. Vercel은 함수 인스턴스가 여럿 뜨므로 메모리로 세면 인스턴스마다 따로 세져 느슨해진다.
// 창마다 (key, windowStart) 한 줄을 두고 INSERT ... ON CONFLICT로 한 번에 올려 동시 요청에도 정확히 센다.
import { type RateRule, windowStart, withinLimit } from "@/lib/domain/rate-limit";
import { prisma } from "@/lib/prisma";

/** 이보다 오래된 창은 지운다 */
const KEEP_MS = 24 * 60 * 60 * 1000;
/** 매 요청마다 지우지 않고 가끔만 */
const CLEANUP_CHANCE = 0.02;

/** 한 번 쓴다. 허용되면 true */
export async function hitRate(key: string, rule: RateRule, now = Date.now()): Promise<boolean> {
  const start = new Date(windowStart(now, rule.windowMs));
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_hits" ("key", "windowStart", "count")
    VALUES (${key}, ${start}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "rate_hits"."count" + 1
    RETURNING "count"`;
  if (Math.random() < CLEANUP_CHANCE) {
    await prisma.rateHit
      .deleteMany({ where: { windowStart: { lt: new Date(now - KEEP_MS) } } })
      .catch((e: unknown) => console.warn("[rate-limit] cleanup", e));
  }
  return withinLimit(Number(rows[0]?.count ?? Infinity), rule);
}
