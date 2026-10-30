import type { CSSProperties } from "react";
import type { GrassCell } from "@/lib/domain/rest";
import s from "./course.module.css";

const DAY_LABELS = ["월", "", "수", "", "금", "", "일"];

/** 요일 글자 칸(12px)과 그 옆 간격(6px) */
const LABEL_SPACE = 18;

/**
 * 학습 잔디: 세로 7칸(월~일) x 가로 주. 칸은 cell 크기가 최대이고, 주가 많아 자리가 모자라면
 * 칸을 줄여 폭 안에 맞춘다(12주 과정을 좁은 폰에서 볼 때)
 */
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
  const n = Math.max(cols.length, 1);
  const label0 = labels ? LABEL_SPACE : 0;
  const vars: Record<string, string> = {
    "--n": String(n),
    "--cell-max": `${cell}px`,
    "--gap": `${gap}px`,
    "--labels": `${label0}px`,
    width: `${label0 + n * cell + (n - 1) * gap}px`,
  };
  return (
    <div className={s.grassWrap} style={vars as CSSProperties}>
      {labels && (
        <div className={s.grassDays} style={{ rowGap: gap }} aria-hidden>
          {DAY_LABELS.map((d, i) => (
            <span key={i}>
              {d}
            </span>
          ))}
        </div>
      )}
      <div
        role="img"
        aria-label={label}
        className={s.grass}
        style={{ gap }}
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
