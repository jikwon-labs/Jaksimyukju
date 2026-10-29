import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TeacherName } from "@/lib/design/types";
import type { DayKey } from "@/lib/domain/dates";
import { canNudge, type NotifyDecision, type NudgeDecision } from "@/lib/domain/limits";
import { createCapped, notifyDecision } from "./notify";
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

export type NudgeResult = NudgeDecision | { ok: true; delivered: false; why: Exclude<NotifyDecision, { ok: true }>["reason"] };

/**
 * 콕 찌르기. 하루 1번은 nudges 행으로 센다. 알림은 받는 사람의 알림 제한을 지켜서
 * 막히면(밤 시간, 하루 2번, 콕 찌르기 끔) 찌른 기록만 남기고 알림은 보내지 않는다.
 */
export async function sendNudge(from: User, toId: string, today: DayKey, hour: number): Promise<NudgeResult> {
  const view = await getGroupView(from, today);
  const target = view?.members.find((m) => m.id === toId);
  if (!view || !target) return { ok: false, reason: "self" };
  if (!target.nudge.ok) return target.nudge;
  const to = await prisma.user.findUnique({ where: { id: toId } });
  if (!to) return { ok: false, reason: "self" };
  const decision = await notifyDecision(to, "nudge", today, hour);
  const created = await prisma.$transaction(async (tx) => {
    // 같은 날 두 번 눌러도 한 번만 남긴다
    const dup = await tx.nudge.count({ where: { fromUserId: from.id, toUserId: toId, kind: "friend", day: today } });
    if (dup > 0) return false;
    await tx.nudge.create({ data: { fromUserId: from.id, toUserId: toId, kind: "friend", day: today } });
    return true;
  });
  // 알림은 하루 한도 칸을 차지하며 따로 만든다(동시에 다른 알림이 들어와도 하루 2개를 넘지 않게)
  const delivered =
    created &&
    decision.ok &&
    (await createCapped(
      { userId: toId, kind: "nudge", title: `${from.name}님이 콕 찔렀어요`, body: "오늘 10분만 같이 해요", href: "/home" },
      today,
    ));
  if (decision.ok && (delivered || !created)) return { ok: true };
  return { ok: true, delivered: false, why: decision.ok ? "daily_max" : decision.reason };
}
