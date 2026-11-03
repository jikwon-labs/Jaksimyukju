#!/usr/bin/env bash
# Stop 훅 — 작업 트리에 변경이 있을 때만 typecheck -> lint 를 돌린다.
# 실패하면 {"decision":"block"} 으로 Claude 를 돌려보내 고치게 한다.
# 대화만 한 턴(깨끗한 트리)은 건너뛴다. test/build 는 CI 몫이다.
#
# 끄기: .claude/settings.local.json(gitignore) 의 env 에 "JAKSIM_GATE_OFF": "1"
set -uo pipefail

input="$(cat)"

[ "${JAKSIM_GATE_OFF:-}" = "1" ] && exit 0

# 직전 block 뒤 다시 멈추는 중이면 그냥 보낸다(무한 루프 방지)
[ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-}"
[ -n "$root" ] || root="$(printf '%s' "$input" | jq -r '.cwd // ""')"
[ -n "$root" ] || root="$PWD"

# 추적 중인 파일 변경도, 새 파일도 없으면 검사할 게 없다
if git -C "$root" diff --quiet && git -C "$root" diff --cached --quiet \
  && [ -z "$(git -C "$root" ls-files --others --exclude-standard -- '*.ts' '*.tsx' '*.mts' '*.mjs' | head -1)" ]; then
  exit 0
fi

block() {
  jq -n --arg reason "$1" '{ decision: "block", reason: $reason }'
  exit 0
}

run() {
  local label="$1"; shift
  local out
  if ! out="$("$@" 2>&1)"; then
    block "검증 게이트 실패: ${label}

$(printf '%s\n' "$out" | tail -n 30)

고친 뒤 다시 멈추세요. (게이트 = pnpm typecheck && pnpm lint. test/build 는 CI 가 본다.)"
  fi
}

run "typecheck (tsc --noEmit)" pnpm -C "$root" typecheck
run "lint (eslint .)" pnpm -C "$root" lint

exit 0
