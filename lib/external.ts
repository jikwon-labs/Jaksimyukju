// 바깥 링크(자료 원문 등)를 여는 곳을 한데 모은다.
// 웹에서는 새 탭으로 연다. 앱(웹 화면을 감싼 Expo 껍데기)에서는 껍데기에 URL을 넘겨 인앱 브라우저로 열게 한다.
// 추측: 껍데기는 react-native-webview로 이 웹을 띄우고, onMessage에서 expo-web-browser의 openBrowserAsync를 부른다고 본다.

export const OPEN_EXTERNAL = "open-external";

interface NativeBridge {
  postMessage(message: string): void;
}

/** 앱 껍데기 안에서 돌고 있으면 그 연결 통로, 웹이면 null */
export function nativeBridge(win: object): NativeBridge | null {
  const b = (win as { ReactNativeWebView?: unknown }).ReactNativeWebView;
  return b && typeof (b as NativeBridge).postMessage === "function" ? (b as NativeBridge) : null;
}

/** 앱 안이면 인앱 브라우저로 열어 달라고 껍데기에 보내고 true. 웹이면 false(링크가 새 탭으로 연다) */
export function openInApp(url: string, win: object = window): boolean {
  const bridge = nativeBridge(win);
  if (!bridge || !/^https:\/\//.test(url)) return false;
  bridge.postMessage(JSON.stringify({ type: OPEN_EXTERNAL, url }));
  return true;
}
