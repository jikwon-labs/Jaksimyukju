import { expect, type Page, test, type TestInfo } from "@playwright/test";
import { addDays } from "../lib/domain/dates";
import { filledCells, loginDemo, nthStudyDayAfter, resetDb, seedToday, shot, streak } from "./helpers";

async function onboard(page: Page, info: TestInfo, topic = "사진 보정") {
  await page.goto("/");
  await shot(page, info, "01-welcome");
  await page.getByTestId("start").click();
  await expect(page).toHaveURL(/\/start\/personality/);
  for (let i = 0; i < 3; i++) {
    await page.getByTestId("personality-option").first().click();
  }
  await page.getByTestId("personality-next").click();
  await expect(page).toHaveURL(/\/start\/teacher/);
  await shot(page, info, "02-teacher");
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
  await shot(page, info, "03-preview");
  await page.getByTestId("preview-start").click();
  await expect(page).toHaveURL(/\/home/);
}

test.beforeEach(() => {
  resetDb();
});

test("1. 처음 시작부터 첫 레슨 완료: 잔디 한 칸, 연속 1", async ({ page }, info) => {
  await onboard(page, info);
  const before = await filledCells(page);
  expect(await streak(page)).toBe(0);

  await page.getByRole("link", { name: "학습 시작" }).click();
  await expect(page.getByTestId("lesson-title")).toBeVisible();
  await page.getByTestId("lesson-cta").click();
  await expect(page).toHaveURL(/\/tutor/);
  for (const answer of ["보정은 사진의 느낌을 바꾸는 작업이에요.", "여행 사진의 밝기를 먼저 맞추면 돼요."]) {
    await page.getByTestId("tutor-input").fill(answer);
    await page.getByTestId("tutor-send").click();
    await expect(page.getByTestId("tutor-input")).toHaveValue("");
  }
  await expect(page.getByTestId("tutor-complete")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("tutor-complete").click();
  await expect(page).toHaveURL(/\/complete/);
  await shot(page, info, "04-complete");
  await page.goto("/home");
  expect(await filledCells(page)).toBe(before + 1);
  expect(await streak(page)).toBe(1);
  await shot(page, info, "05-home-after");
});

test("2. 5분 버전 완료: 연한 칸(단계 1)", async ({ page }, info) => {
  await loginDemo(page, "/home");
  const today = seedToday();
  await page.getByRole("link", { name: "5분 버전" }).click();
  await expect(page.getByTestId("mode-short")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("finish-short").click();
  await expect(page).toHaveURL(/\/complete/);
  await page.goto("/home");
  const cell = page.locator(`[data-testid="grass"] [data-day="${today}"]`);
  await expect(cell).toHaveAttribute("data-level", "1");
  await shot(page, info, "06-short-home");
});

test("3. 이틀 빈 상태에서 앱 열기: 복귀 → 재조정 → 홈", async ({ page }, info) => {
  const today = seedToday();
  // 데모는 어제까지 학습. 오늘부터 학습일 2개를 비운 다음 학습일로 간다
  const later = nthStudyDayAfter(addDays(today, -1), 3);
  await loginDemo(page, "/home", later);
  await expect(page).toHaveURL(/\/comeback/);
  await shot(page, info, "07-comeback");
  await page.getByTestId("replan-squeeze").click();
  await page.getByTestId("comeback-submit").click();
  await expect(page).toHaveURL(/\/home/);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/home/);
});

test("4. 쉬어 가기 예약: 연속이 유지된다", async ({ page }, info) => {
  const today = seedToday();
  await loginDemo(page, "/home");
  const s0 = await streak(page);
  const d1 = nthStudyDayAfter(addDays(today, -1), 1);
  const d2 = nthStudyDayAfter(addDays(today, -1), 2);
  await page.goto("/pause");
  // 목업 기본값(다음 주 5일)을 모두 풀고 이틀만 고른다
  const pressed = page.locator('[data-testid^="pause-day-"][aria-pressed="true"]');
  while ((await pressed.count()) > 0) await pressed.first().click();
  await page.getByTestId(`pause-day-${d1}`).click();
  await page.getByTestId(`pause-day-${d2}`).click();
  await expect(page.getByTestId("pause-submit")).toContainText("2일 쉬어 가기");
  await shot(page, info, "08-pause");
  await page.getByTestId("pause-submit").click();
  await expect(page.getByText("2일 쉬어 가기를 예약했어요")).toBeVisible();
  const after = nthStudyDayAfter(d2, 1);
  await loginDemo(page, "/home", after);
  await expect(page).toHaveURL(/\/home/);
  expect(await streak(page)).toBe(s0);
  await shot(page, info, "09-pause-home");
});

test("5. 커리큘럼 지도 칸 → 퀴즈 → 마일스톤", async ({ page }, info) => {
  await loginDemo(page, "/curriculum");
  await shot(page, info, "10-curriculum");
  // 오늘 칸을 누르면 설명 카드가 열린다
  await page.locator('[data-testid^="map-node-"][data-state="today"]').first().click();
  await expect(page.getByTestId("popover")).toBeVisible();
  await expect(page.getByTestId("popover-cta")).toHaveText("학습 시작");
  // 같은 칸을 다시 누르면 닫힌다. 그다음 같은 주의 퀴즈 칸 -> 설명 카드의 퀴즈 풀기
  await page.locator('[data-testid^="map-node-"][data-state="today"]').first().click();
  await expect(page.getByTestId("popover")).toHaveCount(0);
  const quizNode = page.locator('[data-testid^="map-node-2-"][data-kind="quiz"]');
  await quizNode.scrollIntoViewIfNeeded();
  await quizNode.click();
  await expect(page.getByTestId("popover-cta")).toHaveText("퀴즈 풀기");
  await page.getByTestId("popover-cta").click();
  await expect(page).toHaveURL(/\/quiz\/2/);
  for (let i = 0; i < 3; i++) {
    await page.getByTestId("quiz-choice-0").click();
    await page.getByTestId("quiz-next").click();
  }
  await expect(page.getByTestId("quiz-score")).toBeVisible();
  await shot(page, info, "11-quiz");
  await page.getByRole("link", { name: /마일스톤/ }).first().click();
  await expect(page).toHaveURL(/\/milestone\/2/);
  await page.getByTestId("milestone-input").fill("영업활동: 120억 플러스.\n투자활동: 설비 40억.\n재무활동: 대출 10억 상환.\n그래서 현금은 넉넉하다.");
  await page.getByTestId("milestone-submit").click();
  await expect(page.getByTestId("milestone-status")).toContainText(/통과|충족/, { timeout: 15_000 });
  await shot(page, info, "12-milestone");
});

test("6. 그룹 콕 찌르기: 두 번째는 막힌다", async ({ page }, info) => {
  await loginDemo(page, "/group");
  const btn = page.getByTestId("nudge-준호").getByRole("button");
  await btn.click();
  await expect(page.getByTestId("nudge-준호").getByRole("status")).toContainText("콕 찔렀어요");
  await page.reload();
  await page.getByTestId("nudge-준호").getByRole("button").click();
  await expect(page.getByTestId("nudge-준호").getByRole("status")).toContainText("이미");
  await shot(page, info, "13-group");
});

test("7. 설정에서 다크 전환: 배경 색이 바뀐다", async ({ page }, info) => {
  await loginDemo(page, "/settings");
  await page.getByRole("radio", { name: "화이트" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.getByRole("radio", { name: "다크" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(17, 17, 20)");
  await page.reload();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(17, 17, 20)");
  await shot(page, info, "14-settings-dark");
});

test("8. 오프라인에서 저장된 레슨 읽기", async ({ page, context }, info) => {
  await loginDemo(page, "/home");
  await page.getByRole("link", { name: "학습 시작" }).click();
  const title = await page.getByTestId("lesson-title").innerText();
  await context.setOffline(true);
  await expect(page.getByTestId("offline-banner")).toBeVisible();
  await expect(page.getByTestId("lesson-title")).toHaveText(title);
  await shot(page, info, "15-offline");
  await context.setOffline(false);
});

test("9. 초대 링크로 들어와 시작하면 그 그룹에 들어간다", async ({ page, context }, info) => {
  // 데모가 초대 링크를 새로 만들면 예전 코드(JAKSIM6)는 못 쓴다. 그래서 새 코드로 들어와야만 그룹에 들어간다
  await loginDemo(page, "/group/invite");
  await page.getByTestId("regenerate-invite").click();
  await expect(page.getByTestId("invite-link")).not.toContainText("JAKSIM6");
  const link = (await page.getByTestId("invite-link").innerText()).trim();
  const code = link.split("/invite/")[1];
  expect(code).toBeTruthy();
  await context.clearCookies();
  await page.goto(`/invite/${code}`);
  await expect(page.getByTestId("invite-group-name")).toContainText("퇴근 후 공부방");
  await page.getByTestId("join-group").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("inviter")).toContainText("민지");
  await onboard(page, info, "영어 회화");
  await page.goto("/group");
  await expect(page.getByTestId("group-member-민지")).toBeVisible();
  await shot(page, info, "16-invite-group");
});
