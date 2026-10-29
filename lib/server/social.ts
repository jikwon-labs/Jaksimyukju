import "server-only";
import { notifyDecision } from "./notify";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getHour, getNow } from "@/lib/clock";
import { type DayKey, mondayOf, diffDays } from "@/lib/domain/dates";
import {
  GROUP_MAX,
  inviteExpired,
  inviteExpiry,
  newInviteCode,
  recentStrip,
  type StripCell,
} from "@/lib/domain/social";
import { courseState, getActiveCourse, teacherOf } from "./course";
import { getGroupView, type GroupView, type MemberView } from "./group";

export interface GroupPage {
  view: GroupView;
  strips: Record<string, StripCell[]>;
  myVisibility: "grass" | "grass_topic";
}

/** getGroupView에 최근 2주 잔디 줄을 더한다 */
export async function getGroupPage(user: User, today: DayKey): Promise<GroupPage | null> {
  const view = await getGroupView(user, today);
  if (!view) return null;
  const strips: Record<string, StripCell[]> = {};
  const users = await prisma.user.findMany({ where: { id: { in: view.members.map((m) => m.id) } } });
  for (const u of users) {
    const course = await getActiveCourse(u.id);
    if (!course) {
      strips[u.id] = [];
      continue;
    }
    const st = courseState(course, u, today);
    strips[u.id] = recentStrip(st.cal, st.levels, today);
  }
  const me = view.members.find((m) => m.me);
  return { view, strips, myVisibility: me?.visibility ?? "grass" };
}

export async function myMembership(userId: string) {
  return prisma.groupMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    include: { group: { include: { _count: { select: { members: true } } } } },
  });
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = newInviteCode();
    const hit = await prisma.group.findUnique({ where: { inviteCode: code } });
    if (!hit) return code;
  }
  return `${newInviteCode()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

/** 그룹이 없으면 내 이름으로 하나 만든다 */
export async function ensureGroup(user: User) {
  const m = await myMembership(user.id);
  if (m) return m.group;
  const group = await prisma.group.create({
    data: {
      name: "퇴근 후 공부방",
      inviteCode: await uniqueCode(),
      inviteExpiresAt: inviteExpiry(await getNow()),
      createdById: user.id,
      members: { create: { userId: user.id, visibility: "grass" } },
    },
    include: { _count: { select: { members: true } } },
  });
  return group;
}

/** 새 링크를 만들면 이전 코드는 더 이상 열리지 않는다 */
export async function regenerateInvite(user: User) {
  const g = await ensureGroup(user);
  return prisma.group.update({
    where: { id: g.id },
    data: { inviteCode: await uniqueCode(), inviteExpiresAt: inviteExpiry(await getNow()) },
  });
}

export async function setVisibility(user: User, visibility: "grass" | "grass_topic") {
  const m = await myMembership(user.id);
  if (!m) return false;
  await prisma.groupMember.update({ where: { id: m.id }, data: { visibility } });
  return true;
}

export type InviteLookup =
  | { ok: false; reason: "unknown" | "expired" }
  | {
      ok: true;
      group: { id: string; name: string; code: string };
      inviter: string;
      members: { id: string; name: string; teacher: ReturnType<typeof teacherOf> }[];
      weekCells: number;
      full: boolean;
    };

export async function lookupInvite(code: string, today: DayKey): Promise<InviteLookup> {
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: { createdBy: true, members: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
  });
  if (!group) return { ok: false, reason: "unknown" };
  if (inviteExpired(group.inviteExpiresAt, await getNow())) return { ok: false, reason: "expired" };
  const mon = mondayOf(today);
  let weekCells = 0;
  for (const m of group.members) {
    const course = await getActiveCourse(m.userId);
    if (!course) continue;
    const st = courseState(course, m.user, today);
    for (const [day, lv] of st.levels) {
      if (lv > 0 && diffDays(day, mon) >= 0 && diffDays(today, day) >= 0) weekCells++;
    }
  }
  return {
    ok: true,
    group: { id: group.id, name: group.name, code: group.inviteCode },
    inviter: group.createdBy.name,
    members: group.members.map((m) => ({ id: m.userId, name: m.user.name, teacher: teacherOf(m.user) })),
    weekCells,
    full: group.members.length >= GROUP_MAX,
  };
}

export type JoinResult = { ok: true; groupId: string } | { ok: false; message: string };

/** 한 사람은 한 그룹에만. 다른 그룹에 있었다면 그곳에서는 나온다 */
export async function joinByCode(user: User, code: string, today: DayKey): Promise<JoinResult> {
  const inv = await lookupInvite(code, today);
  if (!inv.ok) return { ok: false, message: inv.reason === "expired" ? "만료된 초대 링크예요" : "없는 초대 링크예요" };
  const already = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: inv.group.id, userId: user.id } },
  });
  if (already) return { ok: true, groupId: inv.group.id };
  if (inv.full) return { ok: false, message: `한 그룹은 ${GROUP_MAX}명까지예요` };
  await prisma.$transaction([
    prisma.groupMember.deleteMany({ where: { userId: user.id } }),
    prisma.groupMember.create({ data: { groupId: inv.group.id, userId: user.id, visibility: "grass" } }),
  ]);
  await notifyGroup(user, today, {
    kind: "group",
    title: `${user.name}님이 ${inv.group.name}에 들어왔어요`,
    body: "서로의 잔디가 보여요",
    href: "/group",
  });
  return { ok: true, groupId: inv.group.id };
}

/**
 * 그룹의 다른 멤버들에게 알림을 남긴다. 알림 제한(하루 2번, 밤 시간, 쉬는 중, 그룹 소식 끔)을 지킨다.
 * 보낸 사람 수를 돌려준다.
 */
export async function notifyGroup(
  from: User,
  today: DayKey,
  n: { kind: string; title: string; body: string; href?: string },
): Promise<number> {
  const m = await myMembership(from.id);
  if (!m) return 0;
  const others = await prisma.groupMember.findMany({
    where: { groupId: m.groupId, userId: { not: from.id } },
    include: { user: true },
  });
  const hour = await getHour();
  let sent = 0;
  for (const o of others) {
    const d = await notifyDecision(o.user, "group", today, hour);
    if (!d.ok) continue;
    await prisma.notification.create({
      data: { userId: o.userId, kind: n.kind, title: n.title, body: n.body, href: n.href ?? "/group" },
    });
    sent++;
  }
  return sent;
}

export type { MemberView };
