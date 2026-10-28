import { quizChart, quizChartLabel } from "@/lib/domain/prefs";
import s from "./profile.module.css";

const W = 310;
const PLOT = 120;
const PAD = 16;
const H = PLOT + 22;

/** 주차별 퀴즈 % 꺾은선. 내 정보에서만 보이고 그룹에는 내보내지 않는다 */
export function QuizChart({ values }: { values: (number | null)[] }) {
  const c = quizChart(values, W, PLOT, PAD);
  return (
    <svg
      role="img"
      aria-label={quizChartLabel(values)}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className={s.chart}
      data-testid="quiz-chart"
    >
      {[0, 50, 100].map((v) => {
        const y = PAD + (1 - v / 100) * (PLOT - PAD * 2);
        return <line key={v} x1={0} x2={W} y1={y} y2={y} className={s.gridLine} />;
      })}
      {c.xs.map((x, i) =>
        values[i] === null ? <circle key={i} cx={x} cy={PLOT - PAD} r={4} className={s.emptyDot} /> : null,
      )}
      {c.points.length > 1 && <path d={c.path} className={s.line} />}
      {c.points.map((p) => (
        <g key={p.week}>
          <circle cx={p.x} cy={p.y} r={5} className={s.dot} />
          <text x={p.x} y={Math.max(11, p.y - 10)} textAnchor="middle" className={s.dotLabel}>
            {p.value}점
          </text>
        </g>
      ))}
      {c.xs.map((x, i) => (
        <text key={i} x={x} y={H - 4} textAnchor="middle" className={s.axisLabel}>
          {i + 1}주
        </text>
      ))}
    </svg>
  );
}
