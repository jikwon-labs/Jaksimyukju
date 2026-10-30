import { expect, test } from "@playwright/test";
import { loginDemo, resetDb } from "./helpers";

// 가장 좁은 폰(320px)에서 가로 스크롤이 생기지 않는지 본다
const ROUTES = ["/home", "/curriculum", "/group", "/profile", "/settings", "/notifications", "/pause", "/quiz/2", "/milestone/2", "/finish", "/retro", "/states"];

test.beforeAll(() => {
  resetDb();
});

test.use({ viewport: { width: 320, height: 640 } });

test("시작 화면 320px", async ({ page }) => {
  await page.goto("/");
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
});

for (const route of ROUTES) {
  test(`가로 스크롤 없음 ${route}`, async ({ page }) => {
    await loginDemo(page, route);
    await page.waitForLoadState("networkidle");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, route).toBeLessThanOrEqual(0);
  });
}

// 학습 요일 버튼은 손가락으로 누를 수 있게 가로·세로 44px 이상(320px에서도)
for (const [route, sel] of [
  ["/settings", '[data-testid^="study-day-"]'],
  ["/start/schedule", '[data-testid^="day-"]'],
] as const) {
  test(`학습 요일 버튼 44px ${route}`, async ({ page }) => {
    if (route === "/settings") await loginDemo(page, route);
    else await page.goto(route);
    const boxes = await page.locator(sel).evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.width, r.height]));
    expect(boxes).toHaveLength(7);
    for (const [w, h] of boxes) {
      expect(w, route).toBeGreaterThanOrEqual(44);
      expect(h, route).toBeGreaterThanOrEqual(44);
    }
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(0);
  });
}

// iOS Safari는 글자가 16px보다 작은 입력칸에 초점이 가면 화면을 확대한다. 터치 기기에서는 16px 이상이어야 한다
test.describe("터치 기기 입력칸 글자 16px", () => {
  test.use({ hasTouch: true, isMobile: true });
  for (const route of ["/start/topic", "/milestone/2", "/retro"]) {
    test(`입력칸 16px ${route}`, async ({ page }) => {
      if (route.startsWith("/start")) await page.goto(route);
      else await loginDemo(page, route);
      const sizes = await page
        .locator('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]), textarea, select')
        .evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
      expect(sizes.length, route).toBeGreaterThan(0);
      for (const s of sizes) expect(s, route).toBeGreaterThanOrEqual(16);
    });
  }
});

// 12주 과정은 잔디가 길다. 좁은 폰에서도 잔디가 카드 밖으로 나가지 않고, 연속 기록 글자가 세로로 서지 않는다
for (const width of [320, 402]) {
  test(`12주 과정 홈 잔디 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.getByTestId("start").click();
    for (let i = 0; i < 3; i++) await page.getByTestId("personality-option").first().click();
    await page.getByTestId("personality-next").click();
    await page.getByTestId("teacher-next").click();
    await page.getByTestId("topic-input").fill("Node.js");
    await page.getByTestId("send").click();
    await page.getByTestId("topic-input").fill("혼자 결과물 하나 만들기");
    await page.getByTestId("send").click();
    await page.getByTestId("level-option").first().click();
    // 주제 정리 화면(아래 버튼 두 개)도 가로로 넘치지 않는다
    await expect(page.getByTestId("topic-next")).toBeVisible();
    const topicOver = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(topicOver, "주제 화면 가로 넘침").toBeLessThanOrEqual(0);
    await page.getByTestId("topic-next").click();
    await page.getByTestId("weeks-12").click();
    await page.getByTestId("schedule-next").click();
    await page.getByTestId("preview-start").click();
    await page.waitForURL(/\/home/);
    await page.goto("/home");
    const r = await page.evaluate(() => {
      const card = document.querySelector('[aria-label="학습 잔디"]')!.getBoundingClientRect();
      const grass = document.querySelector('[data-testid="grass"]')!.getBoundingClientRect();
      const streak = document.querySelector('[data-testid="streak"]')!.parentElement!.getBoundingClientRect();
      const de = document.documentElement;
      return { over: de.scrollWidth - de.clientWidth, cardRight: card.right, grassLeft: grass.left, grassRight: grass.right, cardLeft: card.left, streakW: streak.width, cols: document.querySelectorAll('[data-testid="grass"] > span').length / 7 };
    });
    expect(r.cols).toBeGreaterThanOrEqual(12);
    expect(r.over).toBeLessThanOrEqual(0);
    expect(r.grassLeft).toBeGreaterThanOrEqual(r.cardLeft);
    expect(r.grassRight).toBeLessThanOrEqual(r.cardRight);
    expect(r.streakW).toBeGreaterThanOrEqual(96);
  });
}

test("콕 찌르기 안내 말풍선은 잠시 뒤 사라진다", async ({ page }) => {
  await loginDemo(page, "/group");
  const nudge = page.getByTestId("nudge-준호");
  await nudge.getByRole("button").click();
  await expect(nudge.getByRole("status")).toContainText("콕 찔렀어요");
  await expect(nudge.getByText("콕 찔렀어요")).toBeHidden({ timeout: 8000 });
});
