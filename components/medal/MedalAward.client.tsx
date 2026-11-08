"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { claimMedalAction } from "@/app/actions/medal";
import type { TeacherName } from "@/lib/design/types";
import { Medal } from "./Medal";
import s from "./medal.module.css";

interface Props {
  courseId: string;
  topic: string;
  weeks: number;
  teacher: TeacherName;
  teacherColor: string;
  line: string;
  period: string; // "2026.09.21 – 2026.11.05"
  cells: number;
}

const GOLD = "#F2C94C";
// 색종이 자리(무대 390 기준 %)와 모양
const BITS = [
  [10, 15],
  [20, 27],
  [6, 39],
  [18, 49],
  [82, 13],
  [90, 25],
  [77, 36],
  [89, 46],
  [33, 11],
  [67, 10],
  [28, 56],
  [72, 56],
  [13, 59],
  [87, 62],
  [49, 8],
  [4, 25],
] as const;
const RAYS = Array.from({ length: 16 }, (_, i) => {
  const a1 = (i / 16) * Math.PI * 2;
  const a2 = a1 + Math.PI / 32;
  const p = (a: number) => `${Math.round(280 + 300 * Math.cos(a))},${Math.round(280 + 300 * Math.sin(a))}`;
  return `280,280 ${p(a1)} ${p(a2)}`;
});

/** 과정을 다 마친 뒤 한 번 뜨는 메달 수여 화면 */
export function MedalAward({ courseId, topic, weeks, teacher, teacherColor, line, period, cells }: Props) {
  const [open, setOpen] = useState(true);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // 버튼 대신 대화상자에 초점을 둬, 열리자마자 버튼에 초점 테두리가 뜨지 않게 한다
    dialog.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function claim() {
    setOpen(false);
    startTransition(async () => {
      await claimMedalAction(courseId);
      if (pathname === "/finish") router.refresh();
      else router.push("/finish");
    });
  }

  const palette = [teacherColor, GOLD, "#FFFFFF", GOLD, teacherColor];
  return (
    <div ref={dialog} tabIndex={-1} className={s.stage} role="dialog" aria-modal="true" aria-labelledby="medal-title" aria-describedby="medal-line" data-testid="medal-award">
      <div className={s.glow} aria-hidden="true" />
      <svg className={s.rays} viewBox="0 0 560 560" aria-hidden="true">
        {RAYS.map((pts) => (
          <polygon key={pts} points={pts} fill={GOLD} opacity="0.07" />
        ))}
      </svg>
      {BITS.map(([x, y], i) => (
        <span
          key={i}
          className={s.bit}
          aria-hidden="true"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: i % 3 === 0 ? 6 : 10,
            height: i % 3 === 0 ? 6 : 4,
            background: palette[i % palette.length],
            rotate: `${(i * 37) % 180}deg`,
            animationDelay: `${0.5 + (i % 5) * 0.08}s`,
          }}
        />
      ))}
      <div className={s.body}>
        <span className={`${s.kicker} ${s.rise}`}>{weeks}주 과정 완주</span>
        <div className={s.drop}>
          <Medal weeks={weeks} teacher={teacher} size={240} />
        </div>
        <div className={`${s.text} ${s.rise}`}>
          <h1 id="medal-title" className={s.title}>
            {topic}
          </h1>
          <p id="medal-line" className={s.line}>
            {line}
          </p>
          <p className={s.meta}>
            {period} · {cells}칸 모두 채움
          </p>
        </div>
        <div className={s.grow} />
        <div className={`${s.actions} ${s.rise}`}>
          <button type="button" className={s.claim} onClick={claim} data-testid="medal-claim">
            메달 받기
          </button>
          <span className={s.hint}>받은 메달은 내 정보의 &apos;내 메달&apos;에 남아요</span>
        </div>
      </div>
    </div>
  );
}
