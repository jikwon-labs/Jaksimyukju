import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { APP_BIND_COOKIE, newSecret, sha256 } from "@/lib/domain/app-auth";
import { appOrigin, PROVIDER_IDS, safeNext } from "@/lib/domain/oauth";
import { getProvider } from "@/lib/server/oauth";
import { forbidden, fromThisSite, invalid, readJson } from "../shared";

const Input = z.object({
  provider: z.enum(PROVIDER_IDS),
  mode: z.enum(["login", "link"]),
  next: z.string().max(300),
});

/**
 * 앱 껍데기에서 소셜 로그인 버튼을 누르면 웹뷰가 먼저 부른다. 이 웹뷰에 묶음 쿠키를 심고,
 * 앱이 Safari 로그인 창으로 열 시작 경로(bind 포함)를 돌려준다
 */
export async function POST(req: NextRequest) {
  if (!fromThisSite(req)) return forbidden();
  const parsed = Input.safeParse(await readJson(req));
  if (!parsed.success) return invalid();
  const { provider, mode } = parsed.data;
  if (!getProvider(provider, appOrigin(req.nextUrl.origin)))
    return NextResponse.json({ error: "not found" }, { status: 404 });
  const secret = newSecret();
  const q = new URLSearchParams({
    mode,
    next: safeNext(parsed.data.next, "/home"),
    bind: sha256(secret),
  });
  const res = NextResponse.json({ path: `/api/auth/${provider}/start?${q}` });
  res.cookies.set(APP_BIND_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 60 * 10,
  });
  return res;
}
