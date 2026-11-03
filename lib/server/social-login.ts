import "server-only";
// 소셜 로그인·연결의 마지막 단계. 웹 콜백, 앱의 1회용 코드, 앱의 카카오 SDK 토큰이 모두 여기로 모인다
import { findSocialUser, getSessionUser, linkSocial, signIn } from "@/lib/auth";
import type { OAuthMode, ProviderId, SocialProfile } from "@/lib/domain/oauth";
import { prisma } from "@/lib/prisma";

/** 결과: 로그인은 ok | none, 연결은 linked | already | taken | other, 공통 실패는 failed */
export async function finishSocial(
  provider: ProviderId,
  profile: SocialProfile,
  mode: OAuthMode,
): Promise<string> {
  if (mode === "link") {
    const me = await getSessionUser();
    if (!me) return "failed";
    return linkSocial(me.id, provider, profile);
  }
  const user = await findSocialUser(provider, profile.sub);
  if (!user) return "none";
  // Apple은 로그인할 때마다 새 refresh token을 준다. 탈퇴 때 철회할 수 있게 마지막 것을 둔다
  if (profile.revokeToken) {
    await prisma.account.updateMany({
      where: { provider, providerUserId: profile.sub },
      data: { revokeToken: profile.revokeToken },
    });
  }
  await signIn(user);
  return "ok";
}
