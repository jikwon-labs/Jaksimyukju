import "server-only";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { z } from "zod";
import { getAi } from "@/lib/ai";
import type { CurriculumInput } from "@/lib/ai/types";
import { createGuest, getSessionUser, signIn } from "@/lib/auth";
import { carryAiConsent } from "@/lib/server/ai-consent";
import { devToolsEnabled, getNow, getToday } from "@/lib/clock";
import { DEMO_INVITE } from "@/lib/constants";
import { sortStudyDays } from "@/lib/domain/dates";
import { nickname } from "@/lib/domain/nickname";
import { prisma } from "@/lib/prisma";
import { canAddCourse } from "@/lib/domain/courses";
import { createCourse } from "./course";
import { TooManyCourses } from "./write-course";
import { getDraftMaterial } from "./material";
import { recordStudyDays } from "./settings";
import { joinByCode } from "./social";

/** /invite/[code]가 남기는 초대 코드 쿠키 */
export const INVITE_COOKIE = "j6_invite";

export const OnboardingInput = z.object({
  teacher: z.enum(["온", "결", "새"]),
  topic: z.string().trim().min(1).max(60),
  goal: z.string().trim().min(1).max(120),
  level: z.enum(["처음이에요", "조금 알아요", "꽤 알아요"]),
  studyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  minutes: z.union([z.literal(5), z.literal(10), z.literal(20), z.literal(30)]),
  weeks: z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(8), z.literal(12)]),
  notifyTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  /** 주제 정하기에서 올린 내 자료(POST /api/material) */
  materialId: z.string().min(1).max(40).optional(),
});
export type OnboardingInput = z.infer<typeof OnboardingInput>;

export interface OnboardingSummary {
  teacher: string;
  topic: string;
  goal: string;
  weeksCount: number;
  perWeek: number;
  minutes: number;
  lessons: number;
  weeks: { title: string; milestone: string }[];
  excludes: string[];
  /** 내 자료로 짰으면 그 자료 제목 */
  material?: string;
}

/** 초대 쿠키(없으면 데모 그룹)의 그룹. 만료됐거나 없으면 null */
export async function inviteGroup(now?: Date) {
  // 초대 쿠키가 없을 때 데모 그룹으로 보내는 것은 개발 모드에서만
  const code =
    (await cookies()).get(INVITE_COOKIE)?.value || (devToolsEnabled() ? DEMO_INVITE : null);
  if (!code) return null;
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  if (!group || group.inviteExpiresAt <= (now ?? (await getNow()))) return null;
  return group;
}

/** 내 것이 아니거나 이미 다른 과정에 붙은 자료 번호를 보냈을 때 */
export class MaterialNotFound extends Error {}

export { TooManyCourses };

/**
 * 커리큘럼을 만들고 과정을 저장한다. 세션 사용자가 있으면 그 사용자를 쓰고(다시 만들기),
 * 없으면 게스트를 만든다. AI가 실패하면 AiError를 그대로 던지고 아무것도 쓰지 않는다.
 */
export async function startOnboarding(data: OnboardingInput): Promise<OnboardingSummary> {
  const studyDays = sortStudyDays(data.studyDays);
  const existing = await getSessionUser();
  // 한도를 넘으면 AI를 부르기 전에 멈춘다(쓸 때 write-course가 한 번 더 막는다)
  if (existing && !canAddCourse(await prisma.course.count({ where: { userId: existing.id, status: "active" } })).ok)
    throw new TooManyCourses();
  // 내 자료는 지금 세션 사용자가 시작 흐름에서 올리고 아직 과정에 안 붙은 것만 쓴다(자료를 올릴 때 게스트가 만들어진다)
  const material = data.materialId ? (existing ? await getDraftMaterial(existing, data.materialId) : null) : null;
  if (data.materialId && !material) throw new MaterialNotFound();
  const input: CurriculumInput = {
    topic: data.topic,
    goal: data.goal,
    level: data.level,
    studyDays,
    minutes: data.minutes,
    weeks: data.weeks,
    teacher: data.teacher,
    material: material ? { title: material.title, text: material.text } : undefined,
  };
  const plan = await getAi().generateCurriculum(input);

  const profile = {
    teacher: data.teacher,
    studyDays: studyDays.join(","),
    minutesPerDay: data.minutes,
    notifyTime: data.notifyTime,
  };
  let user: User;
  if (existing) {
    // 다른 과정을 함께 하는 중이면, 그 과정들에 요일 변경 이력을 남긴다
    await recordStudyDays(existing, studyDays, await getToday());
    // 자료를 올리며 막 만든 게스트(과정 없음, 기본 이름)면 새 사용자처럼 별명을 붙인다
    const fresh = existing.name === "나" && (await prisma.course.count({ where: { userId: existing.id } })) === 0;
    const name = fresh ? nickname(await prisma.user.count()) : undefined;
    user = await prisma.user.update({ where: { id: existing.id }, data: { ...profile, ...(name ? { name } : {}) } });
    await signIn(user);
  } else {
    const guest = await createGuest({ teacher: data.teacher });
    const n = await prisma.user.count();
    user = await prisma.user.update({
      where: { id: guest.id },
      data: { ...profile, name: nickname(n) },
    });
  }
  // 시작 흐름에서 쿠키로 받은 AI 동의를 계정에 옮긴다
  await carryAiConsent(user);

  await createCourse(
    user.id,
    input,
    plan,
    await getToday(),
    material ? { id: material.id, title: material.title, kind: material.kind, source: material.source, text: material.text } : undefined,
  );

  // 초대 링크로 왔으면 그 그룹에, 아직 그룹이 없으면 기본 초대 그룹에 들어간다.
  // 그룹 규칙(최대 인원, 한 사람 한 그룹, 공개 범위 기본 "잔디만")은 joinByCode가 지킨다
  const jar = await cookies();
  const invited = jar.get(INVITE_COOKIE)?.value;
  const inGroup = await prisma.groupMember.count({ where: { userId: user.id } });
  const group = invited || inGroup === 0 ? await inviteGroup() : null;
  if (group) await joinByCode(user, group.inviteCode, await getToday());
  if (invited) jar.delete(INVITE_COOKIE);

  return {
    teacher: data.teacher,
    topic: input.topic,
    goal: plan.goal || input.goal,
    weeksCount: plan.weeks.length,
    perWeek: studyDays.length,
    minutes: data.minutes,
    lessons: plan.weeks.reduce((n, w) => n + w.lessons.length, 0),
    weeks: plan.weeks.map((w) => ({ title: w.title, milestone: w.milestone })),
    excludes: plan.excludes,
    material: material?.title,
  };
}
