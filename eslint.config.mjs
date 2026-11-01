import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    // 앱 껍데기는 따로 타입 검사한다(mobile/에서 npx tsc --noEmit)
    "mobile/**",
    // 에이전트가 쓰는 작업 폴더(git worktree)
    ".claude/**",
  ]),
]);

export default eslintConfig;
