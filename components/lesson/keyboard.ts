"use client";
// iOS는 키보드가 올라와도 창 높이를 줄이지 않고 페이지를 통째로 밀어 올린다.
// 채팅 화면을 지금 보이는 영역(visualViewport)에 맞춰 머리와 입력칸이 함께 보이게 한다
import { type RefObject, useEffect, useEffectEvent } from "react";

/** 창 높이와 보이는 높이가 이만큼 넘게 차이 나면 키보드가 떠 있다고 본다 */
const KEYBOARD_MIN = 120;

export function useFitToKeyboard(ref: RefObject<HTMLElement | null>, onFit?: () => void) {
  const fitted = useEffectEvent(() => onFit?.());

  useEffect(() => {
    const el = ref.current;
    const vv = window.visualViewport;
    const root = document.documentElement;
    // 대화 끝에서 더 밀어도 페이지 전체가 튕기지 않게 한다
    const prev = root.style.overscrollBehavior;
    root.style.overscrollBehavior = "none";
    if (!el || !vv) return () => void (root.style.overscrollBehavior = prev);

    const fit = () => {
      el.style.setProperty("--vv-height", `${vv.height}px`);
      el.style.setProperty("--vv-top", `${vv.offsetTop}px`);
      el.dataset.keyboard = window.innerHeight - vv.height > KEYBOARD_MIN ? "open" : "closed";
      fitted();
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      root.style.overscrollBehavior = prev;
    };
  }, [ref]);
}
