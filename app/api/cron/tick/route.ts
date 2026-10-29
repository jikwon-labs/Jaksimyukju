import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { devToolsEnabled } from "@/lib/clock";
import { runTick } from "@/lib/server/scheduler";

/** CRON_SECRET이 있으면 Bearer로 맞아야 한다. 없으면 개발 모드에서만 연다 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return devToolsEnabled();
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function tick(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // 개발·E2E에서는 ?now=ISO 시각으로 그 시각의 tick을 흉내 낸다
  const raw = devToolsEnabled() ? req.nextUrl.searchParams.get("now") : null;
  const now = raw ? new Date(raw) : new Date();
  if (Number.isNaN(now.getTime())) return NextResponse.json({ error: "bad now" }, { status: 400 });
  return NextResponse.json(await runTick(now));
}

// Vercel Cron 같은 곳은 GET으로, 직접 부를 때는 POST로 부른다
export const GET = tick;
export const POST = tick;
