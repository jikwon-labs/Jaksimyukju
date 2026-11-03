#!/usr/bin/env bash
# PreToolUse(Edit|Write|Read|Bash) — 비밀 파일(.env, *.pem, *.key, *.p8, *.p12) 접근을 막는다.
# .env*.example 은 커밋되는 견본이라 허용한다.
#
# Edit/Write/Read 는 tool_input.file_path, Bash 는 tool_input.command 를 본다.
# permissions.deny 는 file_path 만 보므로 `cat .env` 같은 Bash 우회를 여기서 막는다.
#
# 차단은 permissionDecision:"deny" JSON + exit 0 으로 한다(exit 2 는 쓰지 않음).
# 로컬 과속방지턱일 뿐 보안 경계는 아니다.
#
# 참고: prisma/guard.ts·prisma CLI·next 가 .env 를 스스로 읽는 건 막지 않는다.
# 명령 문자열에 .env 가 직접 나올 때만 걸린다.
set -euo pipefail

__here="$(dirname "${BASH_SOURCE[0]}")"
if [ -f "$__here/_lib.sh" ]; then . "$__here/_lib.sh"; else strip_heredocs() { cat; }; fi

input="$(cat)"
tool_name="$(printf '%s' "$input" | jq -r '.tool_name // ""')"

candidates=()
case "$tool_name" in
  Bash)
    cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"
    # heredoc 본문은 파일에 쓸 데이터라 검사에서 뺀다(문서에 .env 를 언급만 해도 막히지 않게)
    cmd="$(printf '%s\n' "$cmd" | strip_heredocs)"
    [ -n "$cmd" ] && candidates+=("$cmd")
    ;;
  *)
    fp="$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')"
    [ -n "$fp" ] && candidates+=("$fp")
    ;;
esac

[ "${#candidates[@]}" -eq 0 ] && exit 0

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

set -f
for candidate in "${candidates[@]}"; do
  normalized="$(printf '%s' "$candidate" | tr ';|&()<>"'"'"'`=,' '          ')"
  for raw in $normalized; do
    token="${raw#./}"
    base="${token##*/}"
    case "$base" in
      .env*.example) continue ;;
    esac
    case "$base" in
      .env|.env.*|.env-*)
        deny "'$base' 는 실제 비밀값이 있어 접근을 막았습니다. 키 이름은 .env.example 을 보세요. 값이 꼭 필요하면 사용자에게 요청하세요." ;;
      *.pem|*.key|*.p8|*.p12)
        deny "'$base' 는 개인키·인증서 파일이라 접근을 막았습니다." ;;
    esac
  done
done
set +f

exit 0
