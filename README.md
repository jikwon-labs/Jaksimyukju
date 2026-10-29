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
3. 시드 데이터로 바로 보려면 시작 화면의 **이미 계정이 있어요** → 카카오로 계속하기 → 가짜 로그인 화면에서 **데모 지우로 계속하기**(데모 사용자 "나", 재무제표 읽기 2주차)
4. 하단 탭: 커리큘럼 지도(칸 누르기 → 퀴즈 → 마일스톤), 그룹(콕 찌르기), 내 정보 → 설정(테마 화이트/다크)
5. 계정 연결: 첫 레슨 완료 화면의 **카카오로 연결**·**구글로 연결** → 가짜 로그인 화면에서 동의 → 설정에서 로그아웃 → 이미 계정이 있어요 → 같은 번호로 다시 들어오면 기록이 그대로 있다

### 개발용 도구 (개발 모드에서만)

- `/api/dev/login?as=demo-me&to=/home` 데모로 로그인. `as`: `demo-me`(온), `demo-minji`(결), `demo-seoyeon`(새), `demo-junho`
- `&now=2026-11-05` 오늘 날짜를 바꾼다(복귀 화면·쉬어 가기 확인용). `&now=` 로 해제
- 쿠키 `j6_ai_fail=1` 튜터·마일스톤에서 AI 실패 상태를 강제로 본다
- `/design` 선생님 15표정과 공용 컴포넌트 기준판, `/states` 빈 상태·오류 4종

## 소셜 로그인(카카오·구글)

- 게스트로 시작하고, 첫 레슨을 마친 뒤 카카오나 구글 계정을 연결한다. 기록은 같은 사용자에 그대로 남는다. 다른 휴대폰에서는 **이미 계정이 있어요**로 같은 계정에 들어온다.
- 키가 없으면 개발 모드에서만 앱 안의 가짜 공급자(`/api/dev/oauth/*`)가 대신한다. 코드 교환, PKCE 확인, 사용자 정보 해석은 실제와 같은 코드를 지난다. 사용자 번호를 `fail`로 시작하면 공급자 오류를 흉내 낸다. 운영 빌드에서 키가 없으면 버튼이 숨는다.
- 실제로 쓰려면 `.env.local`에 넣는다: `KAKAO_CLIENT_ID`(REST API 키), `KAKAO_CLIENT_SECRET`(쓰는 경우), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, 그리고 배포 주소 `APP_URL`(예: `https://example.com`, 비우면 요청 주소).
- 공급자 콘솔에 등록할 리다이렉트 URI: `{APP_URL}/api/auth/kakao/callback`, `{APP_URL}/api/auth/google/callback` (로컬은 `http://localhost:3100/...`). 구글 범위는 `openid email profile`. 카카오는 동의 항목을 콘솔에서 정한다(이메일은 비즈 앱에서만 받을 수 있어 없어도 동작).
- 코드: 순수 함수 `lib/domain/oauth.ts`, 공급자 설정과 교환 `lib/server/oauth.ts`, 연결·로그인 `lib/auth.ts`(`linkSocial`, `findSocialUser`), 라우트 `app/api/auth/[provider]/{start,callback}`.

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
| `pnpm check:offline` | 서비스 워커 오프라인 확인. 운영 서버(`pnpm build && pnpm start`)를 3100에 띄운 뒤 실행 |

## 폴더

- `app/` 화면과 Route Handler
- `components/` 공용 UI와 선생님 캐릭터
- `lib/domain/` 순수 함수(쉼 규칙, 잔디, 지도 좌표, 알림 제한)
- `lib/ai/` AI provider 인터페이스, mock, Anthropic 구현
- `lib/auth.ts` 게스트 세션(sessions 테이블 + 무작위 토큰 쿠키). 나중에 Supabase Auth로 바꿀 자리
- `prisma/` 스키마와 시드
- `docs/specs/` 목업에서 뽑은 화면 설계 메모

## 오프라인

- 레슨을 열면 내용이 기기(localStorage)에 저장되고, 연결이 끊기면 같은 화면에 오프라인 배너가 뜬 채 계속 읽을 수 있다.
- 운영 빌드에서는 서비스 워커(`public/sw.js`)가 한 번 연 레슨 화면을 저장해 두어, 오프라인에서 새로고침하거나 다른 화면을 열어도 마지막 레슨을 보여 준다. 개발 모드에서는 등록하지 않는다.

## Supabase Postgres로 옮길 때

- `prisma/schema.prisma`의 `provider = "postgresql"`, `url = env("DATABASE_URL")`로 바꾸고 `prisma migrate`로 옮긴다. SQLite 전용 기능은 쓰지 않았다(Json 칸은 Postgres jsonb).
- `lib/auth.ts`의 `getSessionUser`, `signIn`, `linkAccount`만 Supabase Auth로 바꾼다.
