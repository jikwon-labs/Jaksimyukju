// 커리큘럼 계획을 DB에 쓴다. 시드(tsx)에서도 쓰므로 server-only를 붙이지 않는다.
import type { Prisma, PrismaClient } from "@prisma/client";
import type { CurriculumInput, CurriculumPlan, LessonBody, Librarian } from "@/lib/ai/types";
import type { DayKey } from "@/lib/domain/dates";

export async function writeCourse(
  db: PrismaClient,
  librarian: Librarian,
  userId: string,
  input: CurriculumInput,
  plan: CurriculumPlan,
  startDate: DayKey,
) {
  const resources = new Map<string, Awaited<ReturnType<Librarian["search"]>>>();
  for (const w of plan.weeks) {
    for (const l of w.lessons) {
      resources.set(l.title, await librarian.search(input.topic, l.title, input.level));
    }
  }
  return db.$transaction(async (tx) => {
    await tx.course.updateMany({ where: { userId, status: "active" }, data: { status: "stopped" } });
    const course = await tx.course.create({
      data: {
        userId,
        topic: input.topic,
        goal: plan.goal || input.goal,
        level: input.level,
        excludes: plan.excludes,
        startDate,
        weeksCount: plan.weeks.length,
      },
    });
    let order = 0;
    for (const [wi, w] of plan.weeks.entries()) {
      const week = await tx.week.create({
        data: {
          courseId: course.id,
          index: wi + 1,
          goal: w.title,
          milestoneTitle: w.milestone,
          milestoneCriteria: w.criteria,
          quiz: w.quiz as unknown as Prisma.InputJsonValue,
        },
      });
      for (const l of w.lessons) {
        const short: LessonBody = { core: l.body.core, sections: l.body.sections.slice(0, 1) };
        const lesson = await tx.lesson.create({
          data: {
            weekId: week.id,
            courseId: course.id,
            order: order++,
            title: l.title,
            body: l.body as unknown as Prisma.InputJsonValue,
            shortBody: short as unknown as Prisma.InputJsonValue,
            minutes: input.minutes,
          },
        });
        await tx.resource.createMany({
          data: (resources.get(l.title) ?? []).slice(0, 3).map((r) => ({
            lessonId: lesson.id,
            title: r.title,
            url: r.url,
            kind: r.kind,
            minutes: r.minutes,
            reason: r.reason,
            summary: r.summary.slice(0, 3),
            checkedAt: new Date(),
          })),
        });
      }
    }
    return course;
  }, { timeout: 30_000 });
}
