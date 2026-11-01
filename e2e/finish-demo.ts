// E2E 전용: 데모 사용자의 과정을 모두 끝낸 상태로 만든다(레슨·퀴즈·마일스톤 통과, 완주)
import { PrismaClient } from "@prisma/client";
import { assertLocalDb } from "../prisma/guard";

assertLocalDb();
const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.findFirst({ where: { userId: "demo-me" }, include: { weeks: true } });
  if (!course) throw new Error("no demo course");
  const day = new Date().toISOString().slice(0, 10);
  await prisma.lesson.updateMany({
    where: { courseId: course.id, status: "todo" },
    data: { status: "done", tutorChecked: true, completedDay: day, completedAt: new Date() },
  });
  for (const w of course.weeks) {
    if ((await prisma.quizAttempt.count({ where: { weekId: w.id } })) === 0) {
      await prisma.quizAttempt.create({ data: { weekId: w.id, score: 3, answers: [], day } });
    }
    await prisma.milestoneSubmission.create({
      data: { weekId: w.id, content: "그래서 숫자 3개로 정리했다.", feedback: { headline: "", criteria: [], fixes: [], passed: true }, round: 1, day },
    });
  }
  await prisma.course.update({ where: { id: course.id }, data: { status: "finished" } });
}

main().finally(() => prisma.$disconnect());
