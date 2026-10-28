import Link from "next/link";
import { cookies } from "next/headers";
import { StateView, STATE_COPY, type StateKind } from "@/components/states/StateView";
import { getSessionUser } from "@/lib/auth";
import { parseTeacher, TEACHER_COOKIE } from "@/lib/theme";
import { teacherOf } from "@/lib/server/course";
import s from "./states.module.css";

export const metadata = { title: "빈 상태와 오류 · 작심육주" };

const KINDS: { kind: StateKind; label: string }[] = [
  { kind: "ai", label: "AI 실패" },
  { kind: "empty-resource", label: "자료 없음" },
  { kind: "offline", label: "오프라인" },
  { kind: "empty-group", label: "빈 그룹" },
];

function isKind(v: string | undefined): v is StateKind {
  return !!v && v in STATE_COPY;
}

/** 빈 상태·오류 모음. 실제 화면에서는 StateView를 그 자리에 끼워 쓴다 */
export default async function StatesPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind: raw } = await searchParams;
  const kind: StateKind = isKind(raw) ? raw : "ai";
  const user = await getSessionUser();
  const who = user ? teacherOf(user) : parseTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  return (
    <div className={s.wrap}>
      <StateView kind={kind} who={who} />
      <nav aria-label="상태 고르기" className={s.switcher}>
        {KINDS.map((k) => (
          <Link
            key={k.kind}
            href={`/states?kind=${k.kind}`}
            className={s.tab}
            aria-current={k.kind === kind ? "page" : undefined}
            data-testid={`states-${k.kind}`}
          >
            {k.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
