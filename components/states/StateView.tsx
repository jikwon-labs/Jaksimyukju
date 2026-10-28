import Link from "next/link";
import { Teacher } from "@/components/teacher/Teacher";
import type { FaceState, TeacherName } from "@/lib/design/types";
import s from "./StateView.module.css";

export type StateKind = "ai" | "empty-resource" | "offline" | "empty-group";

interface StateCopy {
  face: FaceState;
  tag: string;
  title: string;
  body: Record<TeacherName, string>;
  note: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
}

// 목업 States.dc.html 문구 그대로
export const STATE_COPY: Record<StateKind, StateCopy> = {
  ai: {
    face: "sad",
    tag: "튜터 응답 실패",
    title: "선생님이 잠깐 말을 놓쳤어요",
    body: {
      온: "미안해요, 답을 만들다 끊겼어요. 질문은 그대로 저장해 뒀어요.",
      결: "응답이 끊겼습니다. 질문은 저장했습니다. 다시 시도하세요.",
      새: "어, 생각하다 길을 잃었어요. 질문은 잘 챙겨 뒀어요!",
    },
    note: '저장된 질문: "감가상각이 왜 현금을 안 쓰는 거예요?"',
    primary: { href: "/home", label: "다시 물어보기" },
    secondary: { href: "/home", label: "레슨 먼저 다시 읽기" },
  },
  "empty-resource": {
    face: "think",
    tag: "자료 없음",
    title: "확인된 자료를 아직 못 찾았어요",
    body: {
      온: "링크가 열리고 내용이 맞는 자료만 보여 드리려고 해요. 오늘은 제 설명만으로도 충분해요.",
      결: "검증 안 된 링크는 보여 주지 않습니다. 오늘은 레슨 본문으로 진행합니다.",
      새: "쓸 만한 자료가 안 보여요. 대신 제가 예시를 하나 더 만들어 볼게요.",
    },
    note: "내일 아침에 다시 찾아보고, 찾으면 알림으로 알려 드려요.",
    primary: { href: "/home", label: "레슨 계속하기" },
    secondary: { href: "/home", label: "다시 찾아보기" },
  },
  offline: {
    face: "listen",
    tag: "연결 끊김",
    title: "인터넷이 끊겼어요",
    body: {
      온: "괜찮아요. 오늘 레슨은 미리 받아 둬서 지금 바로 읽을 수 있어요.",
      결: "오늘 레슨은 저장돼 있습니다. 읽기는 지금 가능합니다.",
      새: "지하철인가요? 오늘 레슨은 가방에 넣어 뒀어요.",
    },
    note: "튜터 질문과 퀴즈는 연결되면 열려요. 오늘 칸은 연결되는 순간 채워져요.",
    primary: { href: "/home", label: "저장된 레슨 읽기" },
    secondary: { href: "/home", label: "홈으로" },
  },
  "empty-group": {
    face: "base",
    tag: "그룹 비어 있음",
    title: "아직 함께하는 사람이 없어요",
    body: {
      온: "혼자서도 잘하고 있지만, 한 명만 있어도 훨씬 덜 지쳐요.",
      결: "혼자 하면 포기율이 높습니다. 한 명만 데려오세요.",
      새: "같이 탐험할 동료를 데려와 볼까요? 서로 잔디 구경하는 재미가 있어요.",
    },
    note: "",
    primary: { href: "/group/invite", label: "초대 링크 만들기" },
    secondary: { href: "/home", label: "나중에 할게요" },
  },
};

interface LinkAction {
  href: string;
  label: string;
}

/**
 * 빈 상태·오류 화면. 화면 안에 끼워 넣거나(inline) 한 화면 전체로 쓴다.
 * action/secondary를 주면 목업 기본 링크 대신 쓴다. secondary에 null을 주면 숨긴다.
 */
export function StateView({
  kind,
  who,
  action,
  secondary,
  note,
  inline = false,
}: {
  kind: StateKind;
  who: TeacherName;
  action?: LinkAction;
  secondary?: LinkAction | null;
  note?: string;
  inline?: boolean;
}) {
  const c = STATE_COPY[kind];
  const primary = action ?? c.primary;
  const second = secondary === null ? null : (secondary ?? c.secondary);
  const shownNote = note ?? c.note;
  return (
    <section
      className={inline ? `${s.wrap} ${s.inline}` : s.wrap}
      data-kind={kind}
      data-testid={`state-${kind}`}
      aria-label={c.tag}
    >
      {kind === "offline" && (
        <div role="status" className={s.bar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 8.8a15 15 0 0 1 4.2-2.6" />
            <path d="M22 8.8A15 15 0 0 0 12 5c-.7 0-1.4 0-2 .1" />
            <path d="M5.5 12.4a10 10 0 0 1 3-1.8" />
            <path d="M18.5 12.4a10 10 0 0 0-2.4-1.5" />
            <path d="M9 15.9a5 5 0 0 1 6 0" />
            <path d="M12 20h.01" />
            <path d="M3 3l18 18" />
          </svg>
          오프라인 · 연결되면 자동으로 올라가요
        </div>
      )}
      <div className={s.center}>
        <Teacher who={who} state={c.face} size={120} jump label={`${who} 선생님, ${c.tag}`} />
        <span className={s.tag} data-accent={kind === "empty-group" ? "true" : "false"}>
          {c.tag}
        </span>
        <h1 className={s.title}>{c.title}</h1>
        <p className={s.body}>{c.body[who]}</p>
        {shownNote && <p className={s.note}>{shownNote}</p>}
      </div>
      <Link href={primary.href} className={s.primary}>
        {primary.label}
      </Link>
      {second && (
        <Link href={second.href} className={s.secondary}>
          {second.label}
        </Link>
      )}
    </section>
  );
}
