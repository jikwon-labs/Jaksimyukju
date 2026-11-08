// 완주 메달 SVG. 화면(React)과 수료 카드(PNG)가 같은 그림을 쓴다
import { TEACHERS } from "@/lib/design/tokens";
import type { TeacherName } from "@/lib/design/types";

export interface MedalInput {
  weeks: number;
  teacher: TeacherName;
  /** 아직 받지 않은 메달(회색) */
  locked?: boolean;
}

interface Metal {
  hi: string;
  mid: string;
  lo: string;
  face0: string;
  face1: string;
  face2: string;
  line: string;
  ink: string;
  glow: string;
}

const GOLD: Metal = {
  hi: "#FBE7A1",
  mid: "#D9A92E",
  lo: "#8F600E",
  face0: "#FFF4CC",
  face1: "#F3CC5A",
  face2: "#D29B22",
  line: "#8A5A0A",
  ink: "#6B4405",
  glow: "#FFF6D6",
};

const GRAY: Metal = {
  hi: "#F4F4F6",
  mid: "#C6C6CE",
  lo: "#8E8E98",
  face0: "#FAFAFB",
  face1: "#E1E1E6",
  face2: "#B4B4BD",
  line: "#85858F",
  ink: "#5A5A63",
  glow: "#FFFFFF",
};

/** 메달 그림의 원래 크기(viewBox) */
export const MEDAL_BOX = { width: 240, height: 300 };

const CX = 120;
const CY = 192;
const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

function n(v: number): string {
  return v.toFixed(1);
}

/** 톱니 테두리: 바깥 100, 안쪽 96을 번갈아 72개 점 */
function edgePoints(): string {
  const pts: string[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r = i % 2 === 0 ? 100 : 96;
    pts.push(`${n(CX + r * Math.cos(a))},${n(CY + r * Math.sin(a))}`);
  }
  return pts.join(" ");
}

/** 월계수 잎: 아래쪽에서 양옆으로 9장씩 */
function leaves(ink: string): string {
  const out: string[] = [];
  for (let k = 0; k < 9; k++) {
    for (const side of [1, -1]) {
      const deg = side === 1 ? 108 + k * 14 : 180 - (108 + k * 14);
      const a = (deg * Math.PI) / 180;
      const x = n(CX + 64 * Math.cos(a));
      const y = n(CY + 64 * Math.sin(a));
      const rot = deg + 90 + 28 * side;
      out.push(`<ellipse cx="${x}" cy="${y}" rx="9" ry="3.6" fill="${ink}" opacity="0.72" transform="rotate(${rot} ${x} ${y})"/>`);
    }
  }
  return out.join("");
}

function weeksOf(v: number): number {
  return Number.isFinite(v) ? Math.min(99, Math.max(1, Math.round(v))) : 6;
}

/**
 * 메달 그림 본문(<svg> 안쪽). id 는 같은 화면에 여러 개가 있어도 겹치지 않게 접두어를 붙인다.
 * 좌표계는 MEDAL_BOX(240x300).
 */
export function medalBody(i: MedalInput, idPrefix = "md"): string {
  const m = i.locked ? GRAY : GOLD;
  const t = TEACHERS[i.teacher];
  const ribbon = i.locked ? { top: "#C9C9D1", bottom: "#A8A8B2", back: "#8E8E98" } : { top: t.body, bottom: t.deep, back: t.deep };
  const id = `${idPrefix}-${i.locked ? "gray" : `gold-${t.slug}`}`;
  const weeks = weeksOf(i.weeks);
  return `<defs>
<linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m.hi}"/><stop offset="0.45" stop-color="${m.mid}"/><stop offset="1" stop-color="${m.lo}"/></linearGradient>
<linearGradient id="${id}-face" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${m.face0}"/><stop offset="0.55" stop-color="${m.face1}"/><stop offset="1" stop-color="${m.face2}"/></linearGradient>
<linearGradient id="${id}-ribbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ribbon.top}"/><stop offset="1" stop-color="${ribbon.bottom}"/></linearGradient>
</defs>
<polygon points="182,0 136,0 96,108 142,108" fill="${ribbon.back}"/>
<polygon points="182,0 136,0 96,108 142,108" fill="#000000" opacity="0.18"/>
<polygon points="58,0 104,0 144,108 98,108" fill="url(#${id}-ribbon)"/>
<polygon points="74,0 86,0 126,108 114,108" fill="#FFFFFF" opacity="0.28"/>
<rect x="86" y="92" width="68" height="20" rx="6" fill="url(#${id}-rim)" stroke="${m.line}" stroke-width="1.2" stroke-opacity="0.6"/>
<polygon points="${edgePoints()}" fill="url(#${id}-rim)"/>
<circle cx="${CX}" cy="${CY}" r="91" fill="url(#${id}-face)" stroke="${m.line}" stroke-width="1.4"/>
<circle cx="${CX}" cy="${CY}" r="85" fill="none" stroke="${m.line}" stroke-width="1.6" stroke-dasharray="0.1 6" stroke-linecap="round" opacity="0.7"/>
<circle cx="${CX}" cy="${CY}" r="80" fill="none" stroke="url(#${id}-rim)" stroke-width="3"/>
<path d="M 52 160 A 76 76 0 0 1 130 116" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
${leaves(m.ink)}
<text x="${CX}" y="152" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="700" letter-spacing="3" fill="${m.ink}">작심육주</text>
<text x="121.5" y="219.5" text-anchor="middle" font-family="${FONT}" font-size="68" font-weight="900" fill="${m.glow}">${weeks}</text>
<text x="${CX}" y="218" text-anchor="middle" font-family="${FONT}" font-size="68" font-weight="900" fill="${m.ink}">${weeks}</text>
<text x="${CX}" y="240" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="2" fill="${m.ink}">완주</text>`;
}

/** 단독 메달 SVG(너비 기준으로 세로는 비율대로) */
export function medalSvg(i: MedalInput, width: number = MEDAL_BOX.width, idPrefix = "md"): string {
  const h = Math.round((width * MEDAL_BOX.height) / MEDAL_BOX.width);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${MEDAL_BOX.width} ${MEDAL_BOX.height}" aria-hidden="true" focusable="false">${medalBody(i, idPrefix)}</svg>`;
}

/** 화면 읽기 프로그램용 이름 */
export function medalLabel(i: MedalInput): string {
  return i.locked ? "아직 받지 않은 완주 메달" : `${weeksOf(i.weeks)}주 과정 완주 메달`;
}

/** YYYY-MM-DD → YYYY.MM.DD */
export function dotDate(day: string): string {
  return day.replaceAll("-", ".");
}

/** 마친 날들 중 가장 늦은 날. 하나도 없으면 fallback */
export function lastDoneDay(days: (string | null | undefined)[], fallback: string): string {
  return days.filter((d): d is string => !!d).sort().pop() ?? fallback;
}
