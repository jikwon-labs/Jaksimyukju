import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { callbackPath, safeNext } from "@/lib/domain/oauth";
import { kakaoNativeProfile, kakaoNativeReady } from "@/lib/server/oauth";
import { finishSocial } from "@/lib/server/social-login";
import { forbidden, fromThisSite, invalid, readJson } from "../shared";

const Input = z.object({
  accessToken: z.string().min(1).max(4000),
  mode: z.enum(["login", "link"]),
  next: z.string().max(300),
});

/** 앱이 카카오 SDK(카카오톡 앱)로 받은 액세스 토큰으로 로그인·연결한다. 토큰이 우리 앱 것인지 서버가 확인한다 */
export async function POST(req: NextRequest) {
  if (!fromThisSite(req)) return forbidden();
  const parsed = Input.safeParse(await readJson(req));
  if (!parsed.success) return invalid();
  const flow = { mode: parsed.data.mode, next: safeNext(parsed.data.next, "/home") };
  // 서버에 앱 ID가 없으면 앱이 Safari 로그인 창으로 다시 하도록 알린다
  if (!kakaoNativeReady()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  let profile;
  try {
    profile = await kakaoNativeProfile(parsed.data.accessToken);
  } catch (e) {
    console.error("kakao native login failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ to: callbackPath(flow, "failed") });
  }
  return NextResponse.json({
    to: callbackPath(flow, await finishSocial("kakao", profile, flow.mode)),
  });
}
