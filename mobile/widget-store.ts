// 웹이 넘긴 위젯 요약을 기기의 공유 저장소에 두고 위젯을 새로 그리게 한다.
// iOS: App Group UserDefaults(@bacons/apple-targets ExtensionStorage) -> WidgetKit 타임라인 다시 읽기
// 안드로이드: AsyncStorage -> react-native-android-widget로 바로 다시 그리기(주기 갱신 때는 widget/task-handler.tsx가 읽는다).
// 위젯 라이브러리는 네이티브 모듈이 있을 때만 불러온다(widget/android.ts)
import { ExtensionStorage } from "@bacons/apple-targets";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { loadAndroidWidget } from "./widget/android";
import {
  ANDROID_WIDGET_NAME,
  IOS_WIDGET_KIND,
  WIDGET_APP_GROUP,
  WIDGET_STORE_KEY,
  type WidgetSummary,
} from "./widget-data";

let last: string | null | undefined;

/** summary가 null이면 위젯을 비운다(로그아웃). 같은 내용이면 다시 그리지 않는다 */
export async function saveWidgetSummary(summary: WidgetSummary | null): Promise<void> {
  const raw = summary ? JSON.stringify(summary) : null;
  if (raw === last) return;
  try {
    if (Platform.OS === "ios") {
      const storage = new ExtensionStorage(WIDGET_APP_GROUP);
      if (raw) storage.set(WIDGET_STORE_KEY, raw);
      else storage.remove(WIDGET_STORE_KEY);
      ExtensionStorage.reloadWidget(IOS_WIDGET_KIND);
    } else if (Platform.OS === "android") {
      if (raw) await AsyncStorage.setItem(WIDGET_STORE_KEY, raw);
      else await AsyncStorage.removeItem(WIDGET_STORE_KEY);
      const kit = loadAndroidWidget();
      if (kit)
        await kit.lib.requestWidgetUpdate({
          widgetName: ANDROID_WIDGET_NAME,
          renderWidget: () => kit.today.renderTodayWidget(summary),
        });
    }
    last = raw;
  } catch (e) {
    console.warn("[widget] 위젯을 갱신하지 못함", e);
  }
}
