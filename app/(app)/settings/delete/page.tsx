import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteAccountAction } from "@/app/actions/account";
import { BackHeader, Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { accountLabel } from "@/lib/domain/oauth";
import { prisma } from "@/lib/prisma";
import s from "./delete.module.css";

export const metadata = { title: "계정 삭제 · 작심육주" };

/** 계정 삭제(App Store 5.1.1(v)). 무엇이 지워지는지 보여 주고, 확인 체크 뒤 바로 지운다 */
export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const { error } = await searchParams;
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    select: { provider: true },
  });
  const ownsGroup = (await prisma.group.count({ where: { createdById: user.id } })) > 0;
  return (
    <Page className={s.page}>
      <BackHeader href="/settings" title="계정 삭제" />
      <section aria-labelledby="del-title" className={s.card}>
        <h1 id="del-title" className={s.title}>
          계정을 삭제할까요?
        </h1>
        <p className={s.body}>
          지금 계정: <strong>{accountLabel(accounts, user.email)}</strong>
        </p>
        <p className={s.body}>삭제하면 아래 정보가 바로 지워지고 되돌릴 수 없어요.</p>
        <ul className={s.list}>
          <li>학습 과정, 레슨 기록, 잔디와 연속 기록</li>
          <li>선생님과 나눈 대화, 퀴즈 답, 마일스톤 글, 주간 회고</li>
          <li>그룹 참여 정보, 콕 찌르기와 알림 기록</li>
          <li>연결한 카카오·Google·Apple 계정 정보와 푸시 알림 토큰</li>
        </ul>
        {ownsGroup && (
          <p className={s.body}>
            내가 만든 그룹에 다른 사람이 있으면 그룹은 남고, 가장 먼저 들어온 사람이 이어받아요.
          </p>
        )}
        <p className={s.note}>
          연결한 Apple·카카오 계정의 앱 연결도 함께 끊어요. 법령에 따라 따로 보관해야 하는 정보는
          없어요. 자세한 내용은{" "}
          <Link href="/privacy" className={s.link}>
            개인정보 처리방침
          </Link>
          에 있어요.
        </p>
      </section>

      <form action={deleteAccountAction} className={s.form}>
        <label className={s.check}>
          <input type="checkbox" name="confirm" value="yes" required data-testid="delete-confirm" />
          <span>위 내용을 확인했고, 계정과 모든 기록을 삭제할게요.</span>
        </label>
        {error === "confirm" && (
          <p role="alert" className={s.warn}>
            확인란에 체크해 주세요.
          </p>
        )}
        <button type="submit" className={s.danger} data-testid="delete-submit">
          계정 삭제하기
        </button>
        <Link href="/settings" className={s.cancel}>
          취소
        </Link>
      </form>
    </Page>
  );
}
