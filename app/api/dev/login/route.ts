import { NextResponse, type NextRequest } from "next/server";
import { signIn } from "@/lib/auth";
import { devToolsEnabled, NOW_COOKIE } from "@/lib/clock";
import { DEMO_USER_ID } from "@/lib/constants";
import { safeNext } from "@/lib/domain/oauth";
import { prisma } from "@/lib/prisma";

/** 개발·E2E 전용: 데모 사용자로 들어가고, ?now=YYYY-MM-DD 로 오늘을 바꾼다 */
export async function GET(req: NextRequest) {
  if (!devToolsEnabled()) return new NextResponse("not found", { status: 404 });
  const id = req.nextUrl.searchParams.get("as") ?? DEMO_USER_ID;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return new NextResponse("no user", { status: 404 });
  await signIn(user);
  // 개발 서버의 req.url은 localhost로 잡혀서, 폰에서 맥 IP로 열면 열 수 없는 주소로 간다. 경로만 돌려준다
  const to = safeNext(req.nextUrl.searchParams.get("to"), "/home");
  const res = new NextResponse(null, { status: 307, headers: { Location: to } });
  const now = req.nextUrl.searchParams.get("now");
  if (now && /^\d{4}-\d{2}-\d{2}$/.test(now)) res.cookies.set(NOW_COOKIE, now, { path: "/" });
  else if (now === "") res.cookies.delete(NOW_COOKIE);
  return res;
}
