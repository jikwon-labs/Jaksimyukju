// 수료 카드 SVG(완주 메달 포함). 브라우저에서 캔버스로 그려 PNG로 저장한다
import { TEACHERS } from "@/lib/design/tokens";
import type { TeacherName } from "@/lib/design/types";
import { medalBody } from "./medal";

export interface CertificateInput {
  name: string;
  topic: string;
  goal: string;
  weeks: number;
  lessons: number;
  longest: number;
  start: string; // YYYY-MM-DD
  end: string;
  teacher: TeacherName;
}

function esc(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function clip(v: string, n: number): string {
  return v.length > n ? `${v.slice(0, n - 1)}…` : v;
}

const W = 1080;
const H = 1350;

/** 1080x1350(인스타 세로) 수료 카드 */
export function certificateSvg(i: CertificateInput): string {
  const t = TEACHERS[i.teacher];
  const font = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
  // 위쪽 가운데에 완주 메달(276x345)
  const medal = `<g transform="translate(402 150) scale(1.15)">${medalBody({ weeks: i.weeks, teacher: i.teacher }, "cert")}</g>`;
  const stat = (x: number, label: string, value: string) =>
    `<text x="${x}" y="1010" text-anchor="middle" font-family="${font}" font-size="30" fill="#63636B">${esc(label)}</text>
<text x="${x}" y="1075" text-anchor="middle" font-family="${font}" font-size="56" font-weight="700" fill="${t.deep}">${esc(value)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#FFFFFF"/>
<rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="56" fill="${t.tint}"/>
${medal}
<text x="540" y="560" text-anchor="middle" font-family="${font}" font-size="40" font-weight="700" fill="${t.deep}">작심육주 수료</text>
<text x="540" y="660" text-anchor="middle" font-family="${font}" font-size="72" font-weight="700" fill="#111113">${esc(clip(i.topic, 14))}</text>
<text x="540" y="740" text-anchor="middle" font-family="${font}" font-size="34" fill="#111113">${esc(clip(i.goal, 26))}</text>
<text x="540" y="830" text-anchor="middle" font-family="${font}" font-size="32" fill="#63636B">${esc(i.name)} · ${esc(i.start)} ~ ${esc(i.end)}</text>
${stat(250, "기간", `${i.weeks}주`)}
${stat(540, "레슨", `${i.lessons}개`)}
${stat(830, "최장 연속", `${i.longest}일`)}
<text x="540" y="1230" text-anchor="middle" font-family="${font}" font-size="30" fill="#63636B">작심삼일, 이번엔 끝까지. · ${esc(i.teacher)} 선생님과 함께</text>
</svg>`;
}

export const CERT_SIZE = { width: W, height: H };
