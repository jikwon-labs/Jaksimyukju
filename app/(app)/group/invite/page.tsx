import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Teacher } from "@/components/teacher/Teacher";
import { BackHeader, Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { GROUP_MAX } from "@/lib/domain/social";
import { prisma } from "@/lib/prisma";
import { getActiveCourse, teacherOf } from "@/lib/server/course";
import { ensureGroup, myMembership } from "@/lib/server/social";
import { VisibilityControl } from "../VisibilityControl.client";
import { InviteLink } from "./InviteLink.client";
import s from "./invite.module.css";

export const metadata = { title: "초대하기 · 작심육주" };

async function originOf(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3100";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function InvitePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!(await getActiveCourse(user.id))) redirect("/start/personality");
  const who = teacherOf(user);
  const group = await ensureGroup(user);
  const count = await prisma.groupMember.count({ where: { groupId: group.id } });
  const me = await myMembership(user.id);
  const visibility = me?.visibility === "grass_topic" ? "grass_topic" : "grass";

  return (
    <Page className={s.page}>
      <BackHeader href="/group" title="같이 할 사람 데려오기" />
      <div className={s.hero}>
        <div className={s.avatars}>
          <Teacher who={who} size={64} jump />
          <span className={s.placeholder} aria-hidden>
            +
          </span>
        </div>
        <p className={s.heroText}>
          혼자보다 둘이 덜 포기해요.
          <br />
          <span>서로의 잔디가 보이고, 쉬는 날엔 콕 찔러 줄 수 있어요.</span>
        </p>
      </div>

      <InviteLink
        origin={await originOf()}
        groupName={group.name}
        count={count}
        max={GROUP_MAX}
        code={group.inviteCode}
        expiresAt={group.inviteExpiresAt.toISOString()}
      >
        <section aria-label="보여 줄 범위" className={s.scope}>
          <h2 className={s.h2}>그룹에 보여 줄 것</h2>
          <VisibilityControl initial={visibility} />
        </section>
      </InviteLink>
    </Page>
  );
}
