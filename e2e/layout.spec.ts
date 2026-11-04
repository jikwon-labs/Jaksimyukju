import { expect, type Page, test } from "@playwright/test";
import { loginDemo, resetDb } from "./helpers";

// 가장 좁은 폰(320px)에서 가로 스크롤이 생기지 않는지 본다
const ROUTES = ["/home", "/curriculum", "/group", "/profile", "/settings", "/notifications", "/pause", "/quiz/2", "/milestone/2", "/finish", "/retro", "/review", "/states"];

test.beforeAll(() => {
  resetDb();
});

// 키보드가 올라온 상황을 흉내 내려고 visualViewport를 바꿔 끼운다(iOS는 키보드를 띄워도 창 높이를 줄이지 않고 이 값만 바꾼다)
function fakeViewport(page: Page) {
  return page.addInitScript(() => {
    const vv = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
    Object.defineProperty(window, "visualViewport", { configurable: true, get: () => vv });
    Object.assign(window, { __vv: vv });
  });
}

function openKeyboard(page: Page, height: number, offsetTop: number) {
  return page.evaluate(
    ([h, top]) => {
      const vv = (window as unknown as { __vv: EventTarget & { height: number; offsetTop: number } }).__vv;
      vv.height = h;
      vv.offsetTop = top;
      vv.dispatchEvent(new Event("resize"));
    },
    [height, offsetTop],
  );
}

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

test.describe("튜터 채팅은 입력칸이 바닥에 붙고 대화만 스크롤된다", () => {
  test.use({ viewport: { width: 393, height: 640 } });

  test.beforeEach(({ page }) => fakeViewport(page));

  test("대화를 스크롤해도 머리와 입력칸은 제자리, 키보드가 올라오면 보이는 영역에 맞춘다", async ({ page }) => {
    await loginDemo(page, "/home");
    await page.getByRole("link", { name: "학습 시작" }).click();
    await page.getByTestId("lesson-cta").click();
    await expect(page).toHaveURL(/\/tutor/);
    await expect(page.getByTestId("tutor-ai")).toHaveCount(1, { timeout: 15_000 });
    for (const a of ["첫 번째 답이에요. 길게 적어서 말풍선을 키워 봐요.", "두 번째 답이에요. 이것도 길게 적어 봐요.", "세 번째 답이에요."]) {
      await page.getByTestId("tutor-input").fill(a);
      await page.getByTestId("tutor-send").click();
      await expect(page.getByTestId("tutor-send")).toBeDisabled();
      await expect(page.getByTestId("tutor-user").filter({ hasText: a })).toBeVisible();
      await expect(page.locator('[role="status"][aria-label="선생님이 생각하는 중"]')).toHaveCount(0, { timeout: 15_000 });
    }

    const list = page.getByTestId("tutor-list");
    const composer = page.getByTestId("tutor-composer");
    const header = page.getByTestId("tutor-header");

    const doc = await page.evaluate(() => ({
      over: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      overscroll: getComputedStyle(document.documentElement).overscrollBehaviorY,
    }));
    // 페이지 자체는 스크롤되지 않고, 끝에서 더 밀어도 페이지가 튕기지 않는다
    expect(doc.over).toBeLessThanOrEqual(0);
    expect(doc.overscroll).toBe("none");
    expect(await list.evaluate((el) => getComputedStyle(el).overscrollBehaviorY)).toBe("contain");
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

    const before = { c: await composer.boundingBox(), h: await header.boundingBox() };
    expect(before.c!.y + before.c!.height).toBeCloseTo(640, 0);
    const box = await list.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.wheel(0, -2000);
    await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBe(0);
    expect(await composer.boundingBox()).toEqual(before.c);
    expect(await header.boundingBox()).toEqual(before.h);

    // 키보드가 올라와 보이는 높이가 340px이 되고, iOS가 페이지를 120px 밀어 올린 상황
    await openKeyboard(page, 340, 120);
    await expect.poll(async () => (await header.boundingBox())!.y).toBeCloseTo(120, 0);
    const kb = await composer.boundingBox();
    expect(kb!.y + kb!.height).toBeCloseTo(460, 0);
    // 키보드가 떠 있을 때는 바닥 여백을 줄이고, 마지막 말이 보이게 맨 아래로 내린다
    expect(await composer.evaluate((el) => getComputedStyle(el).paddingBottom)).toBe("10px");
    expect(await list.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThanOrEqual(1);
  });
});

// SE: 앱 안에서는 647px, Safari에서는 주소창을 빼고 549px
for (const height of [647, 549]) {
  test.describe(`작은 폰(SE, 375x${height})에서 첫 화면은 세로로 넘치지 않는다`, () => {
    test.use({ viewport: { width: 375, height } });

    test("소개와 로그인 단계", async ({ page }) => {
      const over = () => page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      expect(await over()).toBeLessThanOrEqual(0);
      await page.getByRole("button", { name: "이미 계정이 있어요" }).click();
      await expect(page.getByRole("button", { name: "뒤로" })).toBeVisible();
      expect(await over()).toBeLessThanOrEqual(0);
    });
  });
}

test("튜터 채팅: 보내기를 눌러도 입력칸 초점이 남아 키보드가 내려가지 않는다", async ({ page }) => {
  await loginDemo(page, "/home");
  await page.getByRole("link", { name: "학습 시작" }).click();
  await page.getByTestId("lesson-cta").click();
  // 같은 레슨을 앞 테스트도 쓰므로 대화 수는 세지 않고, 보낸 뒤 하나 늘어나는지만 본다
  await expect(page.getByTestId("tutor-ai").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("tutor-send")).toBeDisabled();
  const before = await page.getByTestId("tutor-ai").count();
  const input = page.getByTestId("tutor-input");
  await input.click();
  await input.fill("초점 확인용 답이에요.");
  await page.getByTestId("tutor-send").click();
  await expect(page.getByTestId("tutor-user").filter({ hasText: "초점 확인용 답이에요." })).toBeVisible();
  await expect(input).toBeFocused();
  // 답을 받은 뒤에도 그대로 이어서 쓸 수 있다
  await expect(page.getByTestId("tutor-ai")).toHaveCount(before + 1, { timeout: 15_000 });
  await expect(input).toBeFocused();
});

async function openTutor(page: Page) {
  await loginDemo(page, "/home");
  await page.getByRole("link", { name: "학습 시작" }).click();
  await page.getByTestId("lesson-cta").click();
  await expect(page.getByTestId("tutor-ai").first()).toBeVisible({ timeout: 15_000 });
  return page.getByTestId("tutor-input");
}

test.describe("튜터 채팅: 마우스·키보드 화면", () => {
  // 터치가 없으면 (pointer: fine)이 된다
  test.use({ hasTouch: false });
  test("Shift+Enter로 줄을 바꾸고 칸이 늘어나며, Enter로 보낸다", async ({ page }) => {
    const input = await openTutor(page);
    await input.click();
    await input.pressSequentially("첫 줄이에요");
    const oneLine = (await input.boundingBox())?.height ?? 0;
    await input.press("Shift+Enter");
    await input.pressSequentially("둘째 줄이에요");
    await expect(input).toHaveValue("첫 줄이에요\n둘째 줄이에요");
    expect((await input.boundingBox())?.height ?? 0).toBeGreaterThan(oneLine);
    await input.press("Enter");
    await expect(page.getByTestId("tutor-user").filter({ hasText: "둘째 줄이에요" })).toBeVisible();
    await expect(input).toHaveValue("");
  });
});

test("튜터 채팅: 터치 화면의 Enter(return)는 줄바꿈이고 보내기는 버튼으로 한다", async ({ page }) => {
  const input = await openTutor(page);
  await input.click();
  await input.pressSequentially("첫 줄이에요");
  await input.press("Enter");
  await input.pressSequentially("둘째 줄이에요");
  await expect(input).toHaveValue("첫 줄이에요\n둘째 줄이에요");
});

test("튜터 채팅: 대화 영역을 누르면 키보드를 내린다(입력칸 초점을 푼다)", async ({ page }) => {
  await loginDemo(page, "/home");
  await page.getByRole("link", { name: "학습 시작" }).click();
  await page.getByTestId("lesson-cta").click();
  await expect(page.getByTestId("tutor-ai").first()).toBeVisible({ timeout: 15_000 });
  const input = page.getByTestId("tutor-input");
  await input.click();
  await expect(input).toBeFocused();
  await page.getByTestId("tutor-ai").first().click();
  await expect(input).not.toBeFocused();
});

// 주제 입력도 튜터와 같이 키보드를 다룬다. SE(375x647, 앱 안)에서 키보드가 올라오면 보이는 높이가 약 380px이다
// 회고 채팅은 추천 답(칩)을 가로 한 줄로 두어 같은 높이에 들어가게 했다
const SE_KEYBOARD = { height: 380, top: 100 };

for (const c of [
  { name: "주제 입력", open: (page: Page) => page.goto("/start/topic"), id: "topic", send: "send", answer: "재무제표 읽기" },
  { name: "회고 채팅", open: (page: Page) => loginDemo(page, "/retro"), id: "retro", send: "retro-send", answer: "이번 주는 퇴근 뒤 10분이 잘 맞았어요." },
]) {
  test.describe(`${c.name}: 키보드가 올라와도 머리와 입력칸이 보인다`, () => {
    test.use({ viewport: { width: 375, height: 647 } });
    test.beforeEach(({ page }) => fakeViewport(page));

    test(`${c.name}: 머리와 입력칸은 제자리, 키보드가 올라오면 보이는 영역에 맞춘다`, async ({ page }) => {
      await c.open(page);
      const head = page.getByTestId(`${c.id}-head`);
      const chat = page.getByTestId(`${c.id}-chat`);
      const composer = page.getByTestId(`${c.id}-composer`);
      await expect(page.getByTestId(`${c.id}-input`)).toBeVisible();

      const doc = await page.evaluate(() => ({
        over: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        overscroll: getComputedStyle(document.documentElement).overscrollBehaviorY,
      }));
      expect(doc.over).toBeLessThanOrEqual(0);
      expect(doc.overscroll).toBe("none");
      expect(await chat.evaluate((el) => getComputedStyle(el).overscrollBehaviorY)).toBe("contain");
      const c0 = (await composer.boundingBox())!;
      expect(c0.y + c0.height).toBeCloseTo(647, 0);

      await openKeyboard(page, SE_KEYBOARD.height, SE_KEYBOARD.top);
      await expect.poll(async () => (await head.boundingBox())!.y).toBeCloseTo(SE_KEYBOARD.top, 0);
      const kb = (await composer.boundingBox())!;
      expect(kb.y + kb.height).toBeCloseTo(SE_KEYBOARD.top + SE_KEYBOARD.height, 0);
      expect(await composer.evaluate((el) => getComputedStyle(el).paddingBottom)).toBe("10px");
      // 사이에 낀 대화도 마지막 말풍선 한 줄은 보일 만큼 남는다
      expect((await chat.boundingBox())!.height).toBeGreaterThanOrEqual(64);
      expect(await chat.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThanOrEqual(1);
    });

    test(`${c.name}: 보내기를 눌러도 입력칸 초점이 남는다`, async ({ page }) => {
      await c.open(page);
      const input = page.getByTestId(`${c.id}-input`);
      await input.click();
      await input.fill(c.answer);
      await page.getByTestId(c.send).click();
      await expect(page.getByTestId(`${c.id}-chat`)).toContainText(c.answer);
      await expect(input).toBeFocused();
      // 선생님의 다음 질문이 나온 뒤에도 그대로 이어서 쓸 수 있다
      await expect(page.getByTestId(`${c.id}-chat`).locator('[role="status"]')).toHaveCount(0);
      await expect(input).toBeFocused();
    });

    test(`${c.name}: 대화 영역을 누르면 입력칸 초점을 푼다`, async ({ page }) => {
      await c.open(page);
      const input = page.getByTestId(`${c.id}-input`);
      await input.click();
      await expect(input).toBeFocused();
      // iOS는 글자를 눌러도 초점이 저절로 풀리지 않는다. 그래서 mousedown 없이 click만 보낸다
      await page.getByTestId(`${c.id}-chat`).locator("p").first().dispatchEvent("click");
      await expect(input).not.toBeFocused();
    });
  });
}

test.describe("회고 채팅: 추천 답은 가로 한 줄", () => {
  test.use({ viewport: { width: 375, height: 647 } });

  test("칩이 모두 같은 줄에 있고, 넘치면 옆으로 민다", async ({ page }) => {
    await loginDemo(page, "/retro");
    const chips = page.getByTestId("retro-chip");
    await expect(chips.first()).toBeVisible();
    const tops = await chips.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(tops.length).toBeGreaterThan(1);
    expect(new Set(tops).size).toBe(1);
    // 손가락으로 누르기 좋게 44px 이상
    const h = await chips.first().evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(44);
  });
});
