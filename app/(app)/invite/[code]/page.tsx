import Link from "next/link";
import { cookies } from "next/headers";
import { Teacher } from "@/components/teacher/Teacher";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { parseTeacher, TEACHER_COOKIE } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { getActiveCourse, teacherOf } from "@/lib/server/course";
import { lookupInvite } from "@/lib/server/social";
import { JoinButton } from "./JoinButton.client";
import s from "./receive.module.css";

export const metadata = { title: "초대 받음 · 작심육주" };

function Check({ ok }: { ok: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={ok ? s.iconGood : s.iconNo}>
      {ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M18 6L6 18M6 6l12 12" />}
    </svg>
  );
}

export default async function InviteReceivePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw);
  const user = await getSessionUser();
  const who = user ? teacherOf(user) : parseTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  const today = await getToday();
  const inv = await lookupInvite(code, today);

  if (!inv.ok) {
    return (
      <main className={s.page} data-testid="invite-error">
        <div className={s.center}>
          <Teacher who={who} state="sad" size={120} jump label={`${who} 선생님, 초대 링크 오류`} />
          <span className={s.tag}>{inv.reason === "expired" ? "만료된 링크" : "없는 링크"}</span>
          <h1 className={s.title}>{inv.reason === "expired" ? "초대 링크가 만료됐어요" : "열 수 없는 초대 링크예요"}</h1>
          <p className={s.sub}>
            {inv.reason === "expired"
              ? "초대 링크는 7일 동안만 열려요. 초대한 사람에게 새 링크를 부탁해 주세요."
              : "주소가 잘못됐거나 새 링크로 바뀌었어요. 초대한 사람에게 다시 받아 주세요."}
          </p>
        </div>
        <Link href={user ? "/home" : "/"} className={s.primary}>
          {user ? "홈으로" : "처음 화면으로"}
        </Link>
      </main>
    );
  }

  const isMember = user ? inv.members.some((m) => m.id === user.id) : false;
  const hasCourse = user ? !!(await getActiveCourse(user.id)) : false;
  const otherGroup =
    user && !isMember ? await prisma.groupMember.findFirst({ where: { userId: user.id }, include: { group: true } }) : null;
  const shown = inv.members.slice(0, 4);

  return (
    <main className={s.page}>
      <div className={s.center}>
        <div className={s.avatars}>
          {shown.map((m) => (
            <span key={m.id} className={s.avatar}>
              <Teacher who={m.teacher} size={64} jump label={`${m.name}님의 ${m.teacher} 선생님`} />
              <span className={s.avatarName}>{m.name}</span>
            </span>
          ))}
          {!isMember && (
            <span className={s.avatar}>
              <Teacher who={who} state="listen" size={64} jump label="나의 선생님" />
              <span className={s.avatarName}>나?</span>
            </span>
          )}
        </div>
        <div className={s.text}>
          <span className={s.sub}>{inv.inviter}님이 초대했어요</span>
          <h1 className={s.groupName} data-testid="invite-group-name">
            {inv.group.name}
          </h1>
          <span className={s.sub}>
            {inv.members.length}명 · 이번 주 함께 채운 잔디 {inv.weekCells}칸
          </span>
        </div>
        <section aria-label="참여하면" className={s.rules}>
          <p>
            <Check ok />
            서로의 학습 잔디와 연속 기록이 보여요
          </p>
          <p>
            <Check ok />
            쉬는 날엔 하루 한 번 콕 찔러 줄 수 있어요
          </p>
          <p>
            <Check ok={false} />
            튜터 대화, 퀴즈 점수, 마일스톤 내용은 보이지 않아요
          </p>
          <p className={s.ruleNote}>주제는 참여한 뒤 그룹 화면에서 &quot;잔디와 주제&quot;를 고를 때만 보여요.</p>
        </section>
        {otherGroup && (
          <p className={s.warn}>지금 있는 {otherGroup.group.name}에서는 나오고 이 그룹으로 옮겨요.</p>
        )}
      </div>
      {isMember ? (
        <Link href="/group" className={s.primary}>
          이미 함께하고 있어요 · 그룹 보기
        </Link>
      ) : inv.full ? (
        <p className={s.warn}>이 그룹은 자리가 다 찼어요.</p>
      ) : (
        <JoinButton code={inv.group.code} label={hasCourse ? "참여하기" : "참여하고 내 선생님 고르기"} />
      )}
      <Link href={user ? "/home" : "/"} className={s.secondary}>
        나중에 할게요
      </Link>
    </main>
  );
}
