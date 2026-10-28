import { execSync } from "node:child_process";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { addDays, dayKeyAt, weekday, type DayKey } from "../lib/domain/dates";

/** 시드를 다시 넣는다(테이블 비우고 데모 데이터) */
export function resetDb() {
  execSync("pnpm exec tsx prisma/seed.ts", { stdio: "pipe" });
}

/** 시드와 같은 기준의 오늘(KST) */
export function seedToday(): DayKey {
  return dayKeyAt(new Date());
}

/** from 다음부터 세어 n번째 월~금 학습일 */
export function nthStudyDayAfter(from: DayKey, n: number): DayKey {
  let d = from;
  let left = n;
  while (left > 0) {
    d = addDays(d, 1);
    const w = weekday(d);
    if (w >= 1 && w <= 5) left--;
  }
  return d;
}

export async function loginDemo(page: Page, to = "/home", now?: DayKey, as = "demo-me") {
  const q = new URLSearchParams({ as, to });
  q.set("now", now ?? "");
  await page.goto(`/api/dev/login?${q.toString()}`);
}

export async function shot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${info.project.name}-${name}.png`, fullPage: false });
}

/** 잔디에서 채워진 칸(단계 1 이상) 수 */
export async function filledCells(page: Page): Promise<number> {
  return page.locator('[data-testid="grass"] [data-level]:not([data-level="0"])').count();
}

export async function streak(page: Page): Promise<number> {
  const t = (await page.getByTestId("streak").innerText()).replace(/[^0-9]/g, "");
  return Number(t);
}

export async function expectNoA11yViolations(page: Page) {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
}
