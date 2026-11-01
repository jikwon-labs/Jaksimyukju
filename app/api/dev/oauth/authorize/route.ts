import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { devToolsEnabled } from "@/lib/clock";
import { DEMO_ACCOUNT_SUB, DEMO_EMAIL } from "@/lib/constants";
import { appOrigin, isProviderId, pathOf, PROVIDER_LABEL, type ProviderId } from "@/lib/domain/oauth";
import { pack } from "../shared";

function esc(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** 돌아갈 주소는 이 앱의 콜백만 허용한다(시작 쪽과 같은 appOrigin으로 비교) */
function callbackOf(req: NextRequest, raw: string | null, provider: ProviderId): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.origin === appOrigin(req.nextUrl.origin) && u.pathname === `/api/auth/${provider}/callback` ? u : null;
  } catch {
    return null;
  }
}

/** 가짜 동의 화면 */
export async function GET(req: NextRequest) {
  if (!devToolsEnabled()) return new NextResponse("not found", { status: 404 });
  const q = req.nextUrl.searchParams;
  const provider = q.get("provider") ?? "";
  if (!isProviderId(provider)) return new NextResponse("bad provider", { status: 400 });
  const cb = callbackOf(req, q.get("redirect_uri"), provider);
  const state = q.get("state") ?? "";
  if (!cb || !state) return new NextResponse("bad redirect_uri", { status: 400 });
  const cancel = new URL(cb);
  cancel.searchParams.set("error", "access_denied");
  cancel.searchParams.set("state", state);
  const label = PROVIDER_LABEL[provider];
  const sub = `dev-${randomBytes(6).toString("hex")}`;
  const hidden = (n: string, v: string) => `<input type="hidden" name="${n}" value="${esc(v)}">`;
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>가짜 ${label} 로그인 (개발용)</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#fff;color:#1d1d1f;padding:24px 16px}
@media (prefers-color-scheme:dark){body{background:#151517;color:#f2f2f4}input{background:#222;color:#f2f2f4}}
main{max-width:420px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
label{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600}
input{height:44px;padding:0 12px;border:1.5px solid #8a8a90;border-radius:10px;font-size:15px}
button,a{min-height:44px;border-radius:12px;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center}
button{border:none;background:#1d1d1f;color:#fff;cursor:pointer}
button.alt{background:transparent;color:inherit;border:1.5px solid #8a8a90}
a{color:inherit}
p{font-size:13px;line-height:19px;margin:0}
</style></head>
<body><main>
<h1>가짜 ${label} 로그인</h1>
<p>개발용 화면이에요. 실제 ${label}에는 아무것도 보내지 않아요. 키(.env)를 넣으면 진짜 ${label} 화면으로 바뀌어요.</p>
<form method="post" style="display:flex;flex-direction:column;gap:14px">
${hidden("provider", provider)}${hidden("redirect_uri", cb.toString())}${hidden("state", state)}${hidden("code_challenge", q.get("code_challenge") ?? "")}
<label>사용자 번호<input name="sub" value="${esc(sub)}" required maxlength="64"></label>
<label>이름<input name="name" value="새 친구" maxlength="40"></label>
<label>이메일<input name="email" type="email" value="${esc(sub)}@example.com" maxlength="120"></label>
<button type="submit">동의하고 계속하기</button>
<button type="submit" class="alt" name="demo" value="1">데모 지우로 계속하기</button>
</form>
<a href="${esc(pathOf(cancel))}">취소</a>
</main></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/** 동의: 사용자 정보를 담은 코드를 붙여 콜백으로 돌려보낸다 */
export async function POST(req: NextRequest) {
  if (!devToolsEnabled()) return new NextResponse("not found", { status: 404 });
  const f = await req.formData();
  const str = (k: string) => (typeof f.get(k) === "string" ? String(f.get(k)) : "");
  const provider = str("provider");
  if (!isProviderId(provider)) return new NextResponse("bad provider", { status: 400 });
  const cb = callbackOf(req, str("redirect_uri"), provider);
  if (!cb) return new NextResponse("bad redirect_uri", { status: 400 });
  const demo = str("demo") === "1";
  const code = pack({
    provider,
    sub: demo ? DEMO_ACCOUNT_SUB : str("sub").trim().slice(0, 64) || "dev-user",
    name: demo ? "지우" : str("name").trim().slice(0, 40),
    email: demo ? DEMO_EMAIL : str("email").trim().slice(0, 120),
    challenge: str("code_challenge") || undefined,
  });
  cb.searchParams.set("code", code);
  cb.searchParams.set("state", str("state"));
  // 콜백은 이 앱 안이라 경로만 돌려준다(개발 서버의 localhost 주소로 보내지 않게)
  return new NextResponse(null, { status: 303, headers: { Location: pathOf(cb) } });
}
