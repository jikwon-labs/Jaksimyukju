import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { markAllReadAction, openNotificationAction } from "@/app/actions/social";
import { Teacher } from "@/components/teacher/Teacher";
import { BackHeader, Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getToday, TIME_ZONE } from "@/lib/clock";
import { groupByDay, notifIcon, notifTimeLabel, type NotifIcon } from "@/lib/domain/social";
import { prisma } from "@/lib/prisma";
import { teacherOf } from "@/lib/server/course";
import s from "./notifications.module.css";

export const metadata = { title: "알림 · 작심육주" };

const ICONS: Record<NotifIcon, ReactNode> = {
  poke: <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4.5a1.5 1.5 0 0 1 3 0v7M14 11.5v-5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.8-2.4L3.6 14a1.5 1.5 0 0 1 2.4-1.8L8 14" />,
  bell: <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2 2 0 0 0 4 0" />,
  fire: <path d="M12 21c-3.9 0-7-2.8-7-6.6 0-3.4 2.5-5.4 3.6-8.4.4 1.8 1.3 3 2.6 3.6C11 6.8 12.6 4.3 15 3c-.4 2.8.8 4.6 2.2 6.3 1.1 1.4 1.8 3 1.8 5.1 0 3.8-3.1 6.6-7 6.6z" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  users: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 1 0 0-5M16 14.2c2.8.3 5 2.6 5 5.8" />,
  route: <path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" />,
  repeat: <path d="M17 2l4 4-4 4M3 11V10a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" />,
  book: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />,
};

function Gear() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const who = teacherOf(user);
  const today = await getToday();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const unread = items.filter((i) => !i.readAt).length;
  const groups = groupByDay(items, today, TIME_ZONE);

  const right = (
    <div className={s.right}>
      {unread > 0 && (
        <form action={markAllReadAction}>
          <button type="submit" className={s.readAll} data-testid="mark-all-read">
            모두 읽음
          </button>
        </form>
      )}
      <Link href="/settings" aria-label="알림 설정" className={s.gear}>
        <Gear />
      </Link>
    </div>
  );

  return (
    <Page className={s.page}>
      <BackHeader href="/home" title="알림" right={right} />
      <span className={s.srOnly} role="status" aria-live="polite">
        {unread > 0 ? `읽지 않은 알림 ${unread}개` : "모두 읽었어요"}
      </span>

      {groups.length === 0 ? (
        <section className={s.empty} aria-label="알림 없음" data-testid="notif-empty">
          <Teacher who={who} state="base" size={96} jump />
          <h2>아직 알림이 없어요</h2>
          <p>콕 찌르기, 선생님 알림, 복습, 그룹 소식이 오면 여기에 모여요.</p>
        </section>
      ) : (
        groups.map((g) => (
          <section key={g.label} aria-label={g.label} className={s.group}>
            <h2 className={s.groupLabel}>{g.label}</h2>
            {g.items.map((n) => {
              const icon = notifIcon(n.kind);
              const hotKind = n.kind === "nudge";
              const isUnread = !n.readAt;
              return (
                <form key={n.id} action={openNotificationAction}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className={s.item}
                    data-testid="notif-item"
                    data-kind={n.kind}
                    data-hot={hotKind && isUnread ? "true" : "false"}
                    data-unread={isUnread ? "true" : "false"}
                  >
                    <span className={s.icon} data-hot={hotKind ? "true" : "false"}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        {ICONS[icon]}
                      </svg>
                    </span>
                    <span className={s.text}>
                      <span className={s.titleRow}>
                        <span className={s.title}>{n.title}</span>
                        <span className={s.time}>{notifTimeLabel(n.createdAt, today, TIME_ZONE)}</span>
                      </span>
                      <span className={s.body}>{n.body}</span>
                      {hotKind && <span className={s.action}>지금 5분 하기</span>}
                    </span>
                    {isUnread && <span className={s.dot} aria-label="읽지 않음" role="img" />}
                  </button>
                </form>
              );
            })}
          </section>
        ))
      )}

      <p className={s.foot}>알림은 하루 최대 2번. 밤 11시부터 아침 7시까지는 보내지 않아요.</p>
    </Page>
  );
}
