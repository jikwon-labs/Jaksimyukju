"use client";

import { useEffect } from "react";
import { savePushTokenAction } from "@/app/actions/push";
import { PUSH_TOKEN_EVENT, requestPushToken } from "@/lib/push-bridge";

/**
 * 앱 껍데기 안에서만 동작한다. 껍데기에 기기 토큰을 달라고 하고, 받으면 서버에 저장한다.
 * ask가 false면 이미 허락한 경우에만 토큰을 받는다(권한 창은 첫 레슨을 마친 뒤에 띄운다).
 */
export function PushRegistrar({ ask }: { ask: boolean }) {
  useEffect(() => {
    function onToken(e: Event) {
      const token = (e as CustomEvent<unknown>).detail;
      void savePushTokenAction(token).catch(() => undefined);
    }
    window.addEventListener(PUSH_TOKEN_EVENT, onToken);
    requestPushToken(ask);
    return () => window.removeEventListener(PUSH_TOKEN_EVENT, onToken);
  }, [ask]);
  return null;
}
