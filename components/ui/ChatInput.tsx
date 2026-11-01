"use client";
// 채팅 입력칸. 키보드가 있는 화면에서는 Enter로 보내고 Shift+Enter로 줄을 바꾼다.
// 터치 화면의 키보드에는 Shift가 없어서 Enter(return)는 줄바꿈이고 보내기는 버튼으로 한다.
import { useLayoutEffect, useRef, type ComponentProps, type KeyboardEvent, type Ref } from "react";

type Props = Omit<ComponentProps<"textarea">, "rows" | "ref"> & {
  value: string;
  ref?: Ref<HTMLTextAreaElement>;
  /** 이 높이를 넘으면 칸 안에서 스크롤한다 */
  maxHeight?: number;
};

export function ChatInput({ ref, value, maxHeight = 120, onKeyDown, style, ...rest }: Props) {
  const own = useRef<HTMLTextAreaElement>(null);

  // 글이 늘면 칸도 늘린다(최대 maxHeight)
  useLayoutEffect(() => {
    const el = own.current;
    if (!el) return;
    el.style.height = "auto";
    // scrollHeight에는 테두리가 빠져 있어서 더한다
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${Math.min(el.scrollHeight + border, maxHeight)}px`;
  }, [value, maxHeight]);

  function keyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.key !== "Enter" || e.shiftKey) return;
    // 한글 조합 중인 Enter는 글자를 확정하는 키라서 보내지 않는다
    if (e.nativeEvent.isComposing) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    e.preventDefault();
    e.currentTarget.form?.requestSubmit();
  }

  return (
    <textarea
      {...rest}
      ref={(el) => {
        own.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      rows={1}
      value={value}
      onKeyDown={keyDown}
      style={{ resize: "none", overflowY: "auto", ...style }}
    />
  );
}
