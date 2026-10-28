import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TIME_ZONE } from "@/lib/clock";
import { addDays, dayKeyAt, mondayOf, type DayKey } from "@/lib/domain/dates";
import { coachNotes, MISSED_ONE_LINE, RETRO_LINE } from "@/lib/domain/coach";
import type { CourseState } from "./course";
import { teacherOf } from "./course";
import { notifyDecision } from "./notify";

/** 홈을 열 때 부른다. 남길 선생님 알림이 있으면 알림 목록에 넣는다(알림 제한을 지킨다) */
export async function runCoach(user: User, st: CourseState, today: DayKey, hour: number, now: Date): Promise<number> {
  const who = teacherOf(user);
  const since = new Date(`${addDays(mondayOf(today), -7)}T00:00:00+09:00`);
  const recent = await prisma.notification.findMany({
    where: { userId: user.id, kind: { in: ["teacher", "retro"] }, createdAt: { gte: since } },
    select: { kind: true, body: true, createdAt: true },
  });
  const sent = recent.map((n) => ({
    key: n.kind === "retro" ? "retro" : Object.values(MISSED_ONE_LINE).includes(n.body) ? "missed_one" : "other",
    day: dayKeyAt(n.createdAt, TIME_ZONE),
  }));
  const retroDoneThisWeek =
    (await prisma.retro.count({
      where: { userId: user.id, createdAt: { gte: new Date(`${mondayOf(today)}T00:00:00+09:00`) } },
    })) > 0;
  const notes = coachNotes({
    today,
    missed: st.missed,
    studiedToday: st.studiedToday,
    restingToday: st.restingToday,
    sent,
    retroDoneThisWeek,
  });
  let made = 0;
  for (const n of notes) {
    const d = await notifyDecision(user, n.kind, today, hour);
    if (!d.ok) continue;
    await prisma.notification.create({
      data: {
        userId: user.id,
        kind: n.kind,
        title: n.kind === "retro" ? "주간 회고" : `${who} 선생님`,
        body: n.kind === "retro" ? RETRO_LINE[who] : MISSED_ONE_LINE[who],
        href: n.href,
        createdAt: now,
      },
    });
    made++;
  }
  return made;
}
