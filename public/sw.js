// 작심육주 서비스 워커: 한 번 연 레슨은 오프라인에서도 다시 읽을 수 있게 한다(F23).
// 화면(HTML)은 네트워크 우선, 실패하면 저장해 둔 것을 쓴다. 빌드 정적 파일은 저장본 우선.
const PAGES = "j6-pages-v1";
const STATIC = "j6-static-v1";
const OFFLINE_URL = "/lesson/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.add(OFFLINE_URL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // 고품질 목소리 모델(j6-tts-*)은 사용자가 받은 것이라 지우지 않는다
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== PAGES && k !== STATIC && !k.startsWith("j6-tts-")).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isLessonPage(url) {
  return url.pathname.startsWith("/lesson/") && !url.pathname.includes("/tutor") && !url.pathname.includes("/complete");
}

/** 오프라인에서 저장 안 된 화면을 열면, 가장 최근에 저장한 레슨을 대신 보여 준다 */
async function lastLesson() {
  const c = await caches.open(PAGES);
  const keys = (await c.keys()).filter((r) => isLessonPage(new URL(r.url)) && new URL(r.url).pathname !== OFFLINE_URL);
  const last = keys[keys.length - 1];
  return last ? c.match(last, { ignoreVary: true }) : undefined;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req, { ignoreVary: true }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            // 본문을 페이지가 쓰기 전에 바로 복제해 둔다
            if (res.ok) {
              const copy = res.clone();
              event.waitUntil(caches.open(STATIC).then((c) => c.put(req, copy)));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && isLessonPage(url)) {
            const copy = res.clone();
            event.waitUntil(caches.open(PAGES).then((c) => c.put(req, copy)));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req, { ignoreSearch: true, ignoreVary: true })
            .then((hit) => hit || lastLesson())
            .then((hit) => hit || caches.match(OFFLINE_URL, { ignoreVary: true }))
            .then((hit) => hit || new Response("오프라인이에요", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } })),
        ),
    );
  }
});
