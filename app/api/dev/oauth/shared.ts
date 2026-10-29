// 개발·E2E 전용 가짜 OAuth 공급자의 공용 부분. 코드와 토큰은 서명 없이 내용만 담는다(운영 빌드에서는 404)
import { z } from "zod";
import { PROVIDER_IDS } from "@/lib/domain/oauth";

export const FakeUser = z.object({
  provider: z.enum(PROVIDER_IDS),
  sub: z.string().min(1).max(64),
  name: z.string().max(40),
  email: z.string().max(120),
  challenge: z.string().optional(),
});
export type FakeUser = z.infer<typeof FakeUser>;

export function pack(v: FakeUser): string {
  return Buffer.from(JSON.stringify(v)).toString("base64url");
}

export function unpack(v: string | null | undefined): FakeUser | null {
  if (!v) return null;
  try {
    const r = FakeUser.safeParse(JSON.parse(Buffer.from(v, "base64url").toString("utf8")));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
