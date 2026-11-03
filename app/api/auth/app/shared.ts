import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/lib/domain/app-auth";

/** 앱 로그인 POST는 이 사이트 화면(웹뷰)에서 보낸 것만 받는다 */
export function fromThisSite(req: NextRequest): boolean {
  return sameOrigin(req.headers.get("origin"), req.headers.get("host"));
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export const forbidden = () => NextResponse.json({ error: "forbidden" }, { status: 403 });
export const invalid = () => NextResponse.json({ error: "invalid" }, { status: 400 });
