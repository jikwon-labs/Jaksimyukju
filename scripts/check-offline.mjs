// 서비스 워커 오프라인 확인. 운영 서버(pnpm build && pnpm start, 3100)에서 돌린다.
// 게스트를 만들고 레슨을 한 번 연 뒤, 오프라인에서 새로고침·다른 화면 열기로 저장된 레슨이 보이는지 본다.
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const r = await ctx.request.post("http://localhost:3100/api/onboarding", {
  data: { teacher: "결", topic: "재무제표 읽기", goal: "재무제표를 혼자 읽고 한 장으로 요약하기", level: "처음이에요", studyDays: [1, 2, 3, 4, 5], minutes: 10, weeks: 6, notifyTime: "21:30" },
});
console.log("onboarding", r.status());
const p = await ctx.newPage();
await p.goto("http://localhost:3100/home");
await p.getByRole("link", { name: "학습 시작" }).click();
await p.waitForLoadState("networkidle");
await p.evaluate(async () => { await navigator.serviceWorker.ready; });
await p.reload({ waitUntil: "networkidle" });
const url = p.url();
const title = await p.getByTestId("lesson-title").innerText();
await ctx.setOffline(true);
await p.goto(url).catch((e) => console.log("goto err", String(e).slice(0, 80)));
const offTitle = await p.getByTestId("lesson-title").innerText({ timeout: 5000 }).catch(() => "(none)");
const banner = await p.getByTestId("offline-banner").isVisible().catch(() => false);
console.log("online:", title, "| offline reload:", offTitle, "| banner:", banner);
await p.goto("http://localhost:3100/curriculum").catch(() => {});
const fb = await p.getByTestId("lesson-title").innerText({ timeout: 5000 }).catch(() => "(none)");
console.log("offline other page -> fallback lesson:", fb);
await b.close();
if (offTitle !== title || !banner || fb === "(none)") {
  console.error("offline check failed");
  process.exit(1);
}
console.log("offline check ok");
