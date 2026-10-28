import { Topic } from "./topic.client";

export const metadata = { title: "주제 정하기 · 작심육주" };

/** 목적지 화면의 "다음 과정"에서 오면 주제와 수준을 이어받는다 */
export default async function TopicPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; level?: string; from?: string }>;
}) {
  const q = await searchParams;
  const next = q.from === "finish" && q.topic ? { topic: q.topic.slice(0, 60), level: q.level ?? "" } : undefined;
  return <Topic next={next} />;
}
