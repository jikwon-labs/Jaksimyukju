// 테이블을 비우는 명령(시드, db:reset, E2E) 앞에서 돈다. DB 주소가 이 맥이 아니면 멈춘다.
// 운영 Supabase 주소가 실수로 들어 있어도 데이터를 지우지 않게 하려는 장치다.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function assertLocalDb(): void {
  // tsx는 .env를 읽지 않는다. Prisma가 읽기 전에 검사해야 해서 직접 읽는다
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env");
    } catch {
      // .env가 없으면 아래에서 멈춘다
    }
  }
  const url = process.env.DATABASE_URL;
  let host = "";
  try {
    host = new URL(url ?? "").hostname;
  } catch {
    // 주소 모양이 아니면 아래에서 멈춘다
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`DATABASE_URL이 로컬 DB가 아니라서 멈춥니다 (host: ${host || "없음"}). 테이블을 비우는 명령은 로컬에서만 돈다.`);
  }
}

// tsx prisma/guard.ts 로 직접 부르면 검사만 한다
if (process.argv[1]?.endsWith("guard.ts")) assertLocalDb();
