import Link from "next/link";
import { Teacher } from "@/components/teacher/Teacher";
import type { TeacherName } from "@/lib/design/types";
import s from "./curriculum.module.css";

/** 아직 열리지 않은 주차의 퀴즈·마일스톤에 들어왔을 때 */
export function LockedWeek({
  who,
  title,
  week,
  currentWeek,
  what,
}: {
  who: TeacherName;
  title: string;
  week: number;
  currentWeek: number;
  what: "퀴즈" | "마일스톤";
}) {
  return (
    <main className={s.locked}>
      <header className={s.lockedHeader}>
        <Link href="/curriculum" aria-label="커리큘럼으로 돌아가기" className={s.back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <span className={s.lockedTitle}>{title}</span>
      </header>
      <div className={s.lockedBody} data-testid="week-locked">
        <Teacher who={who} state="think" size={120} jump />
        <span className={s.lockedTag}>잠김</span>
        <h1>{week}주차 {what}는 아직 열리지 않았어요</h1>
        <p>
          지금은 {currentWeek}주차를 걷는 중이에요. 앞 칸을 마치면 열려요.
        </p>
      </div>
      <Link href="/curriculum" className={s.lockedCta}>
        커리큘럼으로 돌아가기
      </Link>
    </main>
  );
}
