# 작심육주

작심삼일, 이번엔 끝까지. 퇴근 후 독학을 돕는 AI 학습 앱(모바일 웹 우선).

## 실행

```bash
pnpm i
pnpm db:up      # 로컬 Postgres(docker-compose.yml, 127.0.0.1:5433)를 켠다. Docker가 켜져 있어야 한다
pnpm db:reset   # 마이그레이션을 처음부터 다시 적용하고 시드를 넣는다
pnpm dev        # http://localhost:3100
```

- Node 24, pnpm 11 기준.
- `.env`의 `DATABASE_URL`, `DIRECT_URL`은 로컬 Postgres 주소로 둔다(`.env.example` 참고).
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

## 소셜 로그인(카카오·구글·Apple)

- 게스트로 시작하고, 첫 레슨을 마친 뒤 카카오·구글·Apple 계정을 연결한다. 기록은 같은 사용자에 그대로 남는다. 다른 휴대폰에서는 **이미 계정이 있어요**로 같은 계정에 들어온다.
- 키가 없으면 개발 모드에서만 앱 안의 가짜 공급자(`/api/dev/oauth/*`)가 대신한다. 코드 교환, PKCE 확인, 사용자 정보 해석은 실제와 같은 코드를 지난다. 사용자 번호를 `fail`로 시작하면 공급자 오류를 흉내 낸다. 운영 빌드에서 키가 없으면 버튼이 숨는다.
- 실제로 쓰려면 `.env.local`에 넣는다: `KAKAO_CLIENT_ID`(REST API 키), `KAKAO_CLIENT_SECRET`(쓰는 경우), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, 그리고 배포 주소 `APP_URL`(예: `https://example.com`, 비우면 요청 주소).
- 공급자 콘솔에 등록할 리다이렉트 URI: `{APP_URL}/api/auth/kakao/callback`, `{APP_URL}/api/auth/google/callback` (로컬은 `http://localhost:3100/...`). 구글 범위는 `openid email profile`. 카카오는 동의 항목을 콘솔에서 정한다(이메일은 비즈 앱에서만 받을 수 있어 없어도 동작).
- Apple(App Store 심사 4.8: 다른 소셜 로그인이 있으면 함께 둬야 한다): Apple Developer에서 Services ID를 만들어 Sign in with Apple을 켜고, 도메인과 리턴 URL `{APP_URL}/api/auth/apple/callback`을 등록한다(https만 되고 localhost는 안 된다). Keys에서 Sign in with Apple 키를 만들어 .p8을 받는다. `.env.local`에 `APPLE_CLIENT_ID`(Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`(.p8 내용, 줄바꿈은 `\n`)를 넣는다. 넷 다 있어야 켜진다.
- Apple은 이름·이메일 범위를 요청하지 않는다. 요청하면 콜백이 다른 사이트 POST로 와서 state 쿠키(lax)가 실리지 않기 때문이다. 그래서 Apple 계정 줄에는 이메일 없이 "Apple 연결됨"으로 보인다. 앱 껍데기는 Apple 로그인 화면(`appleid.apple.com`)을 인앱 브라우저로 넘기지 않고 웹뷰 안에서 연다(`mobile/bridge.ts` `staysInWebView`).
- 코드: 순수 함수 `lib/domain/oauth.ts`, 공급자 설정과 교환 `lib/server/oauth.ts`, 연결·로그인 `lib/auth.ts`(`linkSocial`, `findSocialUser`), 라우트 `app/api/auth/[provider]/{start,callback}`.

## 스케줄러(알림)

- `POST /api/cron/tick`(GET도 됨) 한 번에, 진행 중 과정이 있는 사용자마다 선생님 알림을 만든다: 학습 시각이 지났는데 오늘 칸이 비면 "학습 시간", 학습일 하루를 비웠으면 다음 날 한 번, 일요일 주간 회고.
- 하루 2번, 밤 11시~아침 7시, 쉬어 가기 날, 종류별 끔을 지키고 같은 알림은 한 번만 남긴다. 실제 푸시는 보내지 않고 알림 목록에만 남긴다(붙일 자리: `lib/server/scheduler.ts`).
- 로컬: 서버를 띄운 채 `pnpm cron:tick`. 개발 모드에서는 `?now=2026-11-02T21:10:00%2B09:00`로 시각을 흉내 낼 수 있다.
- 운영: `CRON_SECRET`을 넣고 외부 cron이 10~30분마다 `Authorization: Bearer <CRON_SECRET>`로 부른다. 비밀이 없으면 운영에서는 401.

## 간격 복습

- 복습 카드는 세 곳에서 생긴다: 마친 레슨(5분 버전 포함), 주차 퀴즈에서 틀린 문제, 튜터 확인이 덜 된 채(3번 틀려 정답을 들었거나 부분 이해) 끝난 레슨. 레슨 하나에 카드는 하나이고, 튜터에서 헷갈렸으면 "헷갈렸던 개념"으로 바뀌어 먼저 나오고, 복습에서 한 번 맞히면 보통 레슨 카드로 돌아간다.
- 간격은 1일, 3일, 7일, 14일. 맞히면 다음 간격, 틀리면 1일로 돌아간다. 14일 간격까지 맞히면 졸업한다. 쉬어 가기 날로 잡히는 일정은 다음 날로 미루고, 쉬는 날에는 복습할 카드가 없다.
- 홈에 "오늘 복습 N개 · M분"(한 장 30초, 한 번에 6장까지)이 뜨고 `/review`에서 객관식으로 푼다. 레슨 카드 문제는 레슨 본문을 보고 AI가 만들고(키가 없거나 실패하면 결정적 mock), 퀴즈 카드는 퀴즈 문제를 그대로 쓴다.
- 복습은 잔디와 연속 기록에 세지 않는다. 복습만 하고 레슨을 안 한 학습일은 지금처럼 빈 날이라 연속이 끊기고 복귀 판정에도 들어간다. 학습일이 아닌 날에 복습해도 연속에는 영향이 없다.
- 복습 알림(종류 `review`, 설정의 "복습 알림"으로 끈다): 스케줄러가 학습 시각 뒤에, 카드가 있고 오늘 레슨 몫이 없거나 이미 끝났을 때 하루 한 번. 하루 2번, 밤 시간, 쉬어 가기 날 규칙은 다른 알림과 같다. 한도 안에서는 가장 뒤라서 일요일 회고 알림 칸을 빼앗지 않는다.
- 코드: 순수 함수 `lib/domain/review.ts`, 저장과 채점 `lib/server/review.ts`, 문제 프롬프트와 mock `lib/ai/review.ts`, 화면 `app/(app)/review`.

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `pnpm dev` | 개발 서버(3100) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm typecheck` | TypeScript 검사 |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest 단위 테스트 |
| `pnpm e2e` | Playwright E2E(라이트·다크, 390x844) + axe 접근성. 3100에 서버가 없으면 `pnpm dev`를 띄운다. 테스트마다 시드를 다시 넣으므로 데모 데이터가 초기화된다. 화면 캡처는 `e2e/screenshots/`. `.env`에 실제 키가 있으면 `J6_FORCE_MOCK=1 pnpm e2e`로 AI와 소셜 로그인을 가짜로 돌린다 |
| `pnpm db:up` | 로컬 Postgres 켜기 |
| `pnpm db:reset` | 마이그레이션 다시 적용 + 시드(로컬 DB에서만 돈다) |
| `pnpm db:migrate` | 스키마를 바꾼 뒤 새 마이그레이션 만들기(로컬 DB에서만 돈다) |
| `pnpm db:deploy` | 운영 DB에 마이그레이션 적용(아래 "운영 DB") |
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

## 운영 DB(Supabase)

- 로컬과 운영 모두 Postgres다. 스키마 변경은 `prisma/migrations/`의 마이그레이션으로만 옮긴다.
- 테이블을 비우는 명령(시드, `db:reset`, `db:migrate`, E2E 보조 스크립트)은 `prisma/guard.ts`가 DB 주소를 보고 로컬이 아니면 멈춘다.
- 로컬 `.env`에는 운영 주소를 `SUPABASE_DATABASE_URL`, `SUPABASE_DIRECT_URL`처럼 앱이 읽지 않는 이름으로만 둔다. Vercel에는 `DATABASE_URL`(pooler 6543, `?pgbouncer=true`)과 `DIRECT_URL`(5432)로 넣는다.
- 운영에 마이그레이션 적용: `DATABASE_URL="$SUPABASE_DIRECT_URL" DIRECT_URL="$SUPABASE_DIRECT_URL" pnpm db:deploy` (셸에 값을 먼저 불러온 뒤).

## 앱 껍데기(mobile/)

Expo 앱이 웹 화면(3100 포트)을 그대로 띄운다. 자료 원문처럼 바깥 링크는 인앱 브라우저로 연다.

1. 웹 서버를 먼저 켠다: `pnpm dev`
2. `cd mobile && npm install && npx expo start --ios` (iOS 시뮬레이터에 Expo Go를 설치하고 연다)
3. 실제 기기나 안드로이드 에뮬레이터는 `EXPO_PUBLIC_WEB_URL=http://<맥의 IP>:3100`을 주고 시작한다

앱의 웹뷰는 Safari와 쿠키를 나누지 않아서 처음에는 새 게스트로 시작한다.

### 실제 아이폰에 설치

평소에는 quedot-commerce-app처럼 맥에서 직접 빌드해 케이블로 연결한 폰에 깐다. Expo 서버를 거치지 않아 빌드 횟수를 쓰지 않는다. 앱은 `EXPO_PUBLIC_WEB_URL`(맥의 IP와 3100 포트)을 연다.

1. 맥과 폰을 같은 와이파이에 두고 맥 IP를 확인한다: `ipconfig getifaddr en0`
2. `mobile/.env.example`을 `mobile/.env.local`로 복사하고 `EXPO_PUBLIC_WEB_URL=http://<맥 IP>:3100`을 넣는다
3. 웹 서버를 그 IP로도 열리게 켠다: `DEV_ORIGINS=<맥 IP> pnpm dev`
4. 폰을 케이블로 연결하고(개발자 모드 켜기) 설치한다: `cd mobile && npm run ios:release -- --device`
   - Release 빌드라 Metro 서버 없이 열린다. 앱 껍데기 코드를 고치며 바로 보려면 `npm run ios -- --device`
   - 서명은 `app.json`의 `ios.appleTeamId`(개인 팀)로 한다. `mobile/ios/`는 빌드 때 생기는 폴더라 커밋하지 않는다

EAS 서버 빌드(`mobile/eas.json`의 `preview`, 사내 배포)도 설정돼 있다. 케이블 없이 링크로 설치해야 할 때만 쓴다. 빌드 횟수를 쓴다.

1. `cd mobile && npx eas-cli whoami`로 계정(wlrnjs)을 확인한다
2. 새 폰이면 등록한다: `npx eas-cli device:create`
3. `npx eas-cli build -p ios --profile preview`. 끝나면 나오는 링크를 폰에서 열어 설치한다

번들 ID는 `com.jaksim6.app`으로 두었다. Apple에서 이미 쓰는 ID면 `app.json`에서 바꾼다.

### 앱 E2E(Maestro)

`mobile/.maestro/`에 앱을 직접 눌러 보는 흐름이 있다(처음 켜기부터 첫 레슨 완료까지, 튜터 키보드와 대화 스크롤 포함). Maestro는 실제 아이폰을 지원하지 않아 시뮬레이터에서 돌린다.

1. 웹 서버를 켜고(`DEV_ORIGINS=<맥 IP> pnpm dev`) 데이터를 처음으로 돌린다: `pnpm db:reset`
2. 시뮬레이터에 Release 빌드를 깐다: `cd mobile && npm run ios:release -- --device "<시뮬레이터 이름>"`
3. `maestro test .maestro` (화면 캡처는 `~/.maestro/tests/<시각>/` 아래에 남는다)
