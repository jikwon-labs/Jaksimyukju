// iOS 홈 화면 위젯 확장 타깃(@bacons/apple-targets). npx expo prebuild 때 Xcode 타깃으로 붙는다.
// App Group은 app.json ios.entitlements와 같아야 앱이 쓴 요약을 위젯이 읽는다(mobile/widget-data.ts WIDGET_APP_GROUP).
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "JaksimWidget",
  displayName: "작심육주",
  bundleIdentifier: ".widget",
  // containerBackground와 위젯 안 Link를 쓰려고 17로 둔다. 그보다 낮은 iOS에서는 위젯이 목록에 나오지 않는다
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "WidgetKit"],
  colors: {
    // 위젯 배경(Info.plist가 참조). lib/design/tokens.ts PALETTES bg
    $widgetBackground: { light: "#FFFFFF", dark: "#111114" },
    $accent: { light: "#2F62D9", dark: "#5B8CFF" },
  },
  entitlements: {
    "com.apple.security.application-groups": config.ios.entitlements["com.apple.security.application-groups"],
  },
});
