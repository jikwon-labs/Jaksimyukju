import { registerRootComponent } from 'expo';

import App from './App';
import { loadAndroidWidget } from './widget/android';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// 안드로이드 홈 화면 위젯이 앱을 띄우지 않고 다시 그릴 때 부르는 headless 작업.
// 위젯 네이티브 모듈이 없는 곳(iOS, Expo Go)에서는 라이브러리를 불러오지도 않는다
const androidWidget = loadAndroidWidget();
if (androidWidget)
  androidWidget.lib.registerWidgetTaskHandler(androidWidget.task.widgetTaskHandler);
