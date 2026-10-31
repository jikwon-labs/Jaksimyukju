// 작심육주 앱 껍데기: 웹 화면(Next.js, 3100 포트)을 그대로 띄운다.
// 웹이 보내는 "open-external" 메시지(lib/external.ts)와 다른 사이트로 가는 링크는 인앱 브라우저로 연다.
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { externalUrl, WEB_URL } from "./bridge";

export default function App() {
  const dark = useColorScheme() === "dark";
  // WebView의 기본 타입 인자(undefined)로는 props가 never가 되어 object를 준다
  const web = useRef<WebView<object>>(null);
  const [failed, setFailed] = useState(false);
  const bg = dark ? "#111214" : "#ffffff";

  function onMessage(e: WebViewMessageEvent) {
    const url = externalUrl(e.nativeEvent.data);
    if (url) void WebBrowser.openBrowserAsync(url);
  }

  // 앱 주소 밖으로 나가는 이동(새 탭 링크 등)은 웹뷰에서 열지 않고 인앱 브라우저로 넘긴다
  function onShouldStart(req: ShouldStartLoadRequest): boolean {
    if (req.url.startsWith(WEB_URL) || req.url.startsWith("about:")) return true;
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
            onShouldStartLoadWithRequest={onShouldStart}
            onError={() => setFailed(true)}
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            // 키보드 위의 위·아래 화살표와 "완료" 줄은 웹 폼용이라 앱에서는 숨긴다
            hideKeyboardAccessoryView
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
