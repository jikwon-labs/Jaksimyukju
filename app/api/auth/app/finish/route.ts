import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { APP_BIND_COOKIE } from "@/lib/domain/app-auth";
import { callbackPath } from "@/lib/domain/oauth";
import { consumeHandoff } from "@/lib/server/handoff";
import { finishSocial } from "@/lib/server/social-login";
import { forbidden, fromThisSite, invalid, readJson } from "../shared";

const Input = z.object({ code: z.string().min(1).max(200) });

/** 앱이 Safari 로그인 창에서 받아 온 1회용 코드로 이 웹뷰에서 로그인·연결을 마친다. 돌아갈 경로를 준다 */
export async function POST(req: NextRequest) {
  if (!fromThisSite(req)) return forbidden();
  const parsed = Input.safeParse(await readJson(req));
  if (!parsed.success) return invalid();
  const h = await consumeHandoff(parsed.data.code, req.cookies.get(APP_BIND_COOKIE)?.value);
  let to: string;
  if (!h) to = callbackPath(null, "failed");
  else if (h.result !== "ok" || !h.profile)
    to = callbackPath(h, h.result === "cancel" ? "cancel" : "failed");
  else to = callbackPath(h, await finishSocial(h.provider, h.profile, h.mode));
  const res = NextResponse.json({ to });
  res.cookies.set(APP_BIND_COOKIE, "", { path: "/api/auth", maxAge: 0 });
  return res;
}
