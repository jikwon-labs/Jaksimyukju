import { type BrowserContext, expect, type Page, test, type TestInfo } from "@playwright/test";
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
  const shared = page.getByTestId("notif-item").filter({ hasText: "나님이 다음 주 다짐을 공유했어요" });
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
  await expect(page.getByTestId("topic-나")).not.toHaveText("주제 비공개");
  await expect(page.getByTestId("topic-서연")).toHaveText("주제 비공개");
  await expect(page.getByTestId("topic-민지")).toHaveText("영어 회화");
  await expect(page.getByTestId("visibility-topic")).toHaveAttribute("aria-checked", "true");

  await page.getByTestId("visibility-grass").click();
  await expect(page.getByTestId("visibility-grass")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("topic-나")).toHaveText("주제 비공개");
  await page.reload();
  await expect(page.getByTestId("visibility-grass")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("topic-나")).toHaveText("주제 비공개");
  await expect(page.getByTestId("topic-서연")).toHaveText("주제 비공개");
  await shot(page, info, "more-group-visibility");

  // 다른 멤버가 봐도 내 주제는 감춰져 있다
  await loginDemo(page, "/group", undefined, "demo-minji");
  await expect(page.getByTestId("topic-나")).toHaveText("주제 비공개");
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

test("20. 레슨 완료 화면 계정 연결: 한 번 연결하면 다음 완료에는 안 나온다", async ({ page, context }, info) => {
  await onboard(page, "영어 회화");
  await finishShortFromHome(page);
  const card = page.getByTestId("link-account");
  await expect(card).toBeVisible();
  await page.getByTestId("link-email").click();
  // 잘못된 주소는 막힌다
  await page.getByTestId("link-email-input").fill("not-an-email");
  await page.getByTestId("link-submit").click();
  await expect(page.getByTestId("link-done")).toHaveCount(0);
  const email = `guest-${info.project.name}@example.com`;
  await page.getByTestId("link-email-input").fill(email);
  await page.getByTestId("link-submit").click();
  await expect(page.getByTestId("link-done")).toContainText("계정을 연결했어요");
  await shot(page, info, "more-link-account");

  await page.goto("/profile");
  await expect(page.getByRole("link", { name: /계정/ })).toContainText(email);

  // 다음 학습일에 다시 완료한다
  const next = nthStudyDayAfter(seedToday(), 1);
  await context.addCookies([{ name: "j6_now", value: next, domain: "localhost", path: "/" }]);
  await finishShortFromHome(page);
  await expect(page.getByRole("region", { name: "오늘 배운 한 줄" })).toBeVisible();
  await expect(page.getByTestId("link-account")).toHaveCount(0);
});
