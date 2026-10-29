// 스케줄러를 한 번 부른다: pnpm cron:tick
// 서버(기본 http://localhost:3100)가 떠 있어야 한다. 운영에서는 APP_URL과 CRON_SECRET을 넣고 cron으로 10~30분마다 돌린다.
const base = (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");
const headers = process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {};
const res = await fetch(`${base}/api/cron/tick`, { method: "POST", headers });
const body = await res.text();
console.log(res.status, body);
if (!res.ok) process.exit(1);
