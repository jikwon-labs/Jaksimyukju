#!/usr/bin/env bash
# PreToolUse(Edit|Write|NotebookEdit) — 메인 체크아웃에서 파일을 고치지 못하게 한다.
# 작업은 .claude/worktrees/<브랜치> 워크트리 안에서 한다(CLAUDE.md "작업은 워크트리에서").
#
# 허용:
#   - .claude/worktrees/ 아래(워크트리 안) 파일
#   - 레포 밖 파일(스크래치패드, 메모리 등)
#   - .claude/settings.local.json (개인 설정, gitignore)
# 메인에서 고쳐야 하면 사용자가 .claude/settings.local.json 의 env 에 "JAKSIM_ALLOW_MAIN": "1" 을 넣는다.
#
# Bash 로 쓰는 파일(sed -i, 리다이렉트)은 잡지 못한다. 과속방지턱이다.
set -euo pipefail

[ "${JAKSIM_ALLOW_MAIN:-}" = "1" ] && exit 0

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // ""')"
[ -n "$file" ] || exit 0

# 세션이 워크트리에서 시작됐어도 메인 루트를 찾도록 git-common-dir 을 쓴다
here="${CLAUDE_PROJECT_DIR:-$PWD}"
common="$(git -C "$here" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
[ -n "$common" ] || exit 0
main_root="$(dirname "$common")"

case "$file" in
  "$main_root"/.claude/worktrees/*) exit 0 ;;
  "$main_root"/.claude/settings.local.json) exit 0 ;;
  "$main_root"/*) ;;
  *) exit 0 ;;
esac

jq -n --arg reason "메인 체크아웃($main_root)에서는 파일을 고치지 않습니다. 먼저 main 기준 워크트리를 만드세요: EnterWorktree 또는 'git worktree add .claude/worktrees/<브랜치> -b <브랜치> main' 후 'bash scripts/worktree-setup.sh .claude/worktrees/<브랜치>'. 그 다음 워크트리 경로의 파일을 고치세요. 사용자가 메인에서 하라고 했다면 .claude/settings.local.json 의 env 에 JAKSIM_ALLOW_MAIN=1 을 넣어 달라고 요청하세요." '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
exit 0
