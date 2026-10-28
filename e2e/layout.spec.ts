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
