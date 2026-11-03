// app.json에 더해, 카카오 네이티브 앱 키가 있을 때만 카카오 SDK(카카오톡 앱 로그인)를 켠다.
// 키가 없으면 카카오도 Apple·구글처럼 Safari 로그인 창으로 연다(App.tsx).
// 키: 카카오 디벨로퍼스 > 내 애플리케이션 > 앱 키 > 네이티브 앱 키. 앱 안에 그대로 들어가는 값이라 비밀은 아니다
module.exports = ({ config }) => {
  const kakaoAppKey = process.env.KAKAO_NATIVE_APP_KEY?.trim();
  if (!kakaoAppKey) return { ...config, extra: { ...config.extra, kakaoNative: false } };
  return {
    ...config,
    plugins: [
      ...config.plugins,
      ["@react-native-seoul/kakao-login", { kakaoAppKey }],
      "./plugins/with-kakao-scene",
    ],
    extra: { ...config.extra, kakaoNative: true },
  };
};
