import "server-only";
// 계정 삭제(App Store 5.1.1(v), 개인정보 보호법의 파기). 사용자 행을 지우면 과정·기록·알림·세션·소셜 연결이 함께 지워진다(schema의 onDelete: Cascade)
import { prisma } from "@/lib/prisma";
import { revokeApple, unlinkKakao } from "./oauth";

export interface DeleteReport {
  /** 공급자 쪽 연결 끊기 결과. 실패해도 우리 쪽 삭제는 끝까지 한다 */
  revoked: { provider: string; ok: boolean }[];
}

/**
 * 사용자와 그 기록을 모두 지운다.
 * 1) 소셜 연결을 공급자 쪽에서도 끊는다: Apple은 토큰 철회(Sign in with Apple 요구 사항), 카카오는 어드민 키가 있으면 연결 끊기
 * 2) 내가 만든 그룹에 다른 사람이 남아 있으면 가장 먼저 들어온 사람에게 넘긴다(그룹이 통째로 사라지지 않게)
 * 3) 사용자 행을 지운다
 */
export async function deleteAccount(userId: string): Promise<DeleteReport> {
  const accounts = await prisma.account.findMany({ where: { userId } });
  const revoked: DeleteReport["revoked"] = [];
  for (const a of accounts) {
    let ok = false;
    try {
      if (a.provider === "apple" && a.revokeToken) ok = await revokeApple(a.revokeToken);
      else if (a.provider === "kakao") ok = await unlinkKakao(a.providerUserId);
    } catch (e) {
      console.error(
        "account delete: revoke failed",
        a.provider,
        e instanceof Error ? e.message : e,
      );
    }
    revoked.push({ provider: a.provider, ok });
  }

  await prisma.$transaction(async (tx) => {
    const groups = await tx.group.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    for (const g of groups) {
      const heir = await tx.groupMember.findFirst({
        where: { groupId: g.id, userId: { not: userId } },
        orderBy: { joinedAt: "asc" },
        select: { userId: true },
      });
      if (heir) await tx.group.update({ where: { id: g.id }, data: { createdById: heir.userId } });
    }
    await tx.user.delete({ where: { id: userId } });
  });
  return { revoked };
}
