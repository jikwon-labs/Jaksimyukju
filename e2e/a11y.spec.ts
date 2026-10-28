import { test } from "@playwright/test";
import { expectNoA11yViolations, loginDemo, resetDb } from "./helpers";

// 주요 화면에 심각(serious/critical) 접근성 위반이 없는지 axe로 본다
const ROUTES = ["/home", "/curriculum", "/group", "/profile", "/settings", "/notifications", "/pause", "/states"];

test.beforeAll(() => {
  resetDb();
});

test("시작 화면 접근성", async ({ page }) => {
  await page.goto("/");
  await expectNoA11yViolations(page);
});

for (const route of ROUTES) {
  test(`접근성 ${route}`, async ({ page }) => {
    await loginDemo(page, route);
    await page.waitForLoadState("networkidle");
    await expectNoA11yViolations(page);
  });
}
