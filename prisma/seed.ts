// 시드: 재무제표 읽기 6주 과정(데모 사용자 "나") + 그룹 멤버 3명(민지, 서연, 준호).
// 날짜는 시드를 돌린 날(KST)을 기준으로 잡는다. 테이블은 모두 비우고 다시 넣는다.
import { PrismaClient } from "@prisma/client";
import { mockCurriculum, mockLibrarian } from "../lib/ai/mock";
import { FINANCE_GOAL, FINANCE_TOPIC } from "../lib/ai/finance";
import { addDays, dayKeyAt, diffDays, mondayOf, type DayKey, weekday } from "../lib/domain/dates";
import { writeCourse } from "../lib/server/write-course";
import { DEMO_INVITE } from "../lib/constants";

const prisma = new PrismaClient();
const STUDY = [1, 2, 3, 4, 5];


async function wipe() {
  // 자식 테이블부터
  await prisma.notification.deleteMany();
  await prisma.retro.deleteMany();
  await prisma.nudge.deleteMany();
  await prisma.restDay.deleteMany();
  await prisma.tutorMessage.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.milestoneSubmission.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.week.deleteMany();
  await prisma.course.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
}

/** 지난 학습일마다 칸을 하나씩 채운다. skipDays는 그날 학습을 건너뛴다 */
async function progress(courseId: string, start: DayKey, today: DayKey, opts: { skip?: DayKey[]; short?: DayKey[]; tutor?: boolean }) {
  const weeks = await prisma.week.findMany({
    where: { courseId },
    orderBy: { index: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  const queue: { kind: "lesson" | "quiz" | "goal"; weekId: string; lessonId?: string; quiz?: number }[] = [];
  for (const w of weeks) {
    for (const l of w.lessons) queue.push({ kind: "lesson", weekId: w.id, lessonId: l.id });
    queue.push({ kind: "quiz", weekId: w.id });
    queue.push({ kind: "goal", weekId: w.id });
  }
  for (let d = start; diffDays(today, d) > 0; d = addDays(d, 1)) {
    if (!STUDY.includes(weekday(d)) || opts.skip?.includes(d)) continue;
    const step = queue.shift();
    if (!step) break;
    const at = new Date(`${d}T21:00:00+09:00`);
    if (step.kind === "lesson") {
      const short = opts.short?.includes(d) ?? false;
      await prisma.lesson.update({
        where: { id: step.lessonId },
        data: {
          status: short ? "short" : "done",
          tutorChecked: !short && (opts.tutor ?? true),
          completedAt: at,
          completedDay: d,
          oneLiner: short ? null : "숫자 뒤에 있는 돈의 흐름을 읽었다",
        },
      });
    } else {
      // 금요일: 퀴즈와 마일스톤을 같은 날 한다
      await prisma.quizAttempt.create({
        data: { weekId: step.weekId, score: 2, answers: [{ choice: 0, correct: true }, { choice: 1, correct: true }, { choice: 0, correct: false }], day: d, createdAt: at },
      });
      const next = queue.shift();
      if (next?.kind === "goal") {
        await prisma.milestoneSubmission.create({
          data: {
            weekId: step.weekId,
            content: "매출 1,200억, 영업이익 96억.\n원가율이 높아 이익률은 8%.\n그래서 이 회사는 많이 팔지만 남는 건 적다.",
            feedback: { headline: "완벽해요.", criteria: [], fixes: [], passed: true },
            round: 1,
            day: d,
            createdAt: at,
          },
        });
      }
    }
  }
}

async function main() {
  await wipe();
  const today = dayKeyAt(new Date());
  const start = addDays(mondayOf(today), -7); // 지난주 월요일 시작 -> 오늘은 2주차
  const yesterday = addDays(today, -1);

  const me = await prisma.user.create({ data: { id: "demo-me", name: "나", teacher: "온", minutesPerDay: 10 } });
  const minji = await prisma.user.create({ data: { id: "demo-minji", name: "민지", teacher: "결" } });
  const seoyeon = await prisma.user.create({ data: { id: "demo-seoyeon", name: "서연", teacher: "새" } });
  const junho = await prisma.user.create({ data: { id: "demo-junho", name: "준호", teacher: "온" } });

  const input = { topic: FINANCE_TOPIC, goal: FINANCE_GOAL, level: "처음이에요", studyDays: STUDY, minutes: 10, weeks: 6, teacher: "온" as const };
  const myCourse = await writeCourse(prisma, mockLibrarian, me.id, input, mockCurriculum(input), start);
  // 어제가 학습일이면 5분 버전으로 한 날로 둔다(잔디 연한 칸)
  await progress(myCourse.id, start, today, { short: STUDY.includes(weekday(yesterday)) ? [yesterday] : [] });

  const others: [typeof minji, string, string, { skip?: DayKey[] }][] = [
    [minji, "영어 회화", "회의에서 영어로 의견 말하기", {}],
    [seoyeon, "디자인 기초", "발표 자료 한 장을 깔끔하게 만들기", {}],
    [junho, "파이썬 기초", "업무 엑셀 정리를 자동화하기", { skip: [addDays(today, -1), addDays(today, -2), addDays(today, -3), addDays(today, -4)] }],
  ];
  for (const [u, topic, goal, opt] of others) {
    const inp = { topic, goal, level: "조금 알아요", studyDays: STUDY, minutes: 15, weeks: 4, teacher: u.teacher as "온" | "결" | "새" };
    const c = await writeCourse(prisma, mockLibrarian, u.id, inp, mockCurriculum(inp), start);
    // 민지·서연은 오늘도 했다
    await progress(c.id, start, u.id === junho.id ? today : addDays(today, 1), { skip: opt.skip });
  }

  const group = await prisma.group.create({
    data: {
      name: "퇴근 후 공부방",
      inviteCode: DEMO_INVITE,
      inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000),
      createdById: minji.id,
    },
  });
  await prisma.groupMember.createMany({
    data: [
      { groupId: group.id, userId: minji.id, visibility: "grass_topic" },
      { groupId: group.id, userId: seoyeon.id, visibility: "grass" },
      { groupId: group.id, userId: junho.id, visibility: "grass_topic" },
      { groupId: group.id, userId: me.id, visibility: "grass_topic" },
    ],
  });

  const now = Date.now();
  await prisma.notification.createMany({
    data: [
      { userId: me.id, kind: "nudge", title: "민지님이 콕 찔렀어요", body: "오늘 10분만 같이 해요", href: "/home", createdAt: new Date(now - 30 * 60_000) },
      { userId: me.id, kind: "teacher", title: "온 선생님", body: "오늘도 와 줬네요. 10분만 같이 해요", href: "/home", createdAt: new Date(now - 3 * 3600_000) },
      { userId: me.id, kind: "group", title: "서연님이 오늘 레슨을 마쳤어요", body: "퇴근 후 공부방", href: "/group", createdAt: new Date(now - 26 * 3600_000), readAt: new Date(now - 20 * 3600_000) },
    ],
  });
  console.log(`seed ok: today=${today} start=${start}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
