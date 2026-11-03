#!/usr/bin/env bash
# PostToolUse(Edit|Write) — 방금 쓴 파일 하나만 포맷한다.
#   *.ts|*.tsx|*.mjs|*.js -> eslint --fix 후 prettier --write
#   *.css|*.json|*.md|*.yml|*.yaml -> prettier --write
# mobile/ 은 eslint 대상이 아니라(eslint.config.mjs globalIgnores) prettier 만 돈다.
# 막지 않는 훅이다. 출력은 버리고 항상 exit 0.
set -uo pipefail

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')"
[ -n "$file" ] && [ -f "$file" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$PWD}"

# 프로젝트 밖 파일(다른 레포, 스크래치패드)은 건드리지 않는다
case "$file" in
  "$root"/*) ;;
  *) exit 0 ;;
esac

run_eslint()   { pnpm -C "$root" exec eslint --fix "$file" >/dev/null 2>&1 || true; }
run_prettier() { pnpm -C "$root" exec prettier --write --ignore-unknown "$file" >/dev/null 2>&1 || true; }

case "$file" in
  "$root"/mobile/*) run_prettier ;;
  *.ts|*.tsx|*.mts|*.mjs|*.js) run_eslint; run_prettier ;;
  *.css|*.json|*.md|*.yml|*.yaml) run_prettier ;;
esac

exit 0
