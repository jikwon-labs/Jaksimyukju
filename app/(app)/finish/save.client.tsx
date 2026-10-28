"use client";

import { useState } from "react";
import s from "./finish.module.css";

/** 수료 카드 저장(한 번 누르면 저장됨 상태로 남는다) */
export function SaveCard() {
  const [saved, setSaved] = useState(false);
  return (
    <button type="button" className={s.save} data-saved={saved ? "true" : "false"} onClick={() => setSaved(true)} aria-live="polite">
      {saved ? "수료 카드를 사진첩에 저장했어요" : "수료 카드 저장하기"}
    </button>
  );
}
