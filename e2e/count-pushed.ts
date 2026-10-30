// E2E 전용: 사용자(인자 1)의 알림 중 본문에 글자(인자 2)가 들어 있고 푸시로 보낸 것의 수를 출력한다
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [userId = "demo-me", text = ""] = process.argv.slice(2);
  const n = await prisma.notification.count({ where: { userId, body: { contains: text }, pushedAt: { not: null } } });
  process.stdout.write(String(n));
}

main().finally(() => prisma.$disconnect());
