import { NextResponse, type NextRequest } from "next/server";
import { devToolsEnabled } from "@/lib/clock";
import { challengeOf } from "@/lib/domain/oauth";
import { pack, unpack } from "../shared";

/** 코드를 토큰으로 바꾼다. PKCE를 확인하고, 번호가 fail로 시작하면 실패를 흉내 낸다 */
export async function POST(req: NextRequest) {
  if (!devToolsEnabled()) return new NextResponse("not found", { status: 404 });
  const f = await req.formData();
  const code = unpack(typeof f.get("code") === "string" ? String(f.get("code")) : null);
  if (!code) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  const verifier = f.get("code_verifier");
  if (code.challenge && (typeof verifier !== "string" || challengeOf(verifier) !== code.challenge)) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }
  if (code.sub.startsWith("fail")) return NextResponse.json({ error: "server_error" }, { status: 500 });
  const user = { provider: code.provider, sub: code.sub, name: code.name, email: code.email };
  return NextResponse.json({ access_token: pack(user), token_type: "bearer" });
}
