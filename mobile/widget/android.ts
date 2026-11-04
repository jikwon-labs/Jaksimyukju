// react-native-android-widget는 안드로이드에서 불러오는 순간 네이티브 모듈을 찾고, 없으면(Expo Go, 모듈을 빼고 만든 빌드) 바로 오류를 낸다.
// 그래서 맨 위에서 import하지 않고, 네이티브 모듈이 있을 때만 여기서 불러온다. 위젯 그림(TodayWidget)도 이 라이브러리를 쓰므로 같이 미룬다.
import { NativeModules, Platform, TurboModuleRegistry } from "react-native";

type AndroidWidgetLib = typeof import("react-native-android-widget");
type TodayWidgetModule = typeof import("./TodayWidget");
type TaskHandlerModule = typeof import("./task-handler");

/** 안드로이드이고 위젯 네이티브 모듈이 들어 있으면 true */
export function androidWidgetLinked(): boolean {
  if (Platform.OS !== "android") return false;
  try {
    return TurboModuleRegistry.get("AndroidWidget") != null || NativeModules.AndroidWidget != null;
  } catch {
    return false;
  }
}

export interface AndroidWidgetKit {
  lib: AndroidWidgetLib;
  today: TodayWidgetModule;
  task: TaskHandlerModule;
}

let kit: AndroidWidgetKit | null | undefined;

/** 위젯 라이브러리와 위젯 그림. 쓸 수 없으면 null */
export function loadAndroidWidget(): AndroidWidgetKit | null {
  if (kit !== undefined) return kit;
  kit = null;
  if (androidWidgetLinked()) {
    try {
      kit = {
        lib: require("react-native-android-widget") as AndroidWidgetLib,
        today: require("./TodayWidget") as TodayWidgetModule,
        task: require("./task-handler") as TaskHandlerModule,
      };
    } catch (e) {
      console.warn("[widget] 안드로이드 위젯을 불러오지 못함", e);
    }
  }
  return kit;
}
