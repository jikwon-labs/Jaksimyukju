// 커리큘럼 계획을 DB에 쓴다. 시드(tsx)에서도 쓰므로 server-only를 붙이지 않는다.
import type { Prisma, PrismaClient } from "@prisma/client";
import type { CurriculumInput, CurriculumPlan, LessonBody, Librarian } from "@/lib/ai/types";
import type { DayKey } from "@/lib/domain/dates";
import { materialResource } from "@/lib/domain/material";

/** 과정에 붙일 내 자료. 소유자 확인은 부르는 쪽이 이미 했다 */
export interface CourseMaterial {
  id: string;
  title: string;
  kind: string;
  source: string;
  text: string;
}

/** 레슨 근거를 찾을 때 쓰는 글: 제목, 핵심, 본문 */
export function lessonQuery(title: string, body: LessonBody): string {
  return [title, body.core, ...body.sections.map((s) => `${s.heading} ${s.text}`)].join("\n");
}

export async function writeCourse(
  db: PrismaClient,
  librarian: Librarian,
  userId: string,
  input: CurriculumInput,
  plan: CurriculumPlan,
  startDate: DayKey,
  material?: CourseMaterial,
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
    if (material) {
      // 내 자료만 이 과정에 붙인다(다른 사람 자료는 부르는 쪽에서 이미 걸렀고, 여기서도 userId로 한 번 더 묶는다)
      // 아직 과정에 안 붙은 자료만 옮긴다. 다른 과정에 붙은 자료를 빼 오지 않는다
      await tx.material.updateMany({ where: { id: material.id, userId, courseId: null }, data: { courseId: course.id } });
    }
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
        // 내 자료가 있으면 근거 1(번호 0)은 내 자료, 나머지 자리는 찾은 자료로 채운다
        const mine = material ? materialResource(material, material.text, lessonQuery(l.title, l.body), { fallback: true }) : null;
        const found = (resources.get(l.title) ?? []).slice(0, mine ? 2 : 3).map((r) => ({
          lessonId: lesson.id,
          title: r.title,
          url: r.url,
          kind: r.kind as string,
          minutes: r.minutes,
          reason: r.reason,
          summary: r.summary.slice(0, 3),
          checkedAt: new Date(),
        }));
        // id 순서가 근거 번호라 내 자료를 먼저 만든다
        if (mine) await tx.resource.create({ data: { ...mine, lessonId: lesson.id, checkedAt: new Date() } });
        await tx.resource.createMany({ data: found });
      }
    }
    return course;
  }, { timeout: 30_000 });
}
