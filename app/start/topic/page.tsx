import { getSessionUser } from "@/lib/auth";
import { parseStudyDays } from "@/lib/domain/dates";
import { teacherOf } from "@/lib/server/course";
import { Topic, type TopicSeed } from "./topic.client";

export const metadata = { title: "주제 정하기 · 작심육주" };

/**
 * 목적지 화면의 "다음 과정"에서 오면 주제와 수준을 이어받는다.
 * 내 과정의 "새 과정 추가"(from=add)나 다음 과정으로 오면 선생님과 학습 시간을 내 설정에서 이어받는다
 */
export default async function TopicPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; level?: string; from?: string }>;
}) {
  const q = await searchParams;
  const next = q.from === "finish" && q.topic ? { topic: q.topic.slice(0, 60), level: q.level ?? "" } : undefined;
  const user = q.from === "add" || q.from === "finish" ? await getSessionUser() : null;
  const seed: TopicSeed | undefined = user
    ? {
        teacher: teacherOf(user),
        studyDays: parseStudyDays(user.studyDays),
        minutes: user.minutesPerDay,
        notifyTime: user.notifyTime,
      }
    : undefined;
  return <Topic next={next} seed={seed} backHref={q.from === "add" && user ? "/courses" : undefined} />;
}
