// 작심육주 앱 껍데기: 웹 화면(Next.js, 3100 포트)을 그대로 띄운다.
// 웹이 보내는 "open-external" 메시지(lib/external.ts)와 다른 사이트로 가는 링크는 인앱 브라우저로 연다.
// 웹이 "push-register"를 보내면 푸시 토큰을 넘기고(lib/push-bridge.ts), 알림을 누르면 그 알림의 주소로 간다.
// 웹이 "widget-update"를 보내면 홈 화면 위젯을 새로 그리고(lib/widget-bridge.ts), 위젯을 누르면 그 주소(jaksim6://open?to=...)로 간다.
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import {
  externalUrl,
  notificationUrl,
  pushRequest,
  pushTokenScript,
  staysInWebView,
  WEB_URL,
  widgetOpenUrl,
  widgetRefreshScript,
  widgetUpdate,
} from "./bridge";
import { getPushToken } from "./push";
import { saveWidgetSummary } from "./widget-store";

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
    if (url) open(url);
  }, [response]);

  // 알림과 같이 열 주소를 받는다: 아직 안 떴으면 다 뜬 뒤에 간다
  function open(url: string) {
    if (loaded.current) go(url);
    else pendingUrl.current = url;
  }

  // 홈 화면 위젯을 눌러 켜진 경우(앱이 꺼져 있었으면 처음 주소, 켜져 있었으면 url 이벤트)
  useEffect(() => {
    void Linking.getInitialURL().then((u) => {
      const url = u ? widgetOpenUrl(u) : null;
      if (url) open(url);
    });
    const sub = Linking.addEventListener("url", ({ url }) => {
      const to = widgetOpenUrl(url);
      if (to) open(to);
    });
    return () => sub.remove();
  }, []);

  // 앱이 다시 앞으로 오면 웹에 위젯 요약을 다시 보내 달라고 한다(날이 바뀌었거나 다른 기기에서 공부한 경우)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && loaded.current) web.current?.injectJavaScript(widgetRefreshScript());
    });
    return () => sub.remove();
  }, []);

  function onLoadEnd() {
    loaded.current = true;
    if (pendingUrl.current) {
      go(pendingUrl.current);
      pendingUrl.current = null;
    }
  }

  function onMessage(e: WebViewMessageEvent) {
    const data = e.nativeEvent.data;
    const url = externalUrl(data);
    if (url) {
      void WebBrowser.openBrowserAsync(url);
      return;
    }
    const widget = widgetUpdate(data);
    if (widget) {
      void saveWidgetSummary(widget.summary);
      return;
    }
    const push = pushRequest(data);
    if (push) {
      void getPushToken(push.ask).then((token) => {
        if (token) web.current?.injectJavaScript(pushTokenScript(token));
      });
    }
  }

  // 앱 주소 밖으로 나가는 이동(새 탭 링크 등)은 웹뷰에서 열지 않고 인앱 브라우저로 넘긴다(Apple 로그인 화면은 예외)
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
            <Text style={[styles.title, { color: dark ? "#f2f2f2" : "#111" }]}>작심육주에 연결하지 못했어요</Text>
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
  retry: { marginTop: 16, minHeight: 48, paddingHorizontal: 24, borderRadius: 16, backgroundColor: "#2f6fd8", justifyContent: "center" },
  retryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
