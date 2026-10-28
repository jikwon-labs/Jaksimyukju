import type { GrassCell } from "@/lib/domain/rest";
import s from "./course.module.css";

const DAY_LABELS = ["월", "", "수", "", "금", "", "일"];

/** 학습 잔디: 세로 7칸(월~일) x 가로 주 */
export function Grass({
  cols,
  label,
  cell = 20,
  gap = 4,
  labels = true,
}: {
  cols: GrassCell[][];
  label: string;
  cell?: number;
  gap?: number;
  labels?: boolean;
}) {
  return (
    <div className={s.grassWrap}>
      {labels && (
        <div className={s.grassDays} style={{ gridTemplateRows: `repeat(7, ${cell}px)`, rowGap: gap }} aria-hidden>
          {DAY_LABELS.map((d, i) => (
            <span key={i} style={{ lineHeight: `${cell}px` }}>
              {d}
            </span>
          ))}
        </div>
      )}
      <div
        role="img"
        aria-label={label}
        className={s.grass}
        style={{ gridTemplateRows: `repeat(7, ${cell}px)`, gridAutoColumns: `${cell}px`, gap }}
        data-testid="grass"
      >
        {cols.flat().map((c) => {
          const level = c.kind === "level" || c.kind === "today" ? c.level : 0;
          return (
            <span
              key={c.day}
              className={s.cell}
              data-day={c.day}
              data-kind={c.kind}
              data-level={level}
              style={{ borderRadius: cell <= 12 ? 3 : 6 }}
            />
          );
        })}
      </div>
    </div>
  );
}
