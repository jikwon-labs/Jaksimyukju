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
    const st = await loadState(user, today);
    if (!st) continue;
    // 실제 푸시를 붙일 때는 여기서 새로 만든 알림을 user.pushToken으로 보낸다(지금은 알림 목록에만 남긴다)
    made += await runCoach(user, st, today, hour, now, minuteOfDay);
  }
  return { users: users.length, made };
}
