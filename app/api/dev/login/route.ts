import { NextResponse, type NextRequest } from "next/server";
import { signIn } from "@/lib/auth";
import { devToolsEnabled, NOW_COOKIE } from "@/lib/clock";
import { DEMO_USER_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/** 개발·E2E 전용: 데모 사용자로 들어가고, ?now=YYYY-MM-DD 로 오늘을 바꾼다 */
export async function GET(req: NextRequest) {
  if (!devToolsEnabled()) return new NextResponse("not found", { status: 404 });
  const id = req.nextUrl.searchParams.get("as") ?? DEMO_USER_ID;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return new NextResponse("no user", { status: 404 });
  await signIn(user);
  const res = NextResponse.redirect(new URL(req.nextUrl.searchParams.get("to") ?? "/home", req.url));
  const now = req.nextUrl.searchParams.get("now");
  if (now && /^\d{4}-\d{2}-\d{2}$/.test(now)) res.cookies.set(NOW_COOKIE, now, { path: "/" });
  else if (now === "") res.cookies.delete(NOW_COOKIE);
  return res;
}
