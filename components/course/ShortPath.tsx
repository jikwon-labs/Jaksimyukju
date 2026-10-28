import Link from "next/link";
import type { Step } from "@/lib/domain/course";
import s from "./course.module.css";

export const STEP_ICONS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  book: "M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  quiz: "M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3 M12 18v.2",
  flag: "M6 21V4 M6 4h11l-2 4 2 4H6",
  lock: "M8 11V8a4 4 0 0 1 8 0v3 M6 11h12v9H6z",
};

export function stepIcon(st: Step): keyof typeof STEP_ICONS {
  if (st.state === "done" || st.state === "five") return "check";
  if (st.state === "today") return "star";
  if (st.state === "lock") return "lock";
  return st.kind === "quiz" ? "quiz" : st.kind === "goal" ? "flag" : "book";
}

/** 홈 오늘 할 일 카드의 다섯 칸짜리 짧은 길 */
export function ShortPath({ steps, label }: { steps: Step[]; label: string }) {
  const doneCount = steps.filter((x) => x.state === "done" || x.state === "five").length;
  const progress = steps.length > 1 ? Math.min(1, doneCount / (steps.length - 1)) : 0;
  return (
    <Link href="/curriculum" aria-label={label} className={s.path}>
      <span className={s.pathTrack} />
      <span className={s.pathFill} style={{ width: `calc((100% - 28px) * ${progress})` }} />
      {steps.map((st) => {
        const icon = st.kind === "quiz" && st.state === "todo" ? "quiz" : st.kind === "goal" && st.state !== "done" ? "flag" : stepIcon(st);
        const today = st.state === "today";
        return (
          <span key={st.id} className={s.pathNode} data-state={st.state} data-testid={`path-${st.state}`}>
            {today && <span className={`${s.pathPulse} mp-pulse`} />}
            <svg width={today ? 18 : 14} height={today ? 18 : 14} viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={STEP_ICONS[icon]} />
            </svg>
          </span>
        );
      })}
    </Link>
  );
}
