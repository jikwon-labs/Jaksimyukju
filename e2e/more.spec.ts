import { type BrowserContext, expect, type Page, test, type TestInfo } from "@playwright/test";
import { execSync } from "node:child_process";
import { addDays } from "../lib/domain/dates";
import { loginDemo, nthStudyDayAfter, resetDb, seedToday, shot, streak } from "./helpers";

const AI_FAIL = "j6_ai_fail";

async function setAiFail(context: BrowserContext, on: boolean) {
  if (on) await context.addCookies([{ name: AI_FAIL, value: "1", domain: "localhost", path: "/" }]);
  else await context.clearCookies({ name: AI_FAIL });
}

/** flows.spec.ts의 onboard()와 같은 순서로 새 게스트를 만든다 */
async function onboard(page: Page, topic = "사진 보정") {
  await page.goto("/");
  await page.getByTestId("start").click();
  await expect(page).toHaveURL(/\/start\/personality/);
  for (let i = 0; i < 3; i++) {
    await page.getByTestId("personality-option").first().click();
  }
  await page.getByTestId("personality-next").click();
  await expect(page).toHaveURL(/\/start\/teacher/);
  await page.getByTestId("teacher-next").click();
  await expect(page).toHaveURL(/\/start\/topic/);
  await page.getByTestId("topic-input").fill(topic);
  await page.getByTestId("send").click();
  await page.getByTestId("topic-input").fill("여행 사진 10장을 내 느낌대로 보정하기");
  await page.getByTestId("send").click();
  await page.getByTestId("level-option").first().click();
  await page.getByTestId("topic-next").click();
  await expect(page).toHaveURL(/\/start\/schedule/);
  await page.getByTestId("schedule-next").click();
  await expect(page).toHaveURL(/\/start\/preview/);
  await expect(page.getByTestId("preview-start")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("preview-start").click();
  await expect(page).toHaveURL(/\/home/);
}

/** 홈에서 5분 버전으로 오늘 레슨을 끝내고 완료 화면까지 간다 */
async function finishShortFromHome(page: Page) {
  await page.goto("/home");
  await page.getByRole("link", { name: "5분 버전" }).click();
  await expect(page.getByTestId("mode-short")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("finish-short").click();
  await expect(page).toHaveURL(/\/complete/);
}

/** 커리큘럼 목록 보기로 바꾼다 */
async function openList(page: Page) {
  await page.goto("/curriculum");
  await page.getByTestId("view-list").click();
  await expect(page.getByTestId("view-list")).toHaveAttribute("aria-pressed", "true");
}

/** 목록 보기에서 "오늘" 꼬리표가 붙은 줄의 제목 */
async function todayRowTitle(page: Page): Promise<string> {
  const row = page.locator('[data-state="today"]').filter({ has: page.locator('[data-tag="오늘"]') });
  await expect(row).toHaveCount(1);
  return (await row.locator("span").nth(2).innerText()).trim();
}

/** 이틀 비운 다음 학습일로 가서 복귀 화면에서 kind로 다시 짠다 */
async function comebackWith(page: Page, info: TestInfo, kind: "delay" | "squeeze" | "skip") {
  const later = nthStudyDayAfter(addDays(seedToday(), -1), 3);
  await loginDemo(page, "/home", later);
  await expect(page).toHaveURL(/\/comeback/);
  await page.getByTestId(`replan-${kind}`).click();
  await expect(page.getByTestId(`replan-${kind}`)).toHaveAttribute("aria-checked", "true");
  await shot(page, info, `more-comeback-${kind}`);
  await page.getByTestId("comeback-submit").click();
  await expect(page).toHaveURL(/\/home/);
  return later;
}

test.beforeEach(() => {
  resetDb();
});

test("11. 알림 목록: 콕 찌르기가 눈에 띄고, 모두 읽음이면 홈 종이 0개", async ({ page }, info) => {
  await loginDemo(page, "/home");
  await expect(page.getByRole("link", { name: "알림 2개" })).toBeVisible();
  await page.getByRole("link", { name: "알림 2개" }).click();
  await expect(page).toHaveURL(/\/notifications/);

  const items = page.getByTestId("notif-item");
  await expect(items).toHaveCount(3);
  const nudge = page.locator('[data-testid="notif-item"][data-kind="nudge"]');
  await expect(nudge).toBeVisible();
  await expect(nudge).toContainText("민지님이 콕 찔렀어요");
  await expect(nudge).toContainText("지금 5분 하기");
  await expect(nudge).toHaveAttribute("data-hot", "true");
  await expect(page.locator('[data-testid="notif-item"][data-unread="true"]')).toHaveCount(2);
  await expect(page.getByText("읽지 않은 알림 2개")).toBeAttached();
  await shot(page, info, "more-notifications");

  await page.getByTestId("mark-all-read").click();
  await expect(page.locator('[data-testid="notif-item"][data-unread="true"]')).toHaveCount(0);
  await expect(page.getByTestId("mark-all-read")).toHaveCount(0);
  await expect(page.getByText("모두 읽었어요")).toBeAttached();
  // 읽은 뒤에는 콕 찌르기도 더 이상 강조하지 않는다
  await expect(nudge).toHaveAttribute("data-hot", "false");

  await page.goto("/home");
  await expect(page.getByRole("link", { name: "알림 0개" })).toBeVisible();
});

test("12. 내 정보에서 선생님 바꾸기: 색은 바로, 진도는 그대로", async ({ page }, info) => {
  await loginDemo(page, "/home");
  const s0 = await streak(page);
  await expect(page.locator("html")).toHaveAttribute("data-teacher", "온");

  await page.goto("/profile");
  await page.getByTestId("teacher-change").click();
  await page.getByTestId("teacher-결").click();
  await expect(page.locator("html")).toHaveAttribute("data-teacher", "결");
  await expect(page.getByTestId("teacher-결")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("결 선생님으로 바꿨어요. 진도는 그대로예요")).toBeVisible();
  await shot(page, info, "more-profile-teacher");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-teacher", "결");
  await expect(page.getByRole("region", { name: "내 선생님" })).toContainText("단호하고 성격 급한 코치");

  await page.goto("/home");
  await expect(page.locator("html")).toHaveAttribute("data-teacher", "결");
  expect(await streak(page)).toBe(s0);
  await expect(page.getByText("결 선생님", { exact: true })).toBeVisible();
  await expect(page.getByText(/이번 주 목표까지 레슨 2개 남았습니다|오늘 몫은 끝냈어요/)).toBeVisible();
});

test("13. 주간 회고: 질문 3개 → 다짐 카드 → 저장 → 그룹에 다짐 알림", async ({ page }, info) => {
  // 알림은 밤 11시~아침 7시에 막히므로 오후 8시로 고정한다
  const today = seedToday();
  await loginDemo(page, "/retro", today);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("주차 돌아보기");
  const answers = ["재무상태표는 읽을 만했어요", "현금흐름표가 헷갈렸어요", "다음 주도 평일 저녁에 10분씩"];
  for (const a of answers) {
    await expect(page.getByTestId("retro-input")).toBeVisible();
    await page.getByTestId("retro-input").fill(a);
    await page.getByTestId("retro-send").click();
    await expect(page.getByTestId("retro-chat")).toContainText(a);
  }
  await expect(page.getByTestId("pledge-card")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("pledge-card")).toContainText("주차 다짐 카드");
  await expect(page.getByRole("switch", { name: /그룹에 다짐 공유하기/ })).toBeVisible();
  await shot(page, info, "more-retro");
  await page.getByTestId("retro-save").click();
  await expect(page).toHaveURL(/\/home/);

  // 공유를 켜 둔 채 저장했으니 같은 그룹 민지에게 다짐 한 줄이 간다.
  // 세 번째 답(계획)은 다짐 문장에 들어갈 수 있으니, 앞의 두 답만 새지 않는지 본다
  await loginDemo(page, "/notifications", today, "demo-minji");
  const shared = page.getByTestId("notif-item").filter({ hasText: "지우님이 다음 주 다짐을 공유했어요" });
  await expect(shared).toHaveCount(1);
  for (const a of answers.slice(0, 2)) await expect(page.getByText(a)).toHaveCount(0);
});

test("14. 튜터 AI 실패: 내 말은 남고, 다시 물어보면 답이 온다", async ({ page, context }, info) => {
  await loginDemo(page, "/home");
  await page.getByRole("link", { name: "학습 시작" }).click();
  await expect(page.getByTestId("lesson-title")).toBeVisible();
  await page.getByTestId("lesson-cta").click();
  await expect(page).toHaveURL(/\/tutor/);
  // 첫 질문은 정상으로 받는다
  await expect(page.getByTestId("tutor-ai")).toHaveCount(1, { timeout: 15_000 });

  await setAiFail(context, true);
  const answer = "재무상태표는 한 시점의 재산과 빚을 보여 줘요.";
  await page.getByTestId("tutor-input").fill(answer);
  await page.getByTestId("tutor-send").click();
  await expect(page.getByTestId("tutor-failed")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("tutor-failed")).toContainText("선생님이 잠깐 말을 놓쳤어요");
  await expect(page.getByTestId("tutor-user").filter({ hasText: answer })).toBeVisible();
  await expect(page.getByTestId("tutor-ai")).toHaveCount(1);
  await shot(page, info, "more-tutor-failed");

  // 새로고침해도 내 말은 서버에 남아 있다
  await page.reload();
  await expect(page.getByTestId("tutor-user").filter({ hasText: answer })).toBeVisible();
  await expect(page.getByTestId("tutor-failed")).toBeVisible({ timeout: 15_000 });

  await setAiFail(context, false);
  await page.getByTestId("tutor-retry").click();
  await expect(page.getByTestId("tutor-ai")).toHaveCount(2, { timeout: 15_000 });
  await expect(page.getByTestId("tutor-failed")).toHaveCount(0);
  await expect(page.getByTestId("tutor-user").filter({ hasText: answer })).toHaveCount(1);
});

test("15. 마일스톤 AI 실패: 고쳐 쓰기로 돌아가도 쓴 글이 남는다", async ({ page, context }, info) => {
  await loginDemo(page, "/milestone/2");
  const draft = "영업활동: 120억 플러스.\n투자활동: 설비 40억.\n재무활동: 대출 10억 상환.\n그래서 현금은 넉넉하다.";
  await page.getByTestId("milestone-input").fill(draft);
  await setAiFail(context, true);
  await page.getByTestId("milestone-submit").click();
  const status = page.getByTestId("milestone-status");
  await expect(status).toHaveAttribute("data-stage", "failed", { timeout: 15_000 });
  await expect(status).toContainText("피드백 실패");
  await expect(status).toContainText("영업활동: 120억 플러스.");
  await shot(page, info, "more-milestone-failed");

  await page.getByRole("button", { name: "고쳐 쓰기" }).click();
  await expect(page.getByTestId("milestone-input")).toHaveValue(draft);

  await setAiFail(context, false);
  await page.getByTestId("milestone-submit").click();
  await expect(status).toHaveAttribute("data-stage", /passed|feedback/, { timeout: 15_000 });
  await expect(status).toContainText(/통과|충족/);
});

test("16. 없는 초대 코드: 오류 화면", async ({ page, context }, info) => {
  // 로그인한 사람
  await loginDemo(page, "/home");
  await page.goto("/invite/NOPE");
  await expect(page.getByTestId("invite-error")).toBeVisible();
  await expect(page.getByRole("heading", { name: "열 수 없는 초대 링크예요" })).toBeVisible();
  await expect(page.getByText("없는 링크")).toBeVisible();
  await expect(page.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/home");
  await expect(page.getByTestId("join-group")).toHaveCount(0);
  await shot(page, info, "more-invite-error");

  // 처음 온 사람
  await context.clearCookies();
  await page.goto("/invite/NOPE");
  await expect(page.getByTestId("invite-error")).toBeVisible();
  await expect(page.getByRole("link", { name: "처음 화면으로" })).toHaveAttribute("href", "/");
});

test("17. 그룹 공개 범위: 잔디만이면 내 주제가 감춰지고, 서연 주제는 늘 감춰진다", async ({ page }, info) => {
  await loginDemo(page, "/group");
  await expect(page.getByTestId("topic-지우")).not.toHaveText("주제 비공개");
  await expect(page.getByTestId("topic-서연")).toHaveText("주제 비공개");
  await expect(page.getByTestId("topic-민지")).toHaveText("영어 회화");
  await expect(page.getByTestId("visibility-topic")).toHaveAttribute("aria-checked", "true");

  await page.getByTestId("visibility-grass").click();
  await expect(page.getByTestId("visibility-grass")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("topic-지우")).toHaveText("주제 비공개");
  await page.reload();
  await expect(page.getByTestId("visibility-grass")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("topic-지우")).toHaveText("주제 비공개");
  await expect(page.getByTestId("topic-서연")).toHaveText("주제 비공개");
  await shot(page, info, "more-group-visibility");

  // 다른 멤버가 봐도 내 주제는 감춰져 있다
  await loginDemo(page, "/group", undefined, "demo-minji");
  await expect(page.getByTestId("topic-지우")).toHaveText("주제 비공개");
  await expect(page.getByTestId("topic-서연")).toHaveText("주제 비공개");
  await expect(page.getByText("디자인 기초")).toHaveCount(0);
});

test("17b. 공개 범위 저장 안내 문구의 조사", async ({ page }) => {
  // 받침이 있으면 "으로": "잔디만으로 바꿨어요"
  await loginDemo(page, "/group");
  await page.getByTestId("visibility-grass").click();
  await expect(page.getByRole("status").filter({ hasText: "바꿨어요" })).toHaveText("잔디만으로 바꿨어요");
});

test("18. 목적지: 지도 깃발에서 들어가면 남은 칸 수가 보인다", async ({ page }, info) => {
  await loginDemo(page, "/curriculum");
  const flag = page.getByTestId("finish-flag");
  await flag.scrollIntoViewIfNeeded();
  await expect(flag).toHaveAttribute("href", "/finish");
  await flag.click();
  await expect(page).toHaveURL(/\/finish/);
  const hero = page.getByRole("region", { name: "목적지까지" });
  await expect(hero).toHaveAttribute("data-finished", "false");
  const kicker = (await hero.getByText(/^목적지까지 \d+칸$/).innerText()).trim();
  expect(Number(kicker.replace(/[^0-9]/g, ""))).toBeGreaterThan(0);
  await expect(page.getByRole("region", { name: "과정 완료" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "지도로 돌아가기" })).toHaveAttribute("href", "/curriculum");
  await shot(page, info, "more-finish");
  await page.getByRole("link", { name: "지도로 돌아가기" }).click();
  await expect(page).toHaveURL(/\/curriculum/);
});

test("19a. 복귀 재조정 뒤로 미루기: 오늘 레슨은 그대로, 과정이 늘어난다", async ({ page }, info) => {
  await loginDemo(page, "/home");
  await openList(page);
  const before = await todayRowTitle(page);

  await comebackWith(page, info, "delay");
  await openList(page);
  expect(await todayRowTitle(page)).toBe(before);
  await expect(page.locator('[data-tag="요약"]')).toHaveCount(0);
  await expect(page.locator('[data-tag="합침"]')).toHaveCount(0);
  // 빈 날 2일만큼 과정이 늘어난다(6주 -> 6주 2일)
  await page.goto("/profile");
  await expect(page.getByRole("region", { name: "전체 잔디" })).toContainText("6주 2일 과정");
});

test("19b. 복귀 재조정 압축하기: 밀린 레슨에 합침 꼬리표", async ({ page }, info) => {
  await loginDemo(page, "/home");
  await openList(page);
  const before = await todayRowTitle(page);

  await comebackWith(page, info, "squeeze");
  await openList(page);
  const merged = page.locator('[data-tag="합침"]');
  await expect(merged.first()).toBeVisible();
  await expect(page.locator('[data-tag="요약"]')).toHaveCount(0);
  // 오늘이던 레슨이 합쳐지고 오늘 칸은 다음으로 넘어간다
  const row = page.locator("[data-state]").filter({ hasText: before }).filter({ has: page.locator('[data-tag="합침"]') });
  await expect(row).toHaveCount(1);
  await page.goto("/profile");
  await expect(page.getByRole("region", { name: "전체 잔디" })).toContainText("6주 과정");
});

test("19c. 복귀 재조정 요약으로 넘기기: 밀린 레슨에 요약 꼬리표", async ({ page }, info) => {
  await loginDemo(page, "/home");
  await openList(page);
  const before = await todayRowTitle(page);

  await comebackWith(page, info, "skip");
  await openList(page);
  await expect(page.locator('[data-tag="요약"]').first()).toBeVisible();
  await expect(page.locator('[data-tag="합침"]')).toHaveCount(0);
  const row = page.locator("[data-state]").filter({ hasText: before }).filter({ has: page.locator('[data-tag="요약"]') });
  await expect(row).toHaveCount(1);
  await page.goto("/profile");
  await expect(page.getByRole("region", { name: "전체 잔디" })).toContainText("6주 과정");
});

/** 개발용 가짜 공급자 화면에서 번호를 넣고 동의한다 */
async function fakeConsent(page: Page, sub: string, email = `${sub}@example.com`) {
  await expect(page.getByRole("heading", { name: /가짜 .+ 로그인/ })).toBeVisible();
  await page.getByLabel("사용자 번호").fill(sub);
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: "동의하고 계속하기" }).click();
}

test("20. 소셜 계정 연결: 실패하면 다시, 연결하면 로그아웃 뒤 같은 계정으로 기록이 돌아온다", async ({ page, context }, info) => {
  await onboard(page, "영어 회화");
  await finishShortFromHome(page);
  const done = page.url();
  await expect(page.getByTestId("link-account")).toBeVisible();

  // 공급자 오류(가짜 공급자는 fail로 시작하는 번호에서 토큰 교환을 실패시킨다)
  await page.getByTestId("link-kakao").click();
  await fakeConsent(page, "fail-1");
  await expect(page).toHaveURL(/link=failed/);
  await expect(page.getByTestId("link-error")).toContainText("연결하지 못했어요");

  // 취소
  await page.getByTestId("link-kakao").click();
  await page.getByRole("link", { name: "취소" }).click();
  await expect(page.getByTestId("link-error")).toContainText("취소");

  // 이미 데모 지우에게 붙은 카카오 계정은 다른 기록에 연결할 수 없다
  await page.getByTestId("link-kakao").click();
  await page.getByRole("button", { name: "데모 지우로 계속하기" }).click();
  await expect(page.getByTestId("link-error")).toContainText("이미 다른 기록");

  const sub = `e2e-${info.project.name}`;
  const email = `${sub}@example.com`;
  await page.getByTestId("link-google").click();
  await fakeConsent(page, sub);
  await expect(page).toHaveURL(new RegExp(new URL(done).pathname));
  await expect(page.getByTestId("link-done")).toContainText("계정을 연결했어요");
  await expect(page.getByTestId("link-account")).toHaveCount(0);
  await shot(page, info, "more-link-account");

  await page.goto("/profile");
  await expect(page.getByRole("link", { name: /계정/ })).toContainText(`Google · ${email}`);

  // 로그아웃 뒤 같은 구글 계정으로 들어오면 같은 기록(연속 1일)이 보인다
  await page.goto("/settings");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByTestId("have-account").click();
  await page.getByTestId("login-google").click();
  await fakeConsent(page, sub);
  await expect(page).toHaveURL(/\/home/);
  expect(await streak(page)).toBe(1);

  // 다음 학습일에 다시 완료해도 연결 카드는 나오지 않는다
  const next = nthStudyDayAfter(seedToday(), 1);
  await context.addCookies([{ name: "j6_now", value: next, domain: "localhost", path: "/" }]);
  await finishShortFromHome(page);
  await expect(page.getByRole("region", { name: "오늘 배운 한 줄" })).toBeVisible();
  await expect(page.getByTestId("link-account")).toHaveCount(0);
});

test("20b. 이미 계정이 있어요: 연결된 계정은 들어가고, 없는 계정과 위조한 콜백은 막는다", async ({ page }, info) => {
  await page.goto("/");
  await page.getByTestId("have-account").click();
  await page.getByTestId("login-kakao").click();
  await fakeConsent(page, `nobody-${info.project.name}`);
  await expect(page).toHaveURL(/login=none/);
  await expect(page.getByTestId("login-error")).toContainText("연결된 기록이 없어요");

  // state 쿠키 없이 콜백을 바로 열면 로그인되지 않는다
  await page.goto("/api/auth/kakao/callback?code=x&state=forged-state-value");
  await expect(page).toHaveURL(/login=failed/);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/$|\/start/);

  await page.goto("/");
  await page.getByTestId("have-account").click();
  await page.getByTestId("login-kakao").click();
  await page.getByRole("button", { name: "데모 지우로 계속하기" }).click();
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByText("재무제표").first()).toBeVisible();
});

test("20d. Apple 계정을 연결하면 로그아웃 뒤 Apple로 같은 기록에 들어온다", async ({ page }, info) => {
  await onboard(page, "영어 회화");
  await finishShortFromHome(page);
  await expect(page.getByTestId("link-apple")).toBeVisible();
  const sub = `apple-${info.project.name}`;
  await page.getByTestId("link-apple").click();
  await fakeConsent(page, sub);
  await expect(page.getByTestId("link-done")).toContainText("계정을 연결했어요");

  await page.goto("/profile");
  await expect(page.getByRole("link", { name: /계정/ })).toContainText("Apple");

  await page.goto("/settings");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByTestId("have-account").click();
  await page.getByTestId("login-apple").click();
  await fakeConsent(page, sub);
  await expect(page).toHaveURL(/\/home/);
  expect(await streak(page)).toBe(1);
});

test("20c. 로그인 뒤 돌아갈 주소(next)로 다른 사이트에 보낼 수 없다", async ({ page }) => {
  // 탭 문자를 끼우면 URL 해석기가 "//evil.example"로 바꾼다
  await page.goto("/api/auth/kakao/start?mode=login&next=%2F%09%2Fevil.example");
  await page.getByRole("button", { name: "데모 지우로 계속하기" }).click();
  await expect(page).toHaveURL(/^http:\/\/localhost:3100\/home/);
});

test("21. 학습일 하루를 비우면 다음 날 선생님 알림이 한 번 생긴다", async ({ page }) => {
  // 데모는 어제까지 학습. 오늘(학습일)을 비우고 다음 학습일에 연다 -> 빈 학습일 1개
  const next = nthStudyDayAfter(seedToday(), 1);
  await loginDemo(page, "/home", next);
  await expect(page).toHaveURL(/\/home/);
  await page.reload(); // 두 번 열어도 한 번만
  // 이어지는 쉬는 요일(주말)에 다시 열어도 같은 빈 날에 대한 알림은 늘지 않는다
  for (let k = 1; k <= 2; k++) {
    await loginDemo(page, "/home", addDays(next, k));
  }
  await page.goto("/notifications");
  const items = page.getByTestId("notif-item").filter({ hasText: "쉬어 갔네요" });
  await expect(items).toHaveCount(1);
});

test("22. 일요일에는 주간 회고 알림이 생기고 회고로 이어진다", async ({ page }) => {
  let sunday = seedToday();
  while (new Date(`${sunday}T00:00:00Z`).getUTCDay() !== 0) sunday = addDays(sunday, 1);
  await loginDemo(page, "/home", sunday, "demo-minji");
  await page.goto("/notifications");
  const retro = page.getByTestId("notif-item").filter({ hasText: "주간 회고" });
  await expect(retro).toHaveCount(1);
  await retro.click();
  await expect(page).toHaveURL(/\/retro/);
});

test("23. 레슨에서 '설명이 이상해요' 신고", async ({ page }) => {
  await loginDemo(page, "/home");
  await page.getByRole("link", { name: "학습 시작" }).click();
  await page.getByTestId("report-open").click();
  await page.getByRole("button", { name: "설명이 틀린 것 같아요" }).click();
  await expect(page.getByTestId("report-done")).toBeVisible();
});

test("24. 과정을 마치면 수료 카드를 PNG로 저장한다", async ({ page }) => {
  execSync("pnpm exec tsx e2e/finish-demo.ts", { stdio: "pipe" });
  await loginDemo(page, "/finish");
  const save = page.getByTestId("save-card");
  await expect(save).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), save.click()]);
  expect(download.suggestedFilename()).toMatch(/^작심육주-수료-.*\.png$/);
  await expect(save).toHaveText("수료 카드를 저장했어요");
  // 완주한 과정은 빈 날이 있어도 복귀 화면으로 보내지 않는다
  await loginDemo(page, "/home", nthStudyDayAfter(seedToday(), 5));
  await expect(page).toHaveURL(/\/home/);
});

test("25. 초대 링크는 7일 동안만 열린다", async ({ page, context }) => {
  // 시드 그룹 초대는 시드를 넣은 때부터 7일. 개발용 오늘(j6_now, 그날 오후 8시)로 앞뒤를 본다
  await context.addCookies([{ name: "j6_now", value: addDays(seedToday(), 6), domain: "localhost", path: "/" }]);
  await page.goto("/invite/JAKSIM6");
  await expect(page.getByRole("heading", { name: "초대 링크가 만료됐어요" })).toHaveCount(0);
  await expect(page.getByText("퇴근 후 공부방").first()).toBeVisible();

  await context.addCookies([{ name: "j6_now", value: addDays(seedToday(), 8), domain: "localhost", path: "/" }]);
  await page.goto("/invite/JAKSIM6");
  await expect(page.getByRole("heading", { name: "초대 링크가 만료됐어요" })).toBeVisible();
  // 첫 화면의 초대 문구도 사라진다
  await page.goto("/");
  await expect(page.getByTestId("inviter")).toHaveCount(0);
});

test("26. 연결 안 한 게스트는 로그아웃 전에 한 번 더 묻고, 설정에서 계정을 연결할 수 있다", async ({ page }, info) => {
  await onboard(page, "글쓰기");
  await page.goto("/settings");
  await expect(page.getByTestId("account-label")).toHaveText("게스트");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByTestId("logout-confirm")).toContainText("다시 열 수 없어요");
  await page.getByRole("button", { name: "취소" }).click();
  await expect(page.getByTestId("logout-confirm")).toHaveCount(0);

  await page.getByRole("link", { name: "Google로 연결" }).click();
  await fakeConsent(page, `settings-${info.project.name}`);
  await expect(page).toHaveURL(/\/settings\?link=linked/);
  await expect(page.getByTestId("link-done")).toBeVisible();
  await expect(page.getByTestId("account-label")).toContainText("Google");
  await expect(page.getByRole("link", { name: "Google로 연결" })).toHaveCount(0);
  // 연결한 뒤에는 묻지 않고 바로 로그아웃된다
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("26b. 연결 안 한 게스트가 그래도 로그아웃하면 첫 화면으로 간다", async ({ page }) => {
  await onboard(page, "글쓰기");
  await page.goto("/settings");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await page.getByRole("button", { name: "그래도 로그아웃" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/home");
  await expect(page).not.toHaveURL(/\/home/);
});

test("26c. 기록이 있는 게스트가 다른 계정으로 들어가려 하면 먼저 경고한다", async ({ page }) => {
  execSync("pnpm exec tsx e2e/stop-course.ts demo-junho", { stdio: "pipe" });
  await loginDemo(page, "/", undefined, "demo-junho");
  await page.getByTestId("have-account").click();
  await expect(page.getByTestId("guest-warning")).toBeVisible();
  await expect(page.getByTestId("login-kakao")).toBeHidden();
  await page.getByRole("button", { name: /알겠어요/ }).click();
  await expect(page.getByTestId("login-kakao")).toBeVisible();
});

test("27. 스케줄러: 학습 시각이 지나면 학습 시간 알림을 하루 한 번 남기고, 밤 11시 뒤에는 남기지 않는다", async ({ page }) => {
  const tick = async (day: string, time: string) => {
    const r = await page.request.post(`/api/cron/tick?now=${encodeURIComponent(`${day}T${time}:00+09:00`)}`);
    expect(r.ok()).toBe(true);
  };
  // 시드 알림이 시드 날에 이미 있어서 다음 학습일부터 본다. 데모의 알림 시각은 21:00
  const d1 = nthStudyDayAfter(seedToday(), 1);
  const d2 = nthStudyDayAfter(seedToday(), 2);
  const study = page.getByText("약속한 학습 시간이에요");
  const expectStudy = async (n: number) => {
    await loginDemo(page, "/notifications", d2);
    await expect(study).toHaveCount(n);
  };
  await tick(d1, "20:30"); // 알림 시각 전
  await expectStudy(0);
  await tick(d1, "21:10");
  await expectStudy(1);
  await tick(d1, "21:40"); // 같은 날 두 번째 tick
  await expectStudy(1);
  await tick(d2, "23:30"); // 밤 11시 뒤
  await expectStudy(1);
  await tick(d2, "21:10"); // 같은 날 학습 시각에는 남는다
  await expectStudy(2);
  // 남긴 알림은 푸시(mock 발송기)로도 보냈다
  expect(execSync("pnpm exec tsx e2e/count-pushed.ts demo-me '약속한 학습 시간'", { encoding: "utf8" }).trim()).toBe("2");
});

test("28. 시작 흐름의 첫 화면(서버 렌더)부터 고른 선생님 얼굴과 색이 나온다", async ({ page }) => {
  // 자바스크립트가 돌기 전 HTML을 본다. 쿠키에는 결 선생님을 골라 둔 상태
  for (const route of ["/start/topic", "/start/teacher", "/start/preview"]) {
    const res = await page.request.get(route, { headers: { cookie: `j6_teacher=${encodeURIComponent("결")}` } });
    const html = await res.text();
    expect(html.includes('data-teacher="결"'), `${route} html 강조색`).toBe(true);
    // 화면의 첫 선생님(대화 상대나 무대의 큰 얼굴)이 결이어야 한다. 고르기 화면 카드에는 셋이 다 나온다
    const first = html.match(/data-teacher-face="([^"-]+)-/)?.[1];
    expect(first, `${route} 첫 얼굴`).toBe("결");
  }
});

test("29. 자료 원문 열기: 웹은 새 탭 링크, 앱 껍데기 안에서는 인앱 브라우저로 넘긴다", async ({ page }) => {
  await loginDemo(page, "/home");
  await page.getByRole("link", { name: "학습 시작" }).click();
  await page.getByTestId("resource-row").first().click();
  await expect(page).toHaveURL(/\/resource\//);
  const open = page.getByTestId("resource-open");
  await expect(open).toHaveAttribute("target", "_blank");
  await expect(open).toHaveAttribute("href", /^https:\/\//);
  const href = await open.getAttribute("href");

  // 앱 껍데기(react-native-webview)가 넣어 주는 연결 통로를 흉내 낸다
  await page.evaluate(() => {
    const w = window as unknown as { ReactNativeWebView: { postMessage(m: string): void }; __sent: string[] };
    w.__sent = [];
    w.ReactNativeWebView = { postMessage: (m) => w.__sent.push(m) };
  });
  const popups: unknown[] = [];
  page.context().on("page", (p) => popups.push(p));
  await open.click();
  const sent = await page.evaluate(() => (window as unknown as { __sent: string[] }).__sent);
  expect(sent.map((m) => JSON.parse(m))).toEqual([{ type: "open-external", url: href }]);
  expect(popups).toHaveLength(0);
  await expect(page).toHaveURL(/\/resource\//);
});

test("30. 데모 로그인은 들어온 주소 그대로 돌려보낸다(폰에서 맥 IP로 열어도 localhost로 가지 않는다)", async ({ request }) => {
  const res = await request.get("http://127.0.0.1:3100/api/dev/login?as=demo-me&to=/home&now=", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toBe("/home");
  // 앱 밖 주소로는 보내지 않는다
  const evil = await request.get("http://127.0.0.1:3100/api/dev/login?as=demo-me&to=//evil.example", { maxRedirects: 0 });
  expect(evil.headers()["location"]).toBe("/home");
});

test("30b. 소셜 로그인(가짜 공급자)도 들어온 주소 그대로 돌려보낸다(폰에서 맥 IP로 열어도 localhost로 가지 않는다)", async ({ request }) => {
  const app = "http://127.0.0.1:3100";
  const start = await request.get(`${app}/api/auth/kakao/start?mode=login&next=/home`, { maxRedirects: 0 });
  expect(start.status()).toBe(307);
  const authorize = start.headers()["location"];
  expect(authorize).toMatch(/^\/api\/dev\/oauth\/authorize\?/);
  // 공급자에 보내는 redirect_uri는 등록한 주소와 맞춰야 해서 앞부분까지 있는 주소다
  const q = new URL(authorize, app).searchParams;
  const redirectUri = q.get("redirect_uri") ?? "";
  expect(redirectUri).toMatch(/^https?:\/\/[^/]+\/api\/auth\/kakao\/callback$/);

  const page = await request.get(`${app}${authorize}`);
  const cancel = /<a href="([^"]+)">취소<\/a>/.exec(await page.text())?.[1] ?? "";
  expect(cancel).toMatch(/^\/api\/auth\/kakao\/callback\?/);

  const consent = await request.post(`${app}/api/dev/oauth/authorize`, {
    form: {
      provider: "kakao",
      redirect_uri: redirectUri,
      state: q.get("state") ?? "",
      code_challenge: q.get("code_challenge") ?? "",
      demo: "1",
    },
    maxRedirects: 0,
  });
  expect(consent.status()).toBe(303);
  const callback = consent.headers()["location"];
  expect(callback).toMatch(/^\/api\/auth\/kakao\/callback\?/);

  const done = await request.get(`${app}${callback}`, { maxRedirects: 0 });
  expect(done.status()).toBe(307);
  expect(done.headers()["location"]).toBe("/home");

  // 위조한 콜백도 앱 안 경로로만 돌려보낸다
  const forged = await request.get(`${app}/api/auth/kakao/callback?code=x&state=forged-state-value`, { maxRedirects: 0 });
  expect(forged.headers()["location"]).toBe("/?login=failed");
});

test("31. 레슨을 마치면 평점과 후기를 남기고, 다시 열면 남긴 그대로 보인다", async ({ page }) => {
  await loginDemo(page, "/home");
  await page.getByRole("link", { name: "학습 시작" }).click();
  await page.getByTestId("lesson-cta").click();
  await expect(page).toHaveURL(/\/tutor/);
  for (const answer of ["재무상태표는 한 시점의 재산과 빚이에요.", "회사 숫자를 볼 때 먼저 써 볼게요."]) {
    await page.getByTestId("tutor-input").fill(answer);
    await page.getByTestId("tutor-send").click();
    await expect(page.getByTestId("tutor-input")).toHaveValue("");
  }
  await page.getByTestId("tutor-complete").click({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/complete/);
  const url = page.url();

  const rating = page.getByRole("radiogroup", { name: "오늘 수업 평점" });
  await expect(rating.getByRole("radio")).toHaveCount(5);
  await rating.getByRole("radio", { name: "4점" }).check({ force: true });
  await page.getByTestId("lesson-review").fill("예시가 회사 일과 닿아서 좋았어요.\n조금 길었어요.");
  await page.getByTestId("complete-home").click();
  await expect(page).toHaveURL(/\/home/);

  await page.goto(url);
  await expect(page.getByRole("radio", { name: "4점" })).toBeChecked();
  await expect(page.getByTestId("lesson-review")).toHaveValue("예시가 회사 일과 닿아서 좋았어요.\n조금 길었어요.");
});

test("32. 성향 질문의 뒤로: 둘째 질문에서는 이전 질문으로, 첫 질문에서는 시작 화면으로 간다", async ({ page }) => {
  await page.goto("/start/personality");
  await expect(page.getByText("질문 1 / 3")).toBeVisible();
  await page.getByTestId("personality-option").first().click();
  await expect(page.getByText("질문 2 / 3")).toBeVisible();
  await page.getByTestId("personality-prev").click();
  await expect(page.getByText("질문 1 / 3")).toBeVisible();
  // 첫 질문에는 돌아갈 질문이 없으니 시작 화면으로 간다
  await page.getByTestId("personality-prev").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("start")).toBeVisible();
});

/** 접힌 주차 배너를 모두 펼친다(멀리 있는 주차는 펼칠 수 없어 뺀다) */
async function openAllWeeks(page: Page) {
  const closed = page.locator('[data-testid^="week-banner-"][aria-expanded="false"]:not([aria-disabled])');
  const ids = await closed.evaluateAll((els) => els.map((el) => el.getAttribute("data-testid") ?? ""));
  for (const id of ids) {
    await page.getByTestId(id).click();
    await expect(page.getByTestId(id)).toHaveAttribute("aria-expanded", "true");
  }
}

test("33. 남긴 평점과 후기가 커리큘럼 지도 칸 설명 카드에 보이고, 후기 고치기로 완료 화면에 간다", async ({ page }) => {
  await loginDemo(page, "/curriculum");
  await openAllWeeks(page);
  const node = page.locator('[data-testid^="map-node-"][data-kind="lesson"][data-state="done"]').first();
  const nodeId = (await node.getAttribute("data-testid")) ?? "";
  expect(nodeId).toMatch(/^map-node-/);
  await node.click();
  const lessonHref = (await page.getByTestId("popover-cta").getAttribute("href")) ?? "";
  expect(lessonHref).toMatch(/^\/lesson\/[^/]+$/);

  // 끝낸 레슨의 완료 화면에서 별 4개와 후기를 남긴다
  await page.goto(`${lessonHref}/complete`);
  await page.getByRole("radiogroup", { name: "오늘 수업 평점" }).getByRole("radio", { name: "4점" }).check({ force: true });
  await page.getByTestId("lesson-review").fill("예시가 좋았어요.\n조금 길었어요.");
  await page.getByTestId("complete-home").click();
  await expect(page).toHaveURL(/\/home/);

  await page.goto("/curriculum");
  await openAllWeeks(page);
  await page.getByTestId(nodeId).click();
  const pop = page.getByTestId("popover");
  await expect(pop.getByRole("img", { name: "별 4개" })).toBeVisible();
  await expect(pop.getByTestId("popover-review")).toHaveText("예시가 좋았어요.\n조금 길었어요.");
  const edit = pop.getByRole("link", { name: "후기 고치기" });
  await expect(edit).toHaveAttribute("href", `${lessonHref}/complete`);
  await edit.click();
  await expect(page).toHaveURL(new RegExp(`${lessonHref}/complete$`));
  await expect(page.getByRole("radio", { name: "4점" })).toBeChecked();
});

/** 브라우저 TTS를 가짜로 바꿔, 읽은 문장과 목소리를 window.__spoken에 남긴다 */
async function fakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const voices = [
      { voiceURI: "yuna", name: "Yuna", lang: "ko-KR", localService: true, default: true },
      { voiceURI: "sora", name: "Sora (한국어(대한민국))", lang: "ko-KR", localService: true, default: false },
      { voiceURI: "sam", name: "Samantha", lang: "en-US", localService: true, default: false },
    ];
    const spoken: { text: string; voice: string | null; rate: number }[] = [];
    (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
    const fake = {
      getVoices: () => voices,
      speak: (u: SpeechSynthesisUtterance) => spoken.push({ text: u.text, voice: u.voice?.voiceURI ?? null, rate: u.rate }),
      cancel: () => {},
      resume: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    class FakeUtterance {
      text: string;
      lang = "";
      rate = 1;
      voice: { voiceURI: string } | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
  });
}

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: { text: string; voice: string | null; rate: number }[] }).__spoken);

test("29. 읽어 주기: 설정에서 목소리·속도를 고르면 레슨 듣기에 그대로 쓰고, 끄면 버튼이 사라진다", async ({ page }, info) => {
  await fakeSpeech(page);
  await loginDemo(page, "/settings");
  const box = page.getByTestId("speech-settings");
  await expect(box.getByRole("switch", { name: /레슨 읽어 주기/ })).toHaveAttribute("aria-checked", "true");
  // 한국어 목소리만, 언어 꼬리표는 떼고 보인다
  const voices = box.getByTestId("speech-voices").getByRole("radio");
  await expect(voices).toHaveText(["Yuna", "Sora"]);
  await voices.nth(1).click();
  await expect(voices.nth(1)).toHaveAttribute("aria-checked", "true");
  await box.getByTestId("speech-rates").getByRole("radio", { name: "1.2배" }).click();
  await shot(page, info, "speech-settings");

  await page.goto("/home");
  await page.getByRole("link", { name: "학습 시작" }).click();
  const listen = page.getByTestId("lesson-listen");
  await expect(listen).toBeVisible();
  const before = (await spoken(page)).length;
  await listen.click();
  await expect(listen).toHaveAttribute("aria-pressed", "true");
  await shot(page, info, "speech-lesson");
  const said = (await spoken(page)).slice(before);
  const title = await page.getByTestId("lesson-title").innerText();
  expect(said[0]).toEqual({ text: title, voice: "sora", rate: 1.2 });
  expect(said.some((x) => x.text.startsWith("핵심 한 줄."))).toBe(true);
  await listen.click();
  await expect(listen).toHaveAttribute("aria-pressed", "false");

  // 튜터의 선생님 말에도 듣기 버튼이 붙는다
  await page.getByTestId("lesson-cta").click();
  await expect(page.getByTestId("tutor-ai")).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByTestId("tutor-listen")).toHaveCount(1);
  await shot(page, info, "speech-tutor");

  await page.goto("/settings");
  await page.getByTestId("speech-settings").getByRole("switch", { name: /레슨 읽어 주기/ }).click();
  await page.goBack();
  await expect(page.getByTestId("tutor-ai")).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByTestId("tutor-listen")).toHaveCount(0);
});
