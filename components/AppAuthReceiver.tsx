"use client";

import { useEffect } from "react";
import { AUTH_RESULT_EVENT, finishAppAuth, parseAuthResult } from "@/lib/app-auth-bridge";

/** 앱 껍데기가 로그인 결과(1회용 코드나 카카오 토큰)를 넘겨주면 서버에서 마무리한다. 웹에서는 아무 일도 하지 않는다 */
export function AppAuthReceiver() {
  useEffect(() => {
    function onResult(e: Event) {
      const r = parseAuthResult((e as CustomEvent<unknown>).detail);
      if (r) void finishAppAuth(r);
    }
    window.addEventListener(AUTH_RESULT_EVENT, onResult);
    return () => window.removeEventListener(AUTH_RESULT_EVENT, onResult);
  }, []);
  return null;
}
