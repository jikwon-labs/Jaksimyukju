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
