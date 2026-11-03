#!/usr/bin/env bash
# 새 워크트리를 바로 작업할 수 있게 준비한다.
#   bash scripts/worktree-setup.sh .claude/worktrees/<브랜치>
# 메인 체크아웃의 .env 를 복사하고(내용은 출력하지 않음), 의존성을 설치한다.
# mobile 의존성은 vitest 가 mobile/bridge.test.ts 를 읽을 때 필요하다.
set -euo pipefail

target="${1:?워크트리 경로를 주세요. 예: .claude/worktrees/my-branch}"
[ -d "$target" ] || { echo "없는 경로: $target" >&2; exit 1; }
target="$(cd "$target" && pwd)"

main_root="$(dirname "$(git -C "$target" rev-parse --path-format=absolute --git-common-dir)")"
[ "$target" != "$main_root" ] || { echo "메인 체크아웃이 아니라 워크트리 경로를 주세요." >&2; exit 1; }

src_env="$main_root/.env"
if [ -f "$src_env" ] && [ ! -f "$target/.env" ]; then
  cp "$src_env" "$target/.env"
  echo "env 복사함"
fi

pnpm -C "$target" install --frozen-lockfile
npm ci --prefix "$target/mobile" --no-audit --no-fund

echo "준비 끝: $target"
