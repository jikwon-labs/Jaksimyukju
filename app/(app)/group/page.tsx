import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { NudgeButton } from "@/components/NudgeButton";
import { StateView } from "@/components/states/StateView";
import { Teacher } from "@/components/teacher/Teacher";
import { Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { accent, grassColors, TEACHERS } from "@/lib/design/tokens";
import type { TeacherName } from "@/lib/design/types";
import { NUDGE_MESSAGES } from "@/lib/domain/limits";
import { memberStatus, type StripCell } from "@/lib/domain/social";
import { loadState, teacherOf } from "@/lib/server/course";
import { getGroupPage } from "@/lib/server/social";
import { VisibilityControl } from "./VisibilityControl.client";
import s from "./group.module.css";

export const metadata = { title: "그룹 · 작심육주" };

/** 멤버 잔디는 그 멤버 선생님 색으로 칠한다 */
function memberVars(who: TeacherName): CSSProperties {
  const t = TEACHERS[who];
  const l = grassColors(t, false);
  const d = grassColors(t, true);
  const vars: Record<string, string> = {
    "--mt-l": accent(t, false).text,
    "--mt-d": accent(t, true).text,
  };
  for (let i = 1; i <= 4; i++) {
    vars[`--ml${i}`] = l[i];
    vars[`--md${i}`] = d[i];
  }
  return vars as CSSProperties;
}

function stripLabel(name: string, cells: StripCell[]): string {
  const n = cells.filter((c) => c.level > 0).length;
  return `${name}의 최근 2주 학습 기록. ${n}일 학습`;
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}

export default async function GroupPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const today = await getToday();
  const st = await loadState(user, today);
  if (!st) redirect("/start/personality");
  const who = teacherOf(user);
  const page = await getGroupPage(user, today);
  const members = page?.view.members ?? [];
  const others = members.filter((m) => !m.me);

  const header = (
    <header className={s.header}>
      <h1>그룹</h1>
      <Link href="/group/invite" className={s.inviteLink}>
        <LinkIcon />
        초대 링크
      </Link>
    </header>
  );

  if (!page || others.length === 0) {
    return (
      <Page tabs className={s.page}>
        {header}
        <StateView kind="empty-group" who={who} inline />
      </Page>
    );
  }

  const done = members.filter((m) => m.studiedToday).length;
  // 나를 맨 위에
  const ordered = [...members].sort((a, b) => Number(b.me) - Number(a.me));

  return (
    <Page tabs className={s.page}>
      {header}

      <section aria-label="그룹 요약" className={s.summary}>
        <div className={s.sumRow}>
          <span className={s.groupName}>{page.view.name}</span>
          <span className={s.meta}>멤버 {members.length}명</span>
        </div>
        <div className={s.sumCount}>
          <span className={s.count} data-testid="group-done-count">
            {done} / {members.length}
          </span>
          <span className={s.countLabel}>오늘 학습을 마쳤어요</span>
        </div>
        <div className={s.bars} style={{ gridTemplateColumns: `repeat(${members.length}, 1fr)` }} aria-hidden>
          {members.map((m, i) => (
            <span key={m.id} className={s.bar} data-on={i < done ? "true" : "false"} />
          ))}
        </div>
      </section>

      <h2 className={s.h2}>멤버</h2>
      <div className={s.list}>
        {ordered.map((m) => {
          const ms = memberStatus(m);
          const cells = page.strips[m.id] ?? [];
          return (
            <article key={m.id} aria-label={m.name} className={s.member} style={memberVars(m.teacher)} data-testid={`group-member-${m.name}`}>
              <div className={s.top}>
                <Teacher who={m.teacher} state={ms.away ? "sad" : "base"} size={44} decorative />
                <div className={s.who}>
                  <div className={s.nameRow}>
                    <span className={s.name}>{m.me && m.name !== "나" ? `${m.name} (나)` : m.name}</span>
                    <span className={s.topic} data-testid={`topic-${m.name}`}>
                      {m.topic ?? "주제 비공개"}
                    </span>
                  </div>
                  <span className={s.streak} data-away={ms.away ? "true" : "false"} data-testid={`status-${m.name}`}>
                    {ms.line}
                  </span>
                </div>
                <span className={s.chip} data-done={ms.chip === "done" ? "true" : "false"}>
                  {ms.chipText}
                </span>
              </div>
              <div className={s.bottom}>
                <div role="img" aria-label={stripLabel(m.name, cells)} className={s.strip}>
                  {cells.map((c) => (
                    <span key={c.day} className={s.cell} data-kind={c.kind} data-level={c.level} />
                  ))}
                </div>
                {ms.canPoke && (
                  <span data-testid={`nudge-${m.name}`} className={s.poke}>
                    <NudgeButton
                      toId={m.id}
                      name={m.name}
                      disabledMessage={m.nudge.ok ? undefined : NUDGE_MESSAGES[m.nudge.reason]}
                    />
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <section aria-label="내 공개 범위" className={s.scope}>
        <h2 className={s.h2}>그룹에 보여 줄 것</h2>
        <VisibilityControl initial={page.myVisibility} />
      </section>

      <p className={s.foot}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={s.lock}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        그룹에는 주제와 진도만 보여요. 튜터 대화와 결과물은 나만 볼 수 있어요. 콕 찌르기는 한 사람에게 하루 한 번만 보낼 수 있어요.
      </p>
    </Page>
  );
}
