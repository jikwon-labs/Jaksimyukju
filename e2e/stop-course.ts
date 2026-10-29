// E2E 전용: 사용자(인자, 기본 demo-junho)의 진행 중 과정을 멈춘 상태로 만든다
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2] ?? "demo-junho";
  await prisma.course.updateMany({ where: { userId, status: "active" }, data: { status: "stopped" } });
}

main().finally(() => prisma.$disconnect());
