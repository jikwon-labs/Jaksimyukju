import type { ReactNode } from "react";
import { FACES } from "@/lib/design/faces";
import { FACE_INK } from "@/lib/design/tokens";
import type { FaceState, TeacherName } from "@/lib/design/types";

export const SMALL_SIZE = 40;

export interface TeacherProps {
  who: TeacherName;
  state?: FaceState;
  /** 가로 폭(px). 세로는 viewBox 비율(120x110)로 정한다 */
  size?: number;
  jump?: boolean;
  /** 얼굴(ci-look) 안쪽 맨 끝에 붙는 장식. 예: 선글라스 */
  extraFace?: ReactNode;
  /** 몸 앞에 그리는 장식. 예: 팔, 손전등 */
  before?: ReactNode;
  label?: string;
  decorative?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 동그라미 선생님. 목업 circle_face.py의 inner()를 그대로 옮겼다.
 * 40px 이하에서는 하이라이트와 볼을 빼고 눈·눈썹 선을 굵게 한다.
 */
export function Teacher({
  who,
  state = "base",
  size = 120,
  jump = false,
  extraFace,
  before,
  label,
  decorative = false,
  className,
  style,
}: TeacherProps) {
  const f = FACES[who][state] ?? FACES[who].base;
  const small = size <= SMALL_SIZE;
  const height = Math.round((size * 110) / 120);
  const a11y = decorative
    ? { "aria-hidden": true as const }
    : { role: "img" as const, "aria-label": label ?? `${who} 선생님` };
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 120 110"
      className={className}
      style={{ overflow: "visible", flex: "none", ...style }}
      data-teacher-face={`${who}-${state}`}
      data-small={small ? "true" : undefined}
      {...a11y}
    >
      {before}
      <g className={jump ? "ci-jump" : undefined}>
        <g transform={f.pose || undefined}>
          <g className={f.move}>
            <circle cx="60" cy="58" r="38" fill={f.body} />
            <path
              d="M23.3 68 A38 38 0 0 0 96.7 68 A44 22 0 0 1 23.3 68 Z"
              fill={f.deep}
              opacity="0.22"
            />
            {!small && (
              <ellipse
                cx="45"
                cy="36"
                rx="9"
                ry="5.5"
                fill="#FFFFFF"
                opacity="0.3"
                transform="rotate(-25 45 36)"
              />
            )}
            <g className="ci-look">
              {!small && f.cheek && <path d={f.cheek} fill="#FF9FB8" opacity="0.75" data-part="cheek" />}
              {f.brow && (
                <path
                  d={f.brow}
                  fill="none"
                  stroke={FACE_INK}
                  strokeWidth={small ? 3.4 : 2.7}
                  strokeLinecap="round"
                  data-part="brow"
                />
              )}
              <g className="ci-blink">
                {f.eye && <path d={f.eye} fill={FACE_INK} data-part="eye" />}
                {!small && f.shine && <path d={f.shine} fill="#FFFFFF" data-part="shine" />}
              </g>
              {f.lid && (
                <path
                  d={f.lid}
                  fill="none"
                  stroke={FACE_INK}
                  strokeWidth={small ? 3 : 2.4}
                  strokeLinecap="round"
                  data-part="lid"
                />
              )}
              <path
                d={f.mouth}
                fill={f.mouthFill}
                stroke={FACE_INK}
                strokeWidth={small ? 2.8 : 2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                data-part="mouth"
              />
              {f.tear && <path d={f.tear} fill="#BFD7FF" data-part="tear" />}
              {extraFace}
            </g>
          </g>
          {f.dots !== "none" && (
            <g className="ci-dots" data-part="dots">
              <circle cx="96" cy="24" r="3.2" fill={f.deep} />
              <circle cx="104" cy="16" r="2.4" fill={f.deep} />
              <circle cx="110" cy="9" r="1.7" fill={f.deep} />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
