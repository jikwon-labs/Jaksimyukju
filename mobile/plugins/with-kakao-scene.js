// 카카오톡 앱 로그인에서 돌아오는 주소(kakao<앱키>://oauth)를 카카오 SDK에 넘긴다.
// 이 앱은 scene 생명 주기라 주소가 AppDelegate가 아니라 SceneDelegate로 온다.
// @react-native-seoul/kakao-login의 플러그인은 AppDelegate의 application(_:open:options:)만 고치는데
// 지금 AppDelegate에는 그 함수가 없어 아무것도 넣지 못한다. 그래서 SceneDelegate에 직접 넣는다.
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const MARK = "// j6: kakao-scene";
const IMPORT = "import KakaoSDKAuth\nimport UIKit\n";
const BODY = `  ${MARK}
  override func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts where AuthApi.isKakaoTalkLoginUrl(context.url) {
      _ = AuthController.handleOpenUrl(url: context.url)
    }
    super.scene(scene, openURLContexts: URLContexts)
  }
`;

function patch(src) {
  if (src.includes(MARK)) return src;
  const open = src.match(/class SceneDelegate\s*:\s*ExpoAppSceneDelegate\s*\{\n/);
  if (!open) throw new Error("[with-kakao-scene] SceneDelegate 클래스를 찾지 못했습니다");
  const at = open.index + open[0].length;
  return IMPORT + src.slice(0, at) + BODY + src.slice(at);
}

module.exports = function withKakaoScene(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const file = path.join(
        cfg.modRequest.platformProjectRoot,
        cfg.modRequest.projectName,
        "SceneDelegate.swift",
      );
      fs.writeFileSync(file, patch(fs.readFileSync(file, "utf8")));
      return cfg;
    },
  ]);
};
module.exports.patch = patch;
