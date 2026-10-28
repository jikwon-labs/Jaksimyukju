"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { LessonContent } from "@/components/lesson/LessonContent";
import { OfflineBar, StateBlock } from "@/components/lesson/StateBlock";
import { lastLessonSnapshot, useOnline } from "@/components/lesson/offline";
import { OFFLINE_BODY, OFFLINE_NOTE } from "@/components/lesson/copy";
import { DEFAULT_TEACHER } from "@/lib/design/tokens";
import s from "@/components/lesson/lesson.module.css";
import p from "@/components/lesson/parts.module.css";

const noop = () => () => {};

/** 받아 둔 마지막 레슨을 연결 없이 읽는다 */
export default function OfflineLessonPage() {
  const saved = useSyncExternalStore(noop, lastLessonSnapshot, () => null);
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const online = useOnline();
  const [short, setShort] = useState(false);

  if (!mounted) return <main className={s.screen} />;

  if (!saved) {
    return (
      <main className={s.screen}>
        <OfflineBar />
        <StateBlock
          who={DEFAULT_TEACHER}
          face="listen"
          tag="연결 끊김"
          title="받아 둔 레슨이 아직 없어요"
          body="연결된 상태에서 레슨을 한 번 열면, 다음부터는 끊겨도 읽을 수 있어요."
          actions={
            <Link href="/home" className={p.secondary}>
              홈으로
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className={s.screen}>
      {!online && <OfflineBar />}
      <div className={s.grow}>
        <section className={s.content} style={{ paddingBottom: 0 }} aria-label="오프라인 안내">
          <div className={p.stateNote}>
            <strong>{OFFLINE_BODY[saved.who] ?? OFFLINE_BODY[DEFAULT_TEACHER]}</strong>
            <br />
            {OFFLINE_NOTE}
          </div>
        </section>
        <LessonContent lesson={saved} short={short} onMode={setShort} />
      </div>
      <div className={s.ctaBar}>
        {online ? (
          <Link href={`/lesson/${saved.id}`} className={s.cta} data-testid="lesson-cta">
            연결됐어요 · 레슨으로 가기
          </Link>
        ) : (
          <span className={s.cta} aria-disabled="true" data-testid="lesson-cta">
            {saved.who} 선생님과 확인하기
          </span>
        )}
      </div>
    </main>
  );
}
