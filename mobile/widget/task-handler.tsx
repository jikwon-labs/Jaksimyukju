"use no memo";
// 안드로이드 위젯이 추가·주기 갱신(30분)·크기 변경될 때 앱 프로세스의 headless JS로 불린다.
// 마지막으로 저장한 요약을 읽어 다시 그린다. 누르기는 OPEN_URI라 여기로 오지 않는다
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { parseWidgetSummary, WIDGET_STORE_KEY, type WidgetSummary } from "../widget-data";
import { renderTodayWidget } from "./TodayWidget";

export async function readStoredSummary(): Promise<WidgetSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STORE_KEY);
    return raw ? parseWidgetSummary(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetAction === "WIDGET_DELETED" || props.widgetAction === "WIDGET_CLICK") return;
  props.renderWidget(renderTodayWidget(await readStoredSummary()));
}
