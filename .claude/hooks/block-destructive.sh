#!/usr/bin/env bash
# PreToolUse(Bash) — 되돌리기 어려운 명령을 막는다.
#
# 막는 것:
#   - git push --force / -f / +refspec   (--force-with-lease 는 허용)
#   - git reset --hard
#   - rm -rf 류(-r 와 -f 동시), rm .env*
#   - 운영 DB 를 건드릴 수 있는 Prisma 명령:
#       prisma migrate deploy, pnpm db:deploy, pnpm build(앞에서 migrate deploy 를 돈다)
#       prisma migrate reset / db push --force-reset (prisma/guard.ts 를 거치지 않는 직접 호출)
#     -> 빌드 확인은 `pnpm exec next build`, 리셋은 `pnpm db:reset`(로컬 DB 검사 포함)을 쓴다.
#
# 차단은 permissionDecision:"deny" JSON + exit 0 으로 한다(exit 2 는 쓰지 않음).
set -euo pipefail

__here="$(dirname "${BASH_SOURCE[0]}")"
if [ -f "$__here/_lib.sh" ]; then . "$__here/_lib.sh"; else strip_heredocs() { cat; }; fi

input="$(cat)"
tool_name="$(printf '%s' "$input" | jq -r '.tool_name // ""')"
[ "$tool_name" = "Bash" ] || exit 0

cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"
[ -n "$cmd" ] || exit 0
cmd="$(printf '%s\n' "$cmd" | strip_heredocs)"

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

has() { printf '%s' "$cmd" | grep -Eq "$1"; }

# ---- git push --force (--force-with-lease 는 허용) ----
if has '(^|[[:space:]])git[[:space:]]+push([[:space:]]+[^[:space:]]+)*[[:space:]]+--force([[:space:]]|=|$)'; then
  deny "'git push --force' 를 막았습니다. 꼭 필요하면 'git push --force-with-lease' 를 쓰세요."
fi
if has '(^|[[:space:]])git[[:space:]]+push([[:space:]]+[^[:space:]]+)*[[:space:]]-f([[:space:]]|$)'; then
  deny "'git push -f' 를 막았습니다. 'git push --force-with-lease' 를 쓰세요."
fi
if has '(^|[[:space:]])git[[:space:]]+push.*[[:space:]]\+[A-Za-z0-9_./-]+(:[A-Za-z0-9_./-]+)?([[:space:]]|$)'; then
  deny "'+<refspec>' 강제 push 를 막았습니다. 'git push --force-with-lease' 를 쓰세요."
fi

# ---- git reset --hard ----
if has '(^|[[:space:]])git[[:space:]]+reset([[:space:]]+[^[:space:]]+)*[[:space:]]--hard([[:space:]]|=|$)'; then
  deny "'git reset --hard' 는 작업 중인 변경을 되돌릴 수 없게 지웁니다. 먼저 stash 하거나 커밋하세요."
fi

# ---- rm -rf 류 ----
if has '(^|[[:space:]])rm([[:space:]]+-[A-Za-z]*)*[[:space:]]+-[A-Za-z]*[rR]' \
  && has '(^|[[:space:]])rm([[:space:]]+-[A-Za-z]*)*[[:space:]]+-[A-Za-z]*[fF]'; then
  deny "'rm' 에 -r 과 -f 를 같이 쓰는 걸 막았습니다. 대상을 확인한 뒤 경로를 하나씩 지우세요."
fi
if has '(^|[[:space:]])rm[[:space:]].*--recursive' && has '(^|[[:space:]])rm[[:space:]].*--force'; then
  deny "'rm --recursive --force' 를 막았습니다. 대상을 확인한 뒤 경로를 하나씩 지우세요."
fi

# ---- rm .env* ----
if has '(^|[[:space:]])rm([[:space:]]|$)'; then
  set -f
  normalized="$(printf '%s' "$cmd" | tr ';|&()<>"'"'"'`=,' '          ')"
  for raw in $normalized; do
    token="${raw#./}"
    base="${token##*/}"
    case "$base" in
      .env*.example) continue ;;
      .env|.env.*|.env-*) deny "비밀값 파일 '$base' 삭제를 막았습니다. 정말 지워야 하면 사용자가 직접 지우세요." ;;
    esac
  done
  set +f
fi

# ---- Prisma / 운영 DB ----
if has '(^|[[:space:]])prisma[[:space:]]+migrate[[:space:]]+deploy'; then
  deny "'prisma migrate deploy' 는 .env 의 DB(운영일 수 있음)에 마이그레이션을 적용합니다. 로컬 개발은 'pnpm db:migrate', 운영 반영은 Vercel 빌드가 합니다."
fi
if has '(^|[[:space:]])(pnpm|npm|yarn)([[:space:]]+run)?[[:space:]]+db:deploy([[:space:]]|$)'; then
  deny "'db:deploy' 는 prisma migrate deploy 입니다. 운영 반영은 Vercel 빌드에 맡기세요."
fi
if has '(^|[[:space:]])(pnpm|npm|yarn)([[:space:]]+run)?[[:space:]]+build([[:space:]]|$)'; then
  deny "'pnpm build' 는 앞에서 prisma migrate deploy 를 돌립니다. 빌드 확인은 'pnpm exec next build' 를 쓰세요(CI 와 같음)."
fi
if has '(^|[[:space:]])prisma[[:space:]]+migrate[[:space:]]+reset' || has '(^|[[:space:]])prisma[[:space:]]+db[[:space:]]+push.*--force-reset'; then
  deny "Prisma 리셋을 직접 부르면 로컬 DB 검사(prisma/guard.ts)를 건너뜁니다. 'pnpm db:reset' 을 쓰세요."
fi

exit 0
