"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { STEP_ICONS } from "@/components/course/ShortPath";
import { Teacher } from "@/components/teacher/Teacher";
import type { TeacherName } from "@/lib/design/types";
import type { Step, WeekView } from "@/lib/domain/course";
import {
  defaultOpenWeeks,
  isDone,
  listDays,
  nodeLabel,
  popoverInfo,
  roadIndexes,
  WEEK_STATE_WORD,
} from "@/lib/domain/curriculum";
import { MAP_W, mapLayout, popoverTop } from "@/lib/domain/map";
import s from "./curriculum.module.css";

export interface CurriculumWeek extends WeekView {
  meta: string;
  bannerMeta: string;
}

interface Props {
  who: TeacherName;
  goal: string;
  currentWeek: number;
  finished: boolean;
  weeks: CurriculumWeek[];
  progress: { topic: string; info: string; done: number; total: number; pct: number; left: number };
}

function nodeIcon(st: Step): keyof typeof STEP_ICONS {
  if (st.state === "lock") return "lock";
  if (st.kind === "goal") return "flag";
  if (isDone(st.state)) return "check";
  if (st.state === "today") return "star";
  return st.kind === "quiz" ? "quiz" : "book";
}

function Icon({ d, size, strokeWidth = 2.6 }: { d: string; size: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export function CurriculumView({ who, goal, currentWeek, finished, weeks, progress }: Props) {
  const [view, setView] = useState<"map" | "list">("map");
  const [openW, setOpenW] = useState(() => defaultOpenWeeks(weeks, currentWeek, finished));
  const [sel, setSel] = useState("");
  const [openN, setOpenN] = useState(finished ? 0 : currentWeek);

  // 칸 설명 카드는 Esc로 닫는다
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSel("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  return (
    <>
      <header className={s.header}>
        <h1 className={s.h1}>커리큘럼</h1>
        <div role="group" aria-label="보기 방식" className={s.toggle}>
          <button
            type="button"
            aria-pressed={view === "map"}
            onClick={() => setView("map")}
            data-testid="view-map"
          >
            지도
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            data-testid="view-list"
          >
            목록
          </button>
        </div>
      </header>

      <section aria-label="진행 중인 과정" className={s.progress}>
        <div className={s.progressRow}>
          <span className={s.topic}>{progress.topic}</span>
          <span className={s.sub12}>{progress.info}</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
          aria-label={`레슨 진행률 ${progress.done} / ${progress.total}`}
          className={s.bar}
        >
          <span style={{ width: `${progress.pct}%` }} />
        </div>
        <div className={s.progressFoot}>
          <span className={s.sub}>
            레슨 {progress.done} / {progress.total} · 목적지까지 {progress.left}칸
          </span>
          <span className={s.pct}>{progress.pct}%</span>
        </div>
      </section>

      {view === "map" ? (
        <section aria-label="학습 지도" className={s.map}>
          {weeks.map((w) => {
            const open = !w.far && !!openW[w.n];
            return (
              <Fragment key={w.n}>
                <button
                  type="button"
                  className={s.banner}
                  data-status={w.status}
                  aria-expanded={open}
                  aria-disabled={w.far || undefined}
                  onClick={() => {
                    if (w.far) return;
                    setOpenW((o) => ({ ...o, [w.n]: !open }));
                  }}
                  data-testid={`week-banner-${w.n}`}
                >
                  <span className={s.bannerText}>
                    <span className={s.bannerKicker}>
                      {w.n}주차 · {WEEK_STATE_WORD[w.status]}
                    </span>
                    <span className={s.bannerTitle}>{w.title}</span>
                  </span>
                  <span className={s.bannerMeta}>{w.bannerMeta}</span>
                </button>
                {open && (
                  <WeekMap
                    who={who}
                    week={w}
                    sel={sel}
                    onPick={(id) => setSel((cur) => (cur === id ? "" : id))}
                  />
                )}
              </Fragment>
            );
          })}
          <Link
            href="/finish"
            aria-label="목적지: 과정을 마치면 도착해요"
            className={s.flag}
            data-testid="finish-flag"
          >
            <span className={s.flagCircle} data-finished={finished ? "true" : "false"}>
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 21V4" />
                <path d="M5 4h11l-2 4 2 4H5" />
              </svg>
            </span>
            <span className={s.flagTitle}>목적지</span>
            <span className={s.flagGoal}>{goal}</span>
          </Link>
        </section>
      ) : (
        <section aria-label="주차 목록" className={s.list}>
          {weeks.map((w) => {
            const open = openN === w.n;
            const days = listDays(w, currentWeek);
            return (
              <div key={w.n} className={s.listCard} data-status={w.status}>
                <button
                  type="button"
                  className={s.listHead}
                  aria-expanded={open}
                  onClick={() => setOpenN(open ? 0 : w.n)}
                >
                  <span className={s.badge} data-status={w.status}>
                    {w.n}주
                  </span>
                  <span className={s.listText}>
                    <span className={s.listTitle}>{w.title}</span>
                    <span className={s.sub12}>{w.meta}</span>
                  </span>
                  <svg
                    className={s.chev}
                    data-open={open ? "true" : "false"}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {open && (
                  <div className={s.listBody}>
                    {days.length === 0 ? (
                      <p className={s.lockedNote}>
                        이전 주차를 마치면 레슨이 열려요. 진도에 맞춰 선생님이 내용을 다듬어요.
                      </p>
                    ) : (
                      days.map((d) => (
                        <div key={d.id} className={s.dayRow} data-state={d.state}>
                          <span className={s.dayLetter}>{d.day}</span>
                          <span className={s.dayCircle} aria-hidden>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d={STEP_ICONS.check} />
                            </svg>
                          </span>
                          <span className={s.dayTitle}>{d.title}</span>
                          {d.tag && (
                            <span className={s.tag} data-tag={d.tag}>
                              {d.tag}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

function WeekMap({
  who,
  week,
  sel,
  onPick,
}: {
  who: TeacherName;
  week: CurriculumWeek;
  sel: string;
  onPick: (id: string) => void;
}) {
  const { lastDone, todayIdx } = roadIndexes(week.steps);
  const layout = mapLayout(
    week.steps.map((x) => x.kind),
    lastDone,
    todayIdx,
  );
  const selIdx = week.steps.findIndex((x) => x.id === sel);
  const selStep = selIdx >= 0 ? week.steps[selIdx] : null;
  const pop = selStep ? popoverInfo(selStep) : null;
  const [setFitEl, zoom] = useMapScale();
  return (
    <div ref={setFitEl} className={s.fit}>
      <div
        className={s.canvas}
        style={{ height: layout.height, zoom }}
        data-status={week.status}
      >
        <svg
          width={MAP_W}
          height={layout.height}
          viewBox={`0 0 ${MAP_W} ${layout.height}`}
          className={s.road}
          aria-hidden
        >
          <path d={layout.todoPath} className={s.roadTodo} />
          <path d={layout.donePath} className={s.roadDone} />
        </svg>
        {week.steps.map((st, i) => {
          const n = layout.nodes[i];
          const goal = st.kind === "goal";
          const today = st.state === "today";
          const selected = sel === st.id;
          return (
            <div
              key={st.id}
              className={s.nodeBox}
              style={{ left: n.left, top: n.top, width: n.size, height: n.size }}
            >
              {today && <span className={`${s.pulse} mp-pulse`} aria-hidden />}
              <button
                type="button"
                className={s.node}
                data-state={st.state}
                data-kind={st.kind}
                aria-label={nodeLabel(st)}
                aria-expanded={selected}
                onClick={() => onPick(st.id)}
                data-testid={`map-node-${st.week}-${st.i}`}
              >
                <Icon d={STEP_ICONS[nodeIcon(st)]} size={goal ? 34 : 28} />
              </button>
              {today && !selected && (
                <span className={s.bob} aria-hidden>
                  시작
                </span>
              )}
            </div>
          );
        })}
        {layout.char && (
          <div className={s.char} style={{ left: layout.char.left, top: layout.char.top }}>
            <Teacher who={who} size={72} jump label={`${who} 선생님이 오늘 칸 옆에서 기다려요`} />
          </div>
        )}
        {pop && selStep && (
          <div
            role="dialog"
            aria-label={`${pop.kicker} ${pop.title}`}
            className={s.popover}
            data-hot={pop.hot ? "true" : "false"}
            style={{ top: popoverTop(layout.nodes[selIdx]) }}
            data-testid="popover"
          >
            <span className={s.popKicker}>{pop.kicker}</span>
            <span className={s.popTitle}>{pop.title}</span>
            <span className={s.popMeta}>{pop.meta}</span>
            {pop.cta && (
              <Link href={pop.href} className={s.popCta} data-testid="popover-cta">
                {pop.cta}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 좁은 화면(390보다 작게)에서는 지도(350px 기준 좌표)를 폭에 맞춰 줄인다. 가로 스크롤을 막는다 */
function useMapScale() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [value, setValue] = useState(1);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(() => setValue(Math.min(1, el.clientWidth / MAP_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, value] as const;
}
