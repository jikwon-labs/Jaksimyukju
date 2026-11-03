import "server-only";
// 앱 로그인 넘겨받기: Safari 로그인 창의 콜백이 결과를 1회용 코드로 남기고, 웹뷰가 그 코드로 찾아간다
import { z } from "zod";
import { HANDOFF_TTL_MS, matchesHash, newSecret, sha256 } from "@/lib/domain/app-auth";
import {
  isProviderId,
  type OAuthFlow,
  type OAuthMode,
  type ProviderId,
  type SocialProfile,
} from "@/lib/domain/oauth";
import { prisma } from "@/lib/prisma";

const Profile = z.object({
  sub: z.string().min(1),
  email: z.string().nullable(),
  name: z.string().nullable(),
  revokeToken: z.string().nullable().optional(),
});

export interface Handoff {
  provider: ProviderId;
  mode: OAuthMode;
  next: string;
  result: string;
  profile: SocialProfile | null;
}

/** 콜백 결과를 남기고 앱으로 돌려줄 1회용 코드를 준다. DB에는 코드의 sha256만 둔다 */
export async function createHandoff(
  flow: OAuthFlow & { bind: string },
  result: string,
  profile: SocialProfile | null,
): Promise<string> {
  const code = newSecret();
  await prisma.authHandoff.create({
    data: {
      id: sha256(code),
      bind: flow.bind,
      provider: flow.provider,
      mode: flow.mode,
      next: flow.next,
      result,
      profile: profile ? { ...profile } : undefined,
      expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
    },
  });
  // 오래된 코드는 만들 때 같이 치운다(쓰지 않고 버려진 것)
  await prisma.authHandoff.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return code;
}

/**
 * 코드를 한 번만 쓴다(찾으면 바로 지운다). 만료됐거나, 이 웹뷰의 묶음 쿠키와 맞지 않으면 null.
 * 묶음 쿠키가 없으면 남이 보낸 링크로 들어온 것이므로 받지 않는다
 */
export async function consumeHandoff(
  code: string,
  bindSecret: string | undefined,
): Promise<Handoff | null> {
  if (!code || !bindSecret) return null;
  const id = sha256(code);
  const row = await prisma.authHandoff.findUnique({ where: { id } });
  if (!row) return null;
  // 동시에 두 번 와도 한 번만 지워진다. 지운 쪽만 이어 간다
  const gone = await prisma.authHandoff.deleteMany({ where: { id } });
  if (gone.count !== 1) return null;
  if (row.expiresAt.getTime() < Date.now() || !matchesHash(bindSecret, row.bind)) return null;
  if (!isProviderId(row.provider) || (row.mode !== "login" && row.mode !== "link")) return null;
  const p = row.profile === null ? null : Profile.safeParse(row.profile);
  if (p && !p.success) return null;
  return {
    provider: row.provider,
    mode: row.mode,
    next: row.next,
    result: row.result,
    profile: p ? p.data : null,
  };
}
