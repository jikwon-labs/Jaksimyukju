"use client";

import { useEffect } from "react";
import { syncWidget, WIDGET_REFRESH_EVENT } from "@/lib/widget-bridge";

/**
 * 앱 껍데기 안에서만 동작한다. 화면이 열릴 때와 앱이 다시 앞으로 올 때 홈 화면 위젯 요약을 껍데기에 넘긴다.
 * 홈(앱 진입), 레슨 완료, 시작 화면(로그아웃 뒤)에 둔다
 */
export function WidgetSync() {
  useEffect(() => {
    const run = () => void syncWidget();
    run();
    window.addEventListener(WIDGET_REFRESH_EVENT, run);
    return () => window.removeEventListener(WIDGET_REFRESH_EVENT, run);
  }, []);
  return null;
}
