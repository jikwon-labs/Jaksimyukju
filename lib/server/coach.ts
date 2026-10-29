import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TIME_ZONE } from "@/lib/clock";
import { addDays, dayKeyAt, mondayOf, type DayKey } from "@/lib/domain/dates";
import { coachNotes, MISSED_EARLIER_LINE, MISSED_ONE_LINE, reminderDue, RETRO_LINE, STUDY_LINE } from "@/lib/domain/coach";
import { dayKind, missedStudyDays } from "@/lib/domain/rest";
import type { CourseState } from "./course";
import { teacherOf } from "./course";
import { createCapped, notifyDecision } from "./notify";

/**
 * 홈을 열 때와 스케줄러가 부른다. 남길 선생님 알림이 있으면 알림 목록에 넣는다(알림 제한을 지킨다).
 * tickMinute: 스케줄러가 부를 때 그 시각(KST 하루 중 분). 있으면 학습 시각 뒤 학습 시간 알림도 남긴다
 */
export async function runCoach(
  user: User,
  st: CourseState,
  today: DayKey,
  hour: number,
  now: Date,
  tickMinute: number | null = null,
): Promise<number> {
  // 완주했거나 멈춘 과정에는 남기지 않는다
  if (st.course.status !== "active") return 0;
  const who = teacherOf(user);
  const since = new Date(`${addDays(mondayOf(today), -7)}T00:00:00+09:00`);
  const recent = await prisma.notification.findMany({
    where: { userId: user.id, kind: { in: ["teacher", "retro"] }, createdAt: { gte: since } },
    select: { kind: true, body: true, createdAt: true },
  });
  const sent = recent.map((n) => ({
    key:
      n.kind === "retro"
        ? "retro"
        : Object.values(STUDY_LINE).includes(n.body)
          ? "study"
          : [...Object.values(MISSED_ONE_LINE), ...Object.values(MISSED_EARLIER_LINE)].includes(n.body)
          ? "missed_one"
          : "other",
    day: dayKeyAt(n.createdAt, TIME_ZONE),
  }));
  const retroDoneThisWeek =
    (await prisma.retro.count({
      where: { userId: user.id, createdAt: { gte: new Date(`${mondayOf(today)}T00:00:00+09:00`) } },
    })) > 0;
  const gap = missedStudyDays(st.cal, st.levels, today);
  const notes = coachNotes({
    today,
    missed: gap.count,
    missedDay: gap.days[0] ?? null,
    studiedToday: st.studiedToday,
    restingToday: st.restingToday,
    sent,
    retroDoneThisWeek,
    studyDay: dayKind(st.cal, today) === "study",
    remind: tickMinute !== null && reminderDue(tickMinute, user.notifyTime),
  });
  let made = 0;
  for (const n of notes) {
    const d = await notifyDecision(user, n.kind, today, hour);
    if (!d.ok) continue;
    const body =
      n.key === "retro"
        ? RETRO_LINE[who]
        : n.key === "study"
          ? STUDY_LINE[who]
          : n.yesterday
            ? MISSED_ONE_LINE[who]
            : MISSED_EARLIER_LINE[who];
    // 같은 키는 DB가 한 번만 받는다(두 탭에서 동시에 열어도 중복이 생기지 않는다)
    const ok = await createCapped(
      {
        userId: user.id,
        kind: n.kind,
        title: n.key === "retro" ? "주간 회고" : n.key === "study" ? "학습 시간" : `${who} 선생님`,
        body,
        href: n.href,
        dedupeKey: `${user.id}:${n.dedupe}`,
        createdAt: now,
      },
      today,
    );
    if (ok) made++;
  }
  return made;
}
