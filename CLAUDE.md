# jaksim6

@AGENTS.md

Next.js 16 + React 19 웹앱(`app/`, `components/`, `lib/`) + Expo 앱 껍데기(`mobile/`, pnpm 워크스페이스 밖, npm). DB 는 Prisma + Postgres(로컬은 docker compose, 운영은 Supabase), 배포는 Vercel.

## 작업은 워크트리에서 (AI 전용)

- 파일을 고치는 작업은 첫 수정 전에 `main` 기준 워크트리(`.claude/worktrees/<브랜치>`, gitignore 됨)를 만들고 그 안에서 한다. 읽기·탐색은 어느 트리에서든 된다. 메인 체크아웃 파일을 Edit/Write 하면 `require-worktree.sh` 훅이 막는다.
- 만드는 법: EnterWorktree, 또는 `git worktree add .claude/worktrees/<브랜치> -b <브랜치> main`. 그 다음 `bash scripts/worktree-setup.sh .claude/worktrees/<브랜치>` 로 `.env` 를 복사하고 `pnpm install` 과 `npm ci --prefix mobile` 을 돌린다(vitest 가 `mobile/bridge.test.ts` 를 읽어서 둘 다 필요).
- 워크트리 하나, 브랜치 하나에 작업 하나만 둔다. 다른 작업을 섞지 않는다.
- 커밋과 PR 은 사용자가 요청할 때만 만든다. PR 이 머지되면 `git worktree remove` 후 `git branch -d` 로 정리한다.
- 사용자가 "메인에서 해"라고 하면 `.claude/settings.local.json` 의 `env` 에 `"JAKSIM_ALLOW_MAIN": "1"` 을 넣어 달라고 요청한다.

## 명령

```bash
pnpm dev            # :3100
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint .
pnpm test           # vitest run (DB 안 씀, ANTHROPIC_API_KEY 없으면 AI 는 mock)
pnpm e2e            # playwright (로컬 Postgres + 시드 필요)
pnpm exec next build  # 빌드 확인용. CI 와 같다
pnpm db:up / db:migrate / db:reset   # 로컬 DB. 앞에서 prisma/guard.ts 가 로컬 주소인지 검사한다
```

보고 전 검증은 `pnpm typecheck && pnpm lint && pnpm test` 를 돌린다. `mobile/` 을 고쳤으면 `cd mobile && npx tsc --noEmit` 도 돌린다.

## DB 안전 규칙

- `pnpm build` 는 `prisma migrate deploy` 를 먼저 돌린다(Vercel 용). `.env` 가 운영 DB 를 가리키면 그대로 운영에 적용되므로 로컬에서는 쓰지 않는다. 빌드 확인은 `pnpm exec next build`.
- `prisma migrate deploy`, `pnpm db:deploy`, `prisma migrate reset` 을 직접 부르지 않는다. 리셋은 `pnpm db:reset`(guard 포함)만 쓴다.

## Claude Code 하네스 (`.claude/settings.json` + `.claude/hooks/`)

- `protect-secrets.sh` (PreToolUse): `.env`, `*.pem`, `*.key`, `*.p8`, `*.p12` 읽기·쓰기를 막는다. Bash 명령 안에 그 경로가 직접 나와도 막는다. `.env*.example` 은 허용한다.
- `require-worktree.sh` (PreToolUse Edit/Write): 메인 체크아웃 파일 수정을 막는다. `.claude/worktrees/` 아래, 레포 밖, `.claude/settings.local.json` 은 허용한다.
- `block-destructive.sh` (PreToolUse Bash): force push, `git reset --hard`, `rm -rf`, `rm .env*`, 위 DB 명령을 막는다.
- `format.sh` (PostToolUse): 방금 고친 파일 하나에 eslint --fix 와 prettier 를 돌린다(`mobile/` 은 prettier 만).
- `gate.sh` (Stop): 트리에 변경이 있으면 typecheck 와 lint 를 돌리고, 실패하면 돌려보낸다. 끄려면 `.claude/settings.local.json` 의 `env` 에 `"JAKSIM_GATE_OFF": "1"` 을 넣는다.
- 모두 로컬 과속방지턱이다. 최종 게이트는 CI(`.github/workflows/ci.yml`)다.
