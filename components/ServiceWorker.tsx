"use client";

import { useEffect } from "react";

/** 운영 빌드에서만 서비스 워커를 등록한다(개발 모드의 HMR과 섞이지 않게) */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
