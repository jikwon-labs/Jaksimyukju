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

## 먼저 눌러 볼 흐름

1. http://localhost:3100 에서 **시작하기** → 성향 질문 3개 → 선생님 고르기 → 주제·목적지·수준 → 학습 시간 → 커리큘럼 만들기(주차 "고치기" 가능) → **이대로 시작하기**
2. 홈에서 **학습 시작** → 레슨 → 선생님과 확인하기(튜터에 두 번 답하기) → **레슨 완료하고 잔디 채우기** → 홈 잔디 한 칸, 연속 1일
3. 시드 데이터로 바로 보려면 시작 화면의 **이미 계정이 있어요**(데모 사용자 "나", 재무제표 읽기 2주차)
4. 하단 탭: 커리큘럼 지도(칸 누르기 → 퀴즈 → 마일스톤), 그룹(콕 찌르기), 내 정보 → 설정(테마 화이트/다크)

### 개발용 도구 (개발 모드에서만)

- `/api/dev/login?as=demo-me&to=/home` 데모로 로그인. `as`: `demo-me`(온), `demo-minji`(결), `demo-seoyeon`(새), `demo-junho`
- `&now=2026-11-05` 오늘 날짜를 바꾼다(복귀 화면·쉬어 가기 확인용). `&now=` 로 해제
- 쿠키 `j6_ai_fail=1` 튜터·마일스톤에서 AI 실패 상태를 강제로 본다
- `/design` 선생님 15표정과 공용 컴포넌트 기준판, `/states` 빈 상태·오류 4종

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `pnpm dev` | 개발 서버(3100) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm typecheck` | TypeScript 검사 |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest 단위 테스트 |
| `pnpm e2e` | Playwright E2E(라이트·다크, 390x844) + axe 접근성. 3100에 서버가 없으면 `pnpm dev`를 띄운다. 테스트마다 시드를 다시 넣으므로 데모 데이터가 초기화된다. 화면 캡처는 `e2e/screenshots/` |
| `pnpm db:reset` | 스키마 동기화 + 시드 |

## 폴더

- `app/` 화면과 Route Handler
- `components/` 공용 UI와 선생님 캐릭터
- `lib/domain/` 순수 함수(쉼 규칙, 잔디, 지도 좌표, 알림 제한)
- `lib/ai/` AI provider 인터페이스, mock, Anthropic 구현
- `lib/auth.ts` 게스트 세션(sessions 테이블 + 무작위 토큰 쿠키). 나중에 Supabase Auth로 바꿀 자리
- `prisma/` 스키마와 시드
- `docs/specs/` 목업에서 뽑은 화면 설계 메모

## Supabase Postgres로 옮길 때

- `prisma/schema.prisma`의 `provider = "postgresql"`, `url = env("DATABASE_URL")`로 바꾸고 `prisma migrate`로 옮긴다. SQLite 전용 기능은 쓰지 않았다(Json 칸은 Postgres jsonb).
- `lib/auth.ts`의 `getSessionUser`, `signIn`, `linkAccount`만 Supabase Auth로 바꾼다.
