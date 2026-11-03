import { NextResponse, type NextRequest } from "next/server";
import { devToolsEnabled } from "@/lib/clock";
import { APPLE_ISSUER, challengeOf } from "@/lib/domain/oauth";
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
  if (code.provider === "apple") {
    // Apple은 사용자 정보 주소 없이 id_token만 준다. 가짜는 서명 없이 내용만 담는다(앱은 서명을 확인하지 않는다)
    const enc = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const claims = { iss: APPLE_ISSUER, aud: "dev-apple", sub: code.sub, iat: now, exp: now + 600, email: code.email || undefined, email_verified: "true" };
    return NextResponse.json({ access_token: pack(user), token_type: "bearer", id_token: `${enc({ alg: "none" })}.${enc(claims)}.` });
  }
  return NextResponse.json({ access_token: pack(user), token_type: "bearer" });
}
