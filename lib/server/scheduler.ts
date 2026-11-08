import "server-only";
// 스케줄러 한 번(tick). 외부 cron이 10~30분마다 부른다고 보고, 진행 중 과정이 있는 사용자마다 선생님 알림을 만든다.
// 알림 제한(하루 2번, 밤 11시~아침 7시, 쉬는 날, 종류별 끔)과 중복 키는 runCoach가 지킨다.
import { TIME_ZONE } from "@/lib/clock";
import { dayKeyAt, hourAt, minuteAt } from "@/lib/domain/dates";
import { prisma } from "@/lib/prisma";
import { runCoach } from "./coach";
import { loadState } from "./course";

export interface TickResult {
  users: number;
  made: number;
}

export async function runTick(now: Date): Promise<TickResult> {
  const today = dayKeyAt(now, TIME_ZONE);
  const hour = hourAt(now, TIME_ZONE);
  const minuteOfDay = hour * 60 + minuteAt(now, TIME_ZONE);
  const users = await prisma.user.findMany({ where: { courses: { some: { status: "active" } } } });
  let made = 0;
  for (const user of users) {
    // 보는 과정이 진행 중이면 그것, 아니면(방금 완주 등) 가장 최근의 진행 중 과정으로 알림을 판단한다
    let st = await loadState(user, today);
    if (st && st.course.status !== "active") {
      const active = await prisma.course.findFirst({
        where: { userId: user.id, status: "active" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      st = active ? await loadState(user, today, active.id) : null;
    }
    if (!st) continue;
    // 새로 만든 알림은 createCapped가 푸시로도 보낸다(lib/server/push.ts, 운영은 Expo)
    made += await runCoach(user, st, today, hour, now, minuteOfDay);
  }
  return { users: users.length, made };
}
