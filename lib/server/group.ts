import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TeacherName } from "@/lib/design/types";
import type { DayKey } from "@/lib/domain/dates";
import { canNudge, type NudgeDecision } from "@/lib/domain/limits";
import type { GrassCell } from "@/lib/domain/rest";
import { loadState, teacherOf } from "./course";

export interface MemberView {
  id: string;
  name: string;
  initial: string;
  teacher: TeacherName;
  me: boolean;
  topic: string | null; // 잔디와 주제 공개일 때만
  visibility: "grass" | "grass_topic";
  studiedToday: boolean;
  streak: number;
  missed: number;
  resting: boolean;
  grass: GrassCell[][];
  nudge: NudgeDecision;
  comeback: boolean;
}

export interface GroupView {
  id: string;
  name: string;
  inviteCode: string;
  inviteExpiresAt: Date;
  members: MemberView[];
}

export async function getGroupView(user: User, today: DayKey): Promise<GroupView | null> {
  const membership = await prisma.groupMember.findFirst({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: { group: { include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" } } } } },
  });
  if (!membership) return null;
  const g = membership.group;
  const sent = await prisma.nudge.findMany({ where: { fromUserId: user.id, kind: "friend" } });
  const members: MemberView[] = [];
  for (const m of g.members) {
    const st = await loadState(m.user, today);
    const visibility = m.visibility === "grass_topic" ? "grass_topic" : "grass";
    members.push({
      id: m.user.id,
      name: m.user.name,
      initial: m.user.name.slice(0, 1),
      teacher: teacherOf(m.user),
      me: m.user.id === user.id,
      // 튜터 대화, 퀴즈 점수, 마일스톤 내용은 어떤 범위에서도 내보내지 않는다
      topic: visibility === "grass_topic" ? (st?.course.topic ?? null) : null,
      visibility,
      studiedToday: st?.studiedToday ?? false,
      streak: st?.streak ?? 0,
      missed: st?.missed ?? 0,
      resting: st?.restingToday ?? false,
      grass: st ? st.grass.slice(Math.max(0, st.view.currentWeek - 1), st.view.currentWeek) : [],
      comeback: (st?.course.comebackDay ?? null) === today,
      nudge: canNudge({
        fromId: user.id,
        toId: m.user.id,
        today,
        sentDays: sent.filter((n) => n.toUserId === m.user.id).map((n) => n.day),
        targetResting: st?.restingToday ?? false,
        targetStudiedToday: st?.studiedToday ?? false,
      }),
    });
  }
  return { id: g.id, name: g.name, inviteCode: g.inviteCode, inviteExpiresAt: g.inviteExpiresAt, members };
}

export async function sendNudge(from: User, toId: string, today: DayKey): Promise<NudgeDecision> {
  const view = await getGroupView(from, today);
  const target = view?.members.find((m) => m.id === toId);
  if (!view || !target) return { ok: false, reason: "self" };
  if (!target.nudge.ok) return target.nudge;
  await prisma.$transaction([
    prisma.nudge.create({ data: { fromUserId: from.id, toUserId: toId, kind: "friend", day: today } }),
    prisma.notification.create({
      data: {
        userId: toId,
        kind: "nudge",
        title: `${from.name}님이 콕 찔렀어요`,
        body: "오늘 10분만 같이 해요",
        href: "/home",
      },
    }),
  ]);
  return { ok: true };
}
