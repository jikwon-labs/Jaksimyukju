import type { User } from "@prisma/client";
import { TEACHERS } from "@/lib/design/tokens";
import { finishLine } from "@/lib/domain/finish";
import { dotDate } from "@/lib/domain/medal";
import { teacherOf } from "@/lib/server/course";
import { pendingMedal } from "@/lib/server/medal";
import { MedalAward } from "./MedalAward.client";

/** 완주했는데 아직 메달을 받지 않은 과정이 있으면 수여 화면을 띄운다. 홈·지도·목적지 화면에 둔다 */
export async function MedalGate({ user }: { user: User }) {
  const m = await pendingMedal(user);
  if (!m) return null;
  const who = teacherOf(user);
  return (
    <MedalAward
      key={m.courseId}
      courseId={m.courseId}
      topic={m.topic}
      weeks={m.weeks}
      teacher={who}
      teacherColor={TEACHERS[who].body}
      line={finishLine(who, m.weeks)}
      period={`${dotDate(m.start)} – ${dotDate(m.end)}`}
      cells={m.cells}
    />
  );
}
