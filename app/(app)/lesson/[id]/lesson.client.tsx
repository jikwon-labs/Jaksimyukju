"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { completeLessonAction } from "@/app/actions/lesson";
import { LessonContent, type LessonPayload } from "@/components/lesson/LessonContent";
import { OfflineBar } from "@/components/lesson/StateBlock";
import { saveLesson, useOnline } from "@/components/lesson/offline";
import { OFFLINE_NOTE } from "@/components/lesson/copy";
import s from "@/components/lesson/lesson.module.css";
import { ReportButton } from "@/components/lesson/ReportButton";

function FinishShort({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.cta} disabled={disabled || pending} data-testid="finish-short">
      {pending ? "잔디 채우는 중" : "5분 버전으로 마치기"}
    </button>
  );
}

export function LessonView({ lesson, initialShort }: { lesson: LessonPayload; initialShort: boolean }) {
  const [short, setShort] = useState(initialShort);
  const online = useOnline();

  // 열 때마다 받아 둔다. 오프라인이 되어도 이 화면은 그대로 읽을 수 있다
  useEffect(() => {
    saveLesson(lesson);
  }, [lesson]);

  function onMode(next: boolean) {
    setShort(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("mode", "short");
    else url.searchParams.delete("mode");
    window.history.replaceState(window.history.state, "", url);
  }

  const completed = lesson.status !== "todo";

  return (
    <main className={s.screen}>
      {!online && <OfflineBar />}
      {(lesson.status === "summary" || lesson.status === "merged") && (
        <p className={s.closedNote} role="note" data-testid="lesson-closed">
          {lesson.status === "summary"
            ? "3분 요약 카드예요. 복귀하며 요약으로 넘긴 레슨이라 핵심만 담았어요. 전체가 궁금하면 전체 버전을 눌러 보세요."
            : "이 레슨은 복귀하며 다음 레슨에 5분씩 합쳐졌어요. 여기서는 다시 읽기만 할 수 있어요."}
        </p>
      )}
      <div className={s.grow}>
        <LessonContent lesson={lesson} short={short} onMode={onMode} />
        {online && <ReportButton lessonId={lesson.id} label="설명이 이상해요" />}
      </div>
      <div className={s.ctaBar}>
        {!online && <p className={s.ctaNote}>{OFFLINE_NOTE}</p>}
        {lesson.status === "merged" || lesson.status === "summary" ? (
          <Link href="/home" className={s.cta} data-testid="lesson-cta">
            홈으로
          </Link>
        ) : short ? (
          completed && lesson.status !== "short" ? (
            <Link href="/home" className={s.cta} data-testid="lesson-cta">
              홈으로
            </Link>
          ) : (
            <form action={completeLessonAction.bind(null, lesson.id, "short")}>
              <FinishShort disabled={!online} />
            </form>
          )
        ) : online ? (
          <Link href={`/lesson/${lesson.id}/tutor`} className={s.cta} data-testid="lesson-cta">
            {lesson.who} 선생님과 확인하기
          </Link>
        ) : (
          <span className={s.cta} aria-disabled="true" data-testid="lesson-cta">
            {lesson.who} 선생님과 확인하기
          </span>
        )}
      </div>
    </main>
  );
}
