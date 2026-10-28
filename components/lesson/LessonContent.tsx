import Link from "next/link";
import { Teacher } from "@/components/teacher/Teacher";
import type { LessonBody, LessonSection } from "@/lib/ai/types";
import type { TeacherName } from "@/lib/design/types";
import { NO_RESOURCE_BODY, NO_RESOURCE_NOTE } from "./copy";
import { ArrowOutIcon, BackIcon, StateBlock } from "./StateBlock";
import s from "./lesson.module.css";

export interface LessonResourceView {
  id: string;
  title: string;
  kind: string;
  minutes: number;
  source: string;
}

/** 레슨 화면과 오프라인 화면이 같이 쓰는 레슨 데이터(localStorage에도 이 모양으로 저장) */
export interface LessonPayload {
  id: string;
  title: string;
  meta: string;
  who: TeacherName;
  intro: string;
  minutes: number;
  extraMinutes: number;
  status: string;
  body: LessonBody;
  shortBody: LessonBody;
  resources: LessonResourceView[];
  savedAt?: string;
}

function SourceMark({ section, resources }: { section: LessonSection; resources: LessonResourceView[] }) {
  const r = resources[section.ref];
  const n = section.ref + 1;
  if (!r) {
    return (
      <sup className={s.mark} aria-label={`근거 자료 ${n}`}>
        [{n}]
      </sup>
    );
  }
  return (
    <sup className={s.mark}>
      <Link href={`/resource/${r.id}`} aria-label={`근거 자료 ${n}: ${r.title}`} data-testid="source-mark">
        [{n}]
      </Link>
    </sup>
  );
}

function Section({ section, i, resources }: { section: LessonSection; i: number; resources: LessonResourceView[] }) {
  return (
    <section aria-label={`설명 ${i + 1}`} className={s.section} data-testid="lesson-section">
      <h2>{section.heading}</h2>
      <p>
        {section.text}
        <SourceMark section={section} resources={resources} />
      </p>
      <div className={s.example}>
        <span className={s.exampleLabel}>예시</span>
        <p>{section.example}</p>
      </div>
    </section>
  );
}

export function LessonContent({
  lesson,
  short,
  onMode,
  backHref = "/home",
}: {
  lesson: LessonPayload;
  short: boolean;
  onMode?: (short: boolean) => void;
  backHref?: string;
}) {
  const body = short ? lesson.shortBody : lesson.body;
  const sections = short ? body.sections.slice(0, 1) : body.sections;
  const total = lesson.minutes + lesson.extraMinutes;
  const completed = lesson.status !== "todo";
  return (
    <div className={s.content}>
      <header className={s.header}>
        <Link href={backHref} aria-label="오늘로 돌아가기" className={s.back}>
          <BackIcon />
        </Link>
        <div role="group" aria-label="분량" className={s.segment}>
          <button
            type="button"
            aria-pressed={!short}
            className={s.segBtn}
            onClick={() => onMode?.(false)}
            disabled={!onMode}
            data-testid="mode-full"
          >
            전체 {total}분
          </button>
          <button
            type="button"
            aria-pressed={short}
            className={s.segBtn}
            onClick={() => onMode?.(true)}
            disabled={!onMode}
            data-testid="mode-short"
          >
            5분 버전
          </button>
        </div>
      </header>

      <div className={s.titleBlock}>
        <div className={s.metaRow}>
          <span className={s.meta}>{lesson.meta}</span>
          {completed && (
            <span className={s.donePill} data-testid="lesson-done">
              {lesson.status === "short" ? "5분 버전 완료 · 다시 보기" : "완료한 레슨 · 다시 보기"}
            </span>
          )}
        </div>
        <h1 data-testid="lesson-title">{lesson.title}</h1>
        {lesson.extraMinutes > 0 && !short && (
          <p className={s.extra} data-testid="lesson-extra">
            지난 레슨에서 남은 내용을 붙여서 {lesson.extraMinutes}분 더 길어졌어요
          </p>
        )}
      </div>

      <div className={s.intro}>
        <Teacher who={lesson.who} size={40} />
        <p>{lesson.intro}</p>
      </div>

      <section aria-label="핵심 한 줄" className={s.core}>
        <span className={s.coreLabel}>핵심 한 줄</span>
        <p>{body.core}</p>
      </section>

      {sections.map((sec, i) => (
        <Section key={i} section={sec} i={i} resources={lesson.resources} />
      ))}

      {short && (
        <p className={s.shortNote}>
          5분 버전은 핵심 한 줄과 첫 설명만 봐요. 남은 내용은 다음 레슨에 5분 붙여 둘게요.
        </p>
      )}

      {!short &&
        (lesson.resources.length > 0 ? (
          <section aria-label="추천 자료" className={s.section}>
            <div className={s.resHead}>
              <h2>더 보고 싶다면</h2>
              <span className={s.meta}>선생님이 고른 자료 {lesson.resources.length}개</span>
            </div>
            {lesson.resources.map((r, i) => (
              <Link key={r.id} href={`/resource/${r.id}`} className={s.resRow} data-testid="resource-row">
                <span className={s.kind}>{r.kind}</span>
                <span className={s.resText}>
                  <span className={s.resTitle}>
                    <span className={s.resNum}>[{i + 1}]</span> {r.title}
                  </span>
                  <span className={s.meta}>
                    {r.kind} · 약 {r.minutes}분 · {r.source}
                  </span>
                </span>
                <ArrowOutIcon />
              </Link>
            ))}
          </section>
        ) : (
          <StateBlock
            who={lesson.who}
            face="think"
            tag="자료 없음"
            title="확인된 자료를 아직 못 찾았어요"
            body={NO_RESOURCE_BODY[lesson.who]}
            note={NO_RESOURCE_NOTE}
            size={72}
            compact
            testId="no-resources"
          />
        ))}
    </div>
  );
}
