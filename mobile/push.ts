// 앱 껍데기의 푸시: 알림 권한, Expo 토큰, 앱을 켜 둔 동안 오는 알림 보여 주기.
// 토큰은 웹(lib/push-bridge.ts)을 거쳐 서버에 저장한다. 서버 발송은 lib/server/push.ts
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { PUSH_CHANNEL } from "./bridge";

// 앱을 켜 둔 동안 온 알림도 위에 띄운다(소리는 내지 않는다)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * 기기의 Expo 푸시 토큰. 권한이 없으면 ask일 때만 묻는다. 거절·시뮬레이터·오류면 null.
 * 안드로이드 13+는 채널이 있어야 권한 창이 뜨므로 채널부터 만든다.
 */
export async function getPushToken(ask: boolean): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(PUSH_CHANNEL, {
        name: "학습 알림",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && ask && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    console.warn("[push] 토큰을 받지 못함", e);
    return null;
  }
}
