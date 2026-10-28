# 구현 규칙 (화면 작업용)

## 구조

- `app/(app)/<route>/page.tsx` 화면(서버 컴포넌트 기본). 상호작용은 같은 폴더의 `*.client.tsx` 클라이언트 컴포넌트로 뺀다.
- 스타일은 같은 폴더의 CSS Module. 색은 반드시 CSS 변수 토큰만 쓴다(하드코딩 금지, 목업이 하드코딩한 고정색은 예외).
  - 팔레트: `--bg --surface --ink --sub --line --future --tab --card-border --good --good-bg --warn --warn-bg --knob-off`
  - 선생님 강조: `--a-text --a-tint --a-btn-bg --a-btn-ink --a-glow --a-shadow --t-body --t-deep --t-tint`
  - 잔디 단계: `--g1 --g2 --g3 --g4`
  - 목업의 `p.xxx`는 `var(--xxx)`, `a.btnBg`는 `var(--a-btn-bg)`처럼 옮긴다. `p.cardBorder`는 `border: var(--card-border)`.
  - 다크 전용 값이 필요하면 `:global(html[data-theme="dark"]) .x {}`와 `@media (prefers-color-scheme: dark) { :global(html[data-theme="system"]) .x {} }` 두 곳에 둔다(예: `app/(app)/home/home.module.css` 아바타).
- 제목 글꼴(Jua)은 `font-family: var(--font-title), "Jua", sans-serif; font-weight: 400`.
- 서버 액션: `app/actions/<영역>.ts` (`"use server"`). Route Handler: `app/api/<이름>/route.ts`.
- 서버 로직: `lib/server/<영역>.ts` (`import "server-only"`). 순수 함수는 `lib/domain/`(테스트 필수).

## 공용 코드 (읽고 쓰기만, 고치지 말 것)

- `lib/auth.ts` `getSessionUser()`, `signIn(user)`(쿠키 세션 + 선생님 쿠키), `createGuest()`, `linkAccount()`
- `lib/clock.ts` `getToday()`(개발 모드에서는 `j6_now` 쿠키로 날짜 조작), `getHour()`, `getNow()`
- `lib/server/course.ts` `loadState(user, today)` → `CourseState`(course, cal, levels, view, streak, longest, grass, missed, comeback, restUsed, restLeft, restingToday, studiedToday), `teacherOf(user)`, `lessonBody()`, `quizOf()`, `json()`, `pendingOrders()`, `quizPercent()`, `createCourse()`
- `lib/server/group.ts` `getGroupView(user, today)`, `sendNudge()`; `app/actions/group.ts` `nudgeAction`
- `lib/domain/` 날짜(`dates.ts`), 쉼 규칙(`rest.ts`: 연속, 잔디, 복귀, `replan`, `validatePause`, `PAUSE_LIMIT`), 과정 칸(`course.ts`: `buildCourseView`, `shortPath`), 지도(`map.ts`), 알림 제한(`limits.ts`)
- `lib/ai` `getAi()`(키 없으면 mock), `getLibrarian()`, 타입. 선생님 문구 `lib/ai/teachers.ts`의 `LINES`, 시스템 프롬프트 `systemPrompt()`
- `components/ui` `Page`(tabs면 하단 탭), `BackHeader`, `Button`, `ButtonLink`, `Card`, `Chip`, `Pill`, `Switch`, `TabBar`; `components/teacher/Teacher`(`who state size jump`), `components/course/Grass`, `ShortPath`, `STEP_ICONS`; `components/ThemeControl`(테마 즉시 반영), `components/NudgeButton`
- 공용 파일을 꼭 바꿔야 하면 바꾸지 말고 보고에 "필요한 변경"으로 적는다. 새 export가 필요하면 자기 영역 새 파일에 만든다.

## 데이터 규칙

- 레슨 상태: `todo | done | short(5분 버전) | summary(요약으로 넘김) | merged(압축으로 합침)`. 완료 시 `completedDay`(YYYY-MM-DD, `getToday()`), `completedAt`.
- 잔디 단계는 활동에서 계산된다: short 1, done 2, done+`tutorChecked` 3, 퀴즈·마일스톤 제출한 날 4.
- 마일스톤 통과 = `milestone_submissions.feedback.passed === true`. 퀴즈 점수 = 맞힌 개수(0~3), 표시는 `quizPercent()`.
- 쉼 = `rest_days` 행. 복귀 처리 = `courses.comebackDay = 오늘`, `courses.replan = delay|squeeze|skip`.
- 그룹에는 튜터 대화, 퀴즈 점수, 마일스톤 내용을 절대 내보내지 않는다. 주제는 `visibility = grass_topic`일 때만.
- 알림은 `notifications` 테이블에만 쓴다(실제 푸시·이메일 없음).
- 선생님 바꾸기: `users.teacher` 갱신 + `signIn(user)` 다시 호출(쿠키 갱신). 클라이언트에서 즉시 바꾸려면 `document.documentElement.dataset.teacher = "결"`.

## 경로 지도

| 화면 | 경로 |
|---|---|
| 시작·로그인 | `/` |
| 성향 질문 / 선생님 / 주제 / 학습 시간 / 커리큘럼 만들기 | `/start/personality` `/start/teacher` `/start/topic` `/start/schedule` `/start/preview` |
| 홈 | `/home` |
| 레슨 / 5분 버전 / 튜터 / 레슨 완료 | `/lesson/[id]` `/lesson/[id]?mode=short` `/lesson/[id]/tutor` `/lesson/[id]/complete` |
| 자료 상세 | `/resource/[id]` |
| 커리큘럼 / 퀴즈 / 마일스톤 / 목적지 | `/curriculum` `/quiz/[week]` `/milestone/[week]` `/finish` |
| 그룹 / 초대 보내기 / 초대 받기 | `/group` `/group/invite` `/invite/[code]` |
| 알림 / 내 정보 / 설정 / 쉬어 가기 | `/notifications` `/profile` `/settings` `/pause` |
| 복귀 / 주간 회고 / 빈 상태·오류 모음 | `/comeback` `/retro` `/states` |
| 개발용 | `/api/dev/login?as=demo-me&to=/home&now=YYYY-MM-DD` (데모 로그인 + 날짜 조작, `now=`는 해제) |

화면은 로그인 안 됐으면 `redirect("/")`, 과정이 없으면 `redirect("/start/personality")`.

## 접근성·모션

- 버튼·링크 높이 44px 이상, `:focus-visible` 윤곽선, 상태 바뀌는 곳은 `aria-live`, 토글은 `aria-pressed`/`role="switch"`/`role="radio"`.
- E2E가 잡기 쉽게 핵심 요소에 `data-testid`를 둔다.
- 모션 클래스는 `app/motion.css`(ci-*, sl-*, mp-pulse). 새 키프레임은 CSS Module에 두고 `@media (prefers-reduced-motion: reduce)`에서 끈다.

## 검증

- `pnpm typecheck`, `pnpm lint`, `pnpm test`. `pnpm build`는 여러 작업이 동시에 돌면 잠금 충돌이 나므로 돌리지 않는다(통합 때 돌린다).
- dev 서버는 이미 http://localhost:3100 에서 돌고 있다. 끄거나 새로 띄우지 않는다. 화면 확인은 Playwright 스크립트로 캡처한다(`@playwright/test`의 `chromium`, 390x844, colorScheme light/dark).
- `pnpm db:reset`은 돌리지 않는다(다른 작업과 DB를 같이 쓴다). 데모 데이터가 바뀌어도 괜찮다.
- 3000 포트는 건드리지 않는다. git 커밋은 하지 않는다. 테스트를 지우거나 `@ts-ignore`, `eslint-disable`, `any`로 덮지 않는다.
- 문서·주석·커밋 메시지에 이모지 금지. 화면 문구는 목업을 따른다.
