# 작심육주

작심삼일, 이번엔 끝까지. 퇴근 후 독학을 돕는 AI 학습 앱(모바일 웹 우선).

## 실행

```bash
pnpm i
pnpm db:reset   # SQLite(prisma/dev.db) 스키마를 맞추고 시드를 다시 넣는다
pnpm dev        # http://localhost:3100
```

- Node 24, pnpm 11 기준.
- AI 키는 선택이다. `.env.example`을 `.env.local`로 복사하고 `ANTHROPIC_API_KEY`를 넣으면 실제 Claude를 부른다. 비워 두면 결정적 모의 응답(mock)으로 동작한다.

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `pnpm dev` | 개발 서버(3100) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm typecheck` | TypeScript 검사 |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest 단위 테스트 |
| `pnpm e2e` | Playwright E2E(라이트·다크, 390x844). 3100에 서버가 없으면 `pnpm dev`를 띄운다 |
| `pnpm db:reset` | 스키마 동기화 + 시드 |

## 폴더

- `app/` 화면과 Route Handler
- `components/` 공용 UI와 선생님 캐릭터
- `lib/domain/` 순수 함수(쉼 규칙, 잔디, 지도 좌표, 알림 제한)
- `lib/ai/` AI provider 인터페이스, mock, Anthropic 구현
- `lib/auth.ts` 게스트 세션(쿠키). 나중에 Supabase Auth로 바꿀 자리
- `prisma/` 스키마와 시드
- `docs/specs/` 목업에서 뽑은 화면 설계 메모
