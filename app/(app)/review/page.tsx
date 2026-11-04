import Link from "next/link";
import { redirect } from "next/navigation";
import { Teacher } from "@/components/teacher/Teacher";
import { BackHeader, Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { dayKind } from "@/lib/domain/rest";
import { grassNote, REVIEW_DONE_LINE, reviewDayLabel } from "@/lib/domain/review";
import { loadState, teacherOf } from "@/lib/server/course";
import { prepareSession, reviewSummary } from "@/lib/server/review";
import { ReviewPlay } from "./review.client";
import s from "./review.module.css";

export const metadata = { title: "오늘 복습 · 작심육주" };

export default async function ReviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const today = await getToday();
  const st = await loadState(user, today);
  if (!st) redirect("/start/personality");
  const who = teacherOf(user);
  const cards = st.restingToday ? [] : await prepareSession(user, st);

  // 다 풀고 홈을 갱신할 때(finishReviewAction) 서버가 이 화면도 다시 그린다. 빈 목록이나 다음 묶음이 와도 ReviewPlay는 처음 받은 목록으로 결과까지 보여 준다
  const sum = cards.length === 0 ? await reviewSummary(st) : null;
  let empty = null;
  if (sum) {
    const title = st.restingToday ? "오늘은 복습도 쉬어 가요" : sum.doneToday > 0 ? "오늘 복습을 마쳤어요" : "오늘 복습할 카드가 없어요";
    const body = st.restingToday
      ? "쉬어 가기로 정한 날이에요. 밀린 카드는 다음 날로 넘어가요."
      : sum.nextDay
        ? `다음 복습은 ${reviewDayLabel(sum.nextDay)}이에요.`
        : "레슨을 마치거나 퀴즈에서 틀린 문제가 생기면 하루 뒤 복습 카드가 돼요.";
    empty = (
      <Page>
        <BackHeader href="/home" title="오늘 복습" />
        <section className={s.empty} aria-label="복습 없음" data-testid="review-empty">
          <Teacher who={who} state={sum.doneToday > 0 ? "joy" : "base"} size={96} jump />
          <h2>{title}</h2>
          <p>{body}</p>
          <Link href="/home" prefetch={false} className={s.home}>
            홈으로
          </Link>
        </section>
      </Page>
    );
  }

  return (
    <ReviewPlay
      who={who}
      cards={cards}
      empty={empty}
      doneLine={REVIEW_DONE_LINE[who]}
      note={grassNote(dayKind(st.cal, today) === "study", st.studiedToday)}
      lessonLeft={dayKind(st.cal, today) === "study" && !st.studiedToday && st.view.today !== null}
    />
  );
}
