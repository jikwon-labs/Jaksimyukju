import { redirect } from "next/navigation";
import { focusCourseAction, stopCourseAction } from "@/app/actions/courses";
import { BackHeader, Button, ButtonLink, Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { ADD_MESSAGES, canAddCourse, MAX_ACTIVE_COURSES } from "@/lib/domain/courses";
import { focusCourseId, listOpenCourses, loadState } from "@/lib/server/course";
import s from "./courses.module.css";

export const metadata = { title: "내 과정 · 작심육주" };

/** 함께 하는 과정 목록. 보는 과정을 바꾸고, 새 과정을 더하고, 그만둔다 */
export default async function CoursesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const today = await getToday();
  const focus = await focusCourseId(user.id);
  if (!focus) redirect("/start/personality");
  // 진행 중 과정 전부와, 지금 보는 과정이 방금 완주한 과정이면 그것까지
  const open = (await listOpenCourses(user.id)).filter((c) => c.status === "active" || c.id === focus);
  const rows = [];
  for (const c of open) {
    const st = await loadState(user, today, c.id);
    if (st) rows.push({ c, st });
  }
  const active = open.filter((c) => c.status === "active").length;
  const add = canAddCourse(active);

  return (
    <Page className={s.page}>
      <BackHeader href="/home" title="내 과정" />
      <p className={s.lead}>
        과정은 {MAX_ACTIVE_COURSES}개까지 함께 할 수 있어요. 고른 과정이 오늘 화면과 커리큘럼에 보여요.
      </p>

      <ul className={s.list} aria-label="함께 하는 과정">
        {rows.map(({ c, st }) => {
          const on = c.id === focus;
          const finished = c.status === "finished";
          return (
            <li key={c.id} className={s.item} data-on={on ? "true" : "false"} data-testid={`course-${c.topic}`}>
              <div className={s.top}>
                <span className={s.topic}>{c.topic}</span>
                <span className={s.chip} data-kind={finished ? "finished" : on ? "on" : "idle"}>
                  {finished ? "완주" : on ? "보는 중" : st.studiedToday ? "오늘 완료" : "진행 중"}
                </span>
              </div>
              <span className={s.meta}>
                {finished ? `${c.weeksCount}주 과정 완주` : `${st.view.currentWeek}주차`} · 레슨 {st.view.lessonsDone}/
                {st.view.lessonsTotal} · 연속 {st.streak}일
              </span>
              <div className={s.bar} aria-hidden>
                <span style={{ width: `${st.view.lessonsTotal ? (st.view.lessonsDone / st.view.lessonsTotal) * 100 : 0}%` }} />
              </div>
              {(!on || !finished) && (
                <div className={s.actions}>
                  {!on && (
                    <form action={focusCourseAction}>
                      <input type="hidden" name="courseId" value={c.id} />
                      <Button variant="tinted" className={s.go} data-testid={`focus-${c.topic}`}>
                        이 과정 보기
                      </Button>
                    </form>
                  )}
                  {!finished && (
                    <details className={s.stop}>
                      <summary data-testid={`stop-${c.topic}`}>그만두기</summary>
                      <form action={stopCourseAction} className={s.stopForm}>
                        <input type="hidden" name="courseId" value={c.id} />
                        <p>그만두면 이 과정은 더 이어 갈 수 없어요. 잔디와 기록은 내 정보의 지난 과정에 남아요.</p>
                        <Button variant="secondary" data-testid={`stop-confirm-${c.topic}`}>
                          {c.topic} 그만두기
                        </Button>
                      </form>
                    </details>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {add.ok ? (
        <ButtonLink href="/start/topic?from=add" block data-testid="course-add">
          새 과정 추가
        </ButtonLink>
      ) : (
        <>
          <Button block disabled data-testid="course-add">
            새 과정 추가
          </Button>
          <p className={s.note} role="note">
            {ADD_MESSAGES[add.reason]}
          </p>
        </>
      )}
      <p className={s.note}>
        선생님, 학습 요일, 하루 학습 시간은 모든 과정이 함께 써요. 잔디와 연속 기록은 과정마다 따로 쌓여요.
      </p>
    </Page>
  );
}
