"use client";

import { useState, useTransition } from "react";
import { setVisibilityAction } from "@/app/actions/social";
import { ro } from "@/lib/domain/josa";
import s from "./visibility.module.css";

type V = "grass" | "grass_topic";

const OPTIONS: { v: V; id: string; title: string; desc: string }[] = [
  { v: "grass", id: "visibility-grass", title: "잔디만", desc: "날짜별로 했는지만 보여요" },
  { v: "grass_topic", id: "visibility-topic", title: "잔디와 주제", desc: "무엇을 배우는지도 보여요" },
];

/** 내 공개 범위. 누르면 바로 저장한다 */
export function VisibilityControl({ initial }: { initial: V }) {
  const [v, setV] = useState<V>(initial);
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();
  return (
    <>
      <div role="radiogroup" aria-label="그룹에 보여 줄 것" className={s.group}>
        {OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={v === o.v}
            data-testid={o.id}
            className={s.option}
            onClick={() => {
              if (v === o.v) return;
              setV(o.v);
              start(async () => {
                const r = await setVisibilityAction(o.v);
                setMsg(r.ok ? `${ro(o.title)} 바꿨어요` : "저장하지 못했어요. 다시 눌러 주세요");
              });
            }}
          >
            <span className={s.title}>{o.title}</span>
            <span className={s.desc}>{o.desc}</span>
          </button>
        ))}
      </div>
      <span role="status" aria-live="polite" className={s.status}>
        {msg}
      </span>
    </>
  );
}
