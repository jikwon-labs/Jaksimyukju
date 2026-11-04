"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./ui.module.css";

const TABS = [
  {
    href: "/home",
    label: "오늘",
    icon: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/curriculum",
    label: "커리큘럼",
    icon: (
      <>
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
        <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
      </>
    ),
  },
  {
    href: "/group",
    label: "그룹",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16 14.2c2.8.3 5 2.6 5 5.8" />
      </>
    ),
  },
  {
    href: "/profile",
    label: "내 정보",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </>
    ),
  },
];

function Icon({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const EXTRA = [
  {
    href: "/notifications",
    label: "알림",
    icon: (
      <>
        <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
  },
  {
    href: "/settings",
    label: "설정",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </>
    ),
  },
];

/** 지금 주소가 어느 메뉴에 속하는지. 레슨·퀴즈처럼 오늘 할 일에서 들어가는 화면은 "오늘"에 둔다 */
export function sectionOf(path: string): string {
  const hit = [...TABS, ...EXTRA].find((t) => path === t.href || path.startsWith(t.href + "/"));
  if (hit) return hit.href;
  if (path.startsWith("/invite")) return "/group";
  return "/home";
}

/** PC 왼쪽 메뉴. 로그인한 화면 전부에 뜨고 폰·태블릿에서는 숨는다(ui.module.css .side) */
export function SideNav({ unread }: { unread: number }) {
  const current = sectionOf(usePathname());
  const item = (t: (typeof TABS)[number]) => {
    const active = current === t.href;
    return (
      <Link key={t.href} href={t.href} className={s.sideItem} aria-current={active ? "page" : undefined}>
        <Icon active={active}>{t.icon}</Icon>
        {t.label}
        {t.href === "/notifications" && unread > 0 && (
          <span className={s.sideDot} aria-label={`안 읽은 알림 ${unread}개`}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    );
  };
  return (
    <nav aria-label="주요 메뉴" className={s.side}>
      <Link href="/home" className={s.brand}>
        작심육주
      </Link>
      {TABS.map(item)}
      <span className={s.sideGap} />
      {EXTRA.map(item)}
    </nav>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="하단 탭" className={s.tabs}>
      {TABS.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={s.tab}
            aria-current={active ? "page" : undefined}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {t.icon}
            </svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
