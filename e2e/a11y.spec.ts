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

// 선생님 색마다 대비가 다르므로 결(민지)과 새(서연)로도 본다
for (const [as, who] of [
  ["demo-minji", "결"],
  ["demo-seoyeon", "새"],
] as const) {
  for (const route of ["/home", "/curriculum", "/group", "/settings", "/profile"]) {
    test(`접근성 ${who} ${route}`, async ({ page }) => {
      await loginDemo(page, route, undefined, as);
      await page.waitForLoadState("networkidle");
      await expectNoA11yViolations(page);
    });
  }
}
