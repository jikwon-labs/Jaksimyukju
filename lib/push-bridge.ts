// 웹과 앱 껍데기 사이의 푸시 토큰 약속. 앱 쪽은 mobile/bridge.ts
// 1) 웹 -> 앱: { type: PUSH_REGISTER, ask } . ask가 true면 아직 묻지 않은 알림 권한을 묻는다
// 2) 앱 -> 웹: window에 PUSH_TOKEN_EVENT(CustomEvent, detail = Expo 토큰)를 쏜다
import { nativeBridge } from "./external";

export const PUSH_REGISTER = "push-register";
export const PUSH_TOKEN_EVENT = "j6-push-token";

/** 앱 안이면 토큰을 달라고 보내고 true, 웹이면 false */
export function requestPushToken(ask: boolean, win: object = window): boolean {
  const bridge = nativeBridge(win);
  if (!bridge) return false;
  bridge.postMessage(JSON.stringify({ type: PUSH_REGISTER, ask }));
  return true;
}
