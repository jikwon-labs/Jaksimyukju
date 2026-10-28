"use client";

import { useState } from "react";
import s from "./resource.module.css";

export function ResourceButtons({ url }: { url: string }) {
  const [read, setRead] = useState(false);
  const [reported, setReported] = useState(false);
  return (
    <>
      <div className={s.buttons}>
        <button
          type="button"
          aria-pressed={read}
          className={s.read}
          data-read={read ? "true" : "false"}
          onClick={() => setRead(!read)}
        >
          {read ? "다 읽었어요" : "읽음 표시"}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className={s.open} data-testid="resource-open">
          원문 열기
        </a>
      </div>
      <div className={s.reportRow}>
        {reported ? (
          <p role="status" className={s.reported}>
            알려 줘서 고마워요. 이 자료는 다시 확인해 볼게요.
          </p>
        ) : (
          <button type="button" className={s.report} onClick={() => setReported(true)}>
            자료가 이상해요
          </button>
        )}
      </div>
    </>
  );
}
