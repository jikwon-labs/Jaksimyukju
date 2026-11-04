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
import { matchEvidence } from "@/lib/domain/material";
import type { TeacherName } from "@/lib/design/types";
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

const MINE_WHY: Record<TeacherName, string> = {
  온: "내가 올린 자료에서 오늘 레슨과 맞닿은 문장을 골라 뒀어요. 레슨이랑 나란히 읽어 봐요.",
  결: "올린 자료에서 오늘 레슨의 근거 문장만 뽑았습니다. 레슨과 대조하세요.",
  새: "내 자료 속에서 오늘 레슨이랑 이어지는 문장을 찾아왔어요!",
};

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
  const mine = !!r.materialId;
  // 내 자료는 번호 대신 글이 겹치는 정도로 레슨 문장과 자료 문장을 짝짓는다
  const evidence = mine ? matchEvidence(sections, summary) : [];

  if (mine) {
    return (
      <main className={s.page}>
        <BackHeader href={`/lesson/${lesson.id}`} title="오늘 레슨 자료" />

        <section className={s.meta}>
          <div className={s.tags}>
            <span className={s.tag}>내 자료 · {r.url ? "웹 링크" : "PDF"}</span>
            <span className={`${s.tag} ${s.good}`} data-testid="material-tag">
              내가 올린 자료
            </span>
            <span className={s.tag}>근거 {n}</span>
          </div>
          <h2 className={s.title} data-testid="resource-title">
            {r.title}
          </h2>
          <p className={s.source}>{r.url ? hostOf(r.url) : (r.material?.source ?? "PDF 파일")}</p>
        </section>

        <div className={s.why}>
          <Teacher who={who} size={44} jump label={`${who} 선생님`} />
          <p>
            <span className={s.whyLabel}>고른 이유</span>
            {MINE_WHY[who]}
          </p>
        </div>

        <section aria-label="자료에서 뽑은 문장" className={s.summary}>
          <div className={s.summaryHead}>
            <h3>자료에서 뽑은 문장</h3>
            <span className={s.disclaim}>내 자료 원문 그대로</span>
          </div>
          <ol data-testid="resource-summary">
            {summary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
          <p className={s.foot}>오늘 레슨과 가장 많이 겹치는 문장을 세 개까지 골랐어요.</p>
        </section>

        <section aria-label="레슨과 연결된 부분" className={s.links}>
          <h3>이 자료가 받쳐 주는 레슨 문장</h3>
          {evidence.length > 0 ? (
            evidence.map((e) => (
              <div key={e.section} className={s.quote} data-testid="resource-cite">
                <p>&ldquo;{e.heading}&rdquo;</p>
                <span className={s.evidence}>
                  <LinkIcon />
                  근거 {n} · 레슨 설명 {e.section + 1}
                </span>
                <p className={s.foot}>자료: {e.quote}</p>
              </div>
            ))
          ) : (
            <div className={s.quote}>
              <p>이 자료는 특정 문장보다 오늘 레슨 전체를 넓게 보충해요.</p>
              <span className={s.evidence}>
                <LinkIcon />
                근거 {n} · 내 자료
              </span>
            </div>
          )}
        </section>

        <p className={s.foot}>올린 자료에서 글자만 뽑아 두었어요. 원본 파일은 저장하지 않아요.</p>

        <ResourceButtons url={r.url || null} resourceId={r.id} />
      </main>
    );
  }

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
