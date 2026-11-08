import { expect, type Page, test } from "@playwright/test";
import { loginDemo, resetDb } from "./helpers";

const FINANCE = "재무제표 읽기";

/** 내 과정 → 새 과정 추가 → 주제·학습 시간 → 미리보기 → 홈 */
async function addCourse(page: Page, topic: string) {
  await page.goto("/courses");
  await page.getByTestId("course-add").click();
  await expect(page).toHaveURL(/\/start\/topic\?from=add/);
  await page.getByTestId("topic-input").fill(topic);
  await page.getByTestId("send").click();
  await page.getByTestId("topic-input").fill(`${topic} 기초를 한 달 안에 익히기`);
  await page.getByTestId("send").click();
  await page.getByTestId("level-option").first().click();
  await page.getByTestId("topic-next").click();
  await expect(page).toHaveURL(/\/start\/schedule/);
  await page.getByTestId("schedule-next").click();
  // 데모 계정은 AI 동의 전이라 처음 한 번은 동의 화면을 거친다
  const start = page.getByTestId("preview-start");
  const agree = page.getByTestId("ai-consent-agree");
  await expect(start.or(agree)).toBeVisible({ timeout: 20_000 });
  if (await agree.isVisible()) {
    await agree.click();
    await expect(start).toBeVisible({ timeout: 20_000 });
  }
  await page.getByTestId("preview-start").click();
  await expect(page).toHaveURL(/\/home/);
}

test.beforeEach(() => {
  resetDb();
});

test("과정을 하나 더 열면 두 과정을 오가며 하고, 하나를 그만둘 수 있다", async ({ page }) => {
  await loginDemo(page);
  await expect(page.getByTestId("course-switch")).toContainText(FINANCE);

  await addCourse(page, "영어 회화");
  // 새 과정을 바로 본다. 원래 과정은 멈추지 않고 함께 간다
  await expect(page.getByTestId("course-switch")).toContainText("영어 회화");
  await page.getByTestId("course-switch").click();
  await expect(page).toHaveURL(/\/courses/);
  await expect(page.getByTestId(`course-${FINANCE}`)).toBeVisible();
  await expect(page.getByTestId("course-영어 회화")).toContainText("보는 중");

  // 원래 과정으로 돌아가면 그 과정의 잔디와 기록이 그대로다
  await page.getByTestId(`focus-${FINANCE}`).click();
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByTestId("course-switch")).toContainText(FINANCE);
  await page.goto("/curriculum");
  await expect(page.getByText(FINANCE).first()).toBeVisible();

  // 새 과정을 그만두면 목록에서 빠지고 지난 과정에 남는다
  await page.goto("/courses");
  await page.getByTestId("stop-영어 회화").click();
  await page.getByTestId("stop-confirm-영어 회화").click();
  await expect(page).toHaveURL(/\/courses/);
  await expect(page.getByTestId("course-영어 회화")).toHaveCount(0);
  await page.goto("/profile");
  await expect(page.locator("#past")).toContainText("영어 회화");
});

test("진행 중 과정이 3개면 더 열 수 없다", async ({ page }) => {
  await loginDemo(page);
  await addCourse(page, "영어 회화");
  await addCourse(page, "사진 보정");
  await page.goto("/courses");
  await expect(page.getByTestId("course-add")).toBeDisabled();
  await expect(page.getByRole("note")).toContainText("3개까지");
});
