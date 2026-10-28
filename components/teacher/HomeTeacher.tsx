import type { TeacherName } from "@/lib/design/types";
import { Teacher } from "./Teacher";
import s from "./HomeTeacher.module.css";

/** 홈 오늘 할 일 카드 위로 고개를 내민 선생님. 라이트는 가끔 선글라스, 다크는 깜빡이는 손전등 */
export function HomeTeacher({ who }: { who: TeacherName }) {
  const before = (
    <>
      <defs>
        <linearGradient id="sl-beam-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF4C2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFF4C2" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon className={`sl-beam ${s.flash}`} points="104,96 118,96 150,250 50,250" fill="url(#sl-beam-fill)" data-fx="beam" />
      <path className="sl-arm-l" d="M22 62 C10 56 8 44 14 38" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <g className="sl-arm-r">
        <path d="M98 64 C110 66 114 74 110 82" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
        <g className={`sl-flash ${s.flash}`} data-fx="flashlight">
          <rect x="103" y="80" width="14" height="18" rx="3" fill="#3A3A42" stroke="var(--ink)" strokeWidth="1.5" />
          <rect x="101" y="94" width="18" height="5" rx="2" fill="#6B6A55" />
          <rect className="sl-bulb" x="101" y="94" width="18" height="5" rx="2" fill="#FFE27A" />
        </g>
      </g>
    </>
  );
  const glasses = (
    <g className={`sl-glasses ${s.glasses}`} data-fx="sunglasses">
      <path d="M33 47 L22 44" stroke="#1C1B19" strokeWidth="3" strokeLinecap="round" />
      <path d="M87 47 L98 44" stroke="#1C1B19" strokeWidth="3" strokeLinecap="round" />
      <rect x="33" y="40" width="26" height="23" rx="9" fill="#1C1B19" />
      <rect x="61" y="40" width="26" height="23" rx="9" fill="#1C1B19" />
      <path d="M57 47 Q60 44 63 47" fill="none" stroke="#1C1B19" strokeWidth="3.5" />
      <path d="M38 46 L45 44" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
      <path d="M66 46 L73 44" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
    </g>
  );
  return (
    <Teacher
      who={who}
      size={96}
      jump
      decorative
      before={before}
      extraFace={glasses}
      className={s.peek}
    />
  );
}
