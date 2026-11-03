// 작심육주 앱 껍데기: 웹 화면(Next.js, 3100 포트)을 그대로 띄운다.
// 웹이 보내는 "open-external" 메시지(lib/external.ts)와 다른 사이트로 가는 링크는 인앱 브라우저로 연다.
// 웹이 "push-register"를 보내면 푸시 토큰을 넘기고(lib/push-bridge.ts), 알림을 누르면 그 알림의 주소로 간다.
// 웹이 "auth-open"을 보내면 로그인을 앱이 맡는다(lib/app-auth-bridge.ts): 카카오는 카카오톡 앱, Apple·구글은 Safari 로그인 창.
import { login as kakaoLogin } from "@react-native-seoul/kakao-login";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import {
  APP_AUTH_REDIRECT,
  authCode,
  authOpenRequest,
  authResultScript,
  externalUrl,
  isKakaoCancel,
  notificationUrl,
  pushRequest,
  pushTokenScript,
  staysInWebView,
  WEB_URL,
  type AuthOpen,
} from "./bridge";
import { getPushToken } from "./push";

/** 카카오 네이티브 앱 키로 빌드했는지(app.config.js). 아니면 카카오도 Safari 로그인 창으로 연다 */
const KAKAO_NATIVE = Constants.expoConfig?.extra?.kakaoNative === true;

export default function App() {
  const dark = useColorScheme() === "dark";
  // WebView의 기본 타입 인자(undefined)로는 props가 never가 되어 object를 준다
  const web = useRef<WebView<object>>(null);
  const [failed, setFailed] = useState(false);
  const bg = dark ? "#111214" : "#ffffff";
  // 알림으로 열 주소. 웹뷰가 아직 안 떴으면 다 뜬 뒤에 간다
  const loaded = useRef(false);
  const pendingUrl = useRef<string | null>(null);
  const handled = useRef<string | null>(null);
  const response = Notifications.useLastNotificationResponse();

  function go(url: string) {
    web.current?.injectJavaScript(`window.location.assign(${JSON.stringify(url)});true;`);
  }

  // 앱이 꺼져 있다가 알림으로 켜진 경우와 켜 둔 채 누른 경우를 함께 받는다
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const url = notificationUrl(response.notification.request.content.data);
    if (!url) return;
    if (loaded.current) go(url);
    else pendingUrl.current = url;
  }, [response]);

  function onLoadEnd() {
    loaded.current = true;
    if (pendingUrl.current) {
      go(pendingUrl.current);
      pendingUrl.current = null;
    }
  }

  async function openAuth(req: AuthOpen) {
    const send = (detail: Parameters<typeof authResultScript>[0]) =>
      web.current?.injectJavaScript(authResultScript(detail));
    if (req.provider === "kakao" && KAKAO_NATIVE) {
      try {
        // 카카오톡이 깔려 있으면 카카오톡 앱으로, 없으면 SDK가 카카오 계정 로그인 화면을 띄운다
        const token = await kakaoLogin();
        if (token.accessToken)
          return send({
            kind: "kakao",
            accessToken: token.accessToken,
            mode: req.mode,
            next: req.next,
          });
      } catch (err) {
        if (isKakaoCancel(err)) return;
        console.warn("[auth] 카카오 SDK 로그인 실패, Safari 로그인 창으로 다시 엽니다", err);
      }
    }
    // Safari 로그인 창. 쿠키는 웹뷰와 다르므로 서버는 결과를 1회용 코드로 jaksim6://auth 에 실어 돌려준다
    const r = await WebBrowser.openAuthSessionAsync(
      WEB_URL.replace(/\/$/, "") + req.path,
      APP_AUTH_REDIRECT,
    );
    const code = r.type === "success" ? authCode(r.url) : null;
    if (code) send({ kind: "code", code });
  }

  function onMessage(e: WebViewMessageEvent) {
    const data = e.nativeEvent.data;
    const auth = authOpenRequest(data);
    if (auth) {
      void openAuth(auth);
      return;
    }
    const url = externalUrl(data);
    if (url) {
      void WebBrowser.openBrowserAsync(url);
      return;
    }
    const push = pushRequest(data);
    if (push) {
      void getPushToken(push.ask).then((token) => {
        if (token) web.current?.injectJavaScript(pushTokenScript(token));
      });
    }
  }

  // 앱 주소 밖으로 나가는 이동(새 탭 링크 등)은 웹뷰에서 열지 않고 인앱 브라우저로 넘긴다
  function onShouldStart(req: ShouldStartLoadRequest): boolean {
    if (staysInWebView(req.url)) return true;
    if (/^https:\/\//.test(req.url)) void WebBrowser.openBrowserAsync(req.url);
    return false;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={["top", "bottom"]}>
        <StatusBar style={dark ? "light" : "dark"} />
        {failed ? (
          <View style={styles.center}>
            <Text style={[styles.title, { color: dark ? "#f2f2f2" : "#111" }]}>
              작심육주에 연결하지 못했어요
            </Text>
            <Text style={styles.sub}>{WEB_URL} 서버가 켜져 있는지 확인해 주세요.</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.retry}
              onPress={() => {
                setFailed(false);
                web.current?.reload();
              }}
            >
              <Text style={styles.retryText}>다시 연결하기</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            ref={web}
            source={{ uri: WEB_URL }}
            style={{ backgroundColor: bg }}
            onMessage={onMessage}
            onLoadEnd={onLoadEnd}
            onShouldStartLoadWithRequest={onShouldStart}
            onError={() => setFailed(true)}
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            // 키보드 위의 위·아래 화살표와 "완료" 줄은 웹 폼용이라 앱에서는 숨긴다
            hideKeyboardAccessoryView
            // 화면을 끌 때 웹뷰 전체가 고무줄처럼 튕기지 않게 한다(iOS bounces, 안드로이드 끝 번짐 효과). 페이지 안쪽 스크롤은 그대로 된다
            bounces={false}
            overScrollMode="never"
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  sub: { fontSize: 14, color: "#888", textAlign: "center" },
  retry: {
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: "#2f6fd8",
    justifyContent: "center",
  },
  retryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
