import Link from "next/link";
import { redirect } from "next/navigation";
import { Teacher } from "@/components/teacher/Teacher";
import { BackHeader } from "@/components/ui";
import { NO_RESOURCE_BODY, NO_RESOURCE_NOTE } from "@/components/lesson/copy";
import { hostOf, monthDay } from "@/components/lesson/format";
import { StateBlock } from "@/components/lesson/StateBlock";
import p from "@/components/lesson/parts.module.css";
import { getSessionUser } from "@/lib/auth";
import { json, lessonBody, teacherOf } from "@/lib/server/course";
import { getOwnResource } from "@/lib/server/lesson";
import { ResourceButtons } from "./resource.client";
import s from "./resource.module.css";

export const metadata = { title: "자료 · 작심육주" };

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/");
  const who = teacherOf(user);
  const r = await getOwnResource(user, id);

  if (!r) {
    return (
      <main className={s.page}>
        <BackHeader href="/home" title="오늘 레슨 자료" />
        <StateBlock
          who={who}
          face="think"
          tag="자료 없음"
          title="확인된 자료를 아직 못 찾았어요"
          body={NO_RESOURCE_BODY[who]}
          note={NO_RESOURCE_NOTE}
          testId="no-resources"
          actions={
            <Link href="/home" className={p.primary}>
              레슨 계속하기
            </Link>
          }
        />
      </main>
    );
  }

  const lesson = r.lesson;
  const index = lesson.resources.findIndex((x) => x.id === r.id);
  const n = index + 1;
  const sections = lessonBody(lesson.body).sections;
  const cited = sections
    .map((sec, i) => ({ sec, i }))
    .filter(({ sec }) => sec.ref === index);
  const summary = json<string[]>(r.summary).filter((x) => typeof x === "string").slice(0, 3);

  return (
    <main className={s.page}>
      <BackHeader href={`/lesson/${lesson.id}`} title="오늘 레슨 자료" />

      <section className={s.meta}>
        <div className={s.tags}>
          <span className={s.tag}>
            {r.kind} · 약 {r.minutes}분
          </span>
          {r.checkedAt ? (
            <span className={`${s.tag} ${s.good}`} data-testid="link-checked">
              링크 확인함
            </span>
          ) : (
            <span className={`${s.tag} ${s.warn}`}>링크 확인 전</span>
          )}
          <span className={s.tag}>근거 {n}</span>
        </div>
        <h2 className={s.title} data-testid="resource-title">
          {r.title}
        </h2>
        <p className={s.source}>
          {hostOf(r.url)}
          {r.checkedAt && ` · ${monthDay(r.checkedAt)} 링크 확인`}
        </p>
      </section>

      <div className={s.why}>
        <Teacher who={who} size={44} jump label={`${who} 선생님`} />
        <p>
          <span className={s.whyLabel}>고른 이유</span>
          {r.reason}
        </p>
      </div>

      <section aria-label="핵심 요약" className={s.summary}>
        <div className={s.summaryHead}>
          <h3>핵심 세 줄</h3>
          <span className={s.disclaim}>AI 요약 · 원문과 다를 수 있어요</span>
        </div>
        <ol data-testid="resource-summary">
          {summary.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
        <p className={s.foot}>요약은 세 줄까지만 보여 드려요. 전체 내용은 원문에서 읽어요.</p>
      </section>

      <section aria-label="레슨과 연결된 부분" className={s.links}>
        <h3>이 자료가 받쳐 주는 레슨 문장</h3>
        {cited.length > 0 ? (
          cited.map(({ sec, i }) => (
            <div key={i} className={s.quote} data-testid="resource-cite">
              <p>&ldquo;{sec.heading.replace(/^\d+\.\s*/, "")}&rdquo;</p>
              <span className={s.evidence}>
                <LinkIcon />
                근거 {n} · 레슨 설명 {i + 1}
              </span>
            </div>
          ))
        ) : (
          <div className={s.quote}>
            <p>이 자료는 특정 문장보다 오늘 레슨 전체를 넓게 보충해요.</p>
            <span className={s.evidence}>
              <LinkIcon />
              근거 {n} · 더 보고 싶다면
            </span>
          </div>
        )}
      </section>

      <p className={s.foot}>
        검색으로 찾은 뒤 링크가 열리는지, 레슨 내용과 맞는지 확인한 자료만 보여 줘요. 광고성 글과 로그인해야 보이는 글은
        뺐어요.
      </p>

      <ResourceButtons url={r.url} resourceId={r.id} />
    </main>
  );
}
