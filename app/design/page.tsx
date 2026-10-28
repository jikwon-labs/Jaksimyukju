import { cookies } from "next/headers";
import { Teacher } from "@/components/teacher/Teacher";
import { ThemeControl } from "@/components/ThemeControl";
import { ButtonLink, Card, Chip, Pill } from "@/components/ui";
import ui from "@/components/ui/ui.module.css";
import { TEACHER_NAMES } from "@/lib/design/tokens";
import type { FaceState } from "@/lib/design/types";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

const STATES: FaceState[] = ["base", "listen", "think", "joy", "sad"];

export const metadata = { title: "디자인 기준판 · 작심육주" };

export default async function DesignPage() {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <main className={ui.page}>
      <h1 className={ui.title} style={{ fontSize: 28 }}>
        디자인 기준판
      </h1>
      <ThemeControl initial={theme} />
      {TEACHER_NAMES.map((who) => (
        <Card key={who} aria-label={`${who} 표정`}>
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>{who} 선생님</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            {STATES.map((st) => (
              <Teacher key={st} who={who} state={st} size={56} label={`${who} ${st}`} />
            ))}
            <Teacher who={who} size={32} label={`${who} 작은 크기`} />
          </div>
        </Card>
      ))}
      <Card aria-label="컴포넌트">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Pill>오늘 할 일</Pill>
          <div style={{ display: "flex", gap: 8 }}>
            <Chip on>선택됨</Chip>
            <Chip>기본</Chip>
          </div>
          <ButtonLink href="/design" block>
            학습 시작
          </ButtonLink>
          <ButtonLink href="/design" variant="secondary" block>
            5분 버전
          </ButtonLink>
        </div>
      </Card>
    </main>
  );
}
