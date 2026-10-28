import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BackHeader, Page } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getToday } from "@/lib/clock";
import { parseStudyDays } from "@/lib/domain/dates";
import { durationLabel } from "@/lib/domain/prefs";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { loadState, teacherOf } from "@/lib/server/course";
import { SettingsForm } from "./SettingsForm.client";
import s from "./settings.module.css";

export const metadata = { title: "설정 · 작심육주" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const st = await loadState(user, await getToday());
  if (!st) redirect("/start/personality");
  const studyDays = parseStudyDays(user.studyDays);
  return (
    <Page className={s.page}>
      <BackHeader href="/profile" title="설정" />
      <SettingsForm
        initial={{
          studyDays,
          minutesPerDay: user.minutesPerDay,
          notifyTime: user.notifyTime,
          notifyNudge: user.notifyNudge,
          notifyTeacher: user.notifyTeacher,
          notifyRetro: user.notifyRetro,
          notifyGroup: user.notifyGroup,
          // 화면에 실제로 적용된 값은 쿠키다
          theme: parseTheme((await cookies()).get(THEME_COOKIE)?.value ?? user.theme),
        }}
        teacher={teacherOf(user)}
        restLeft={st.restLeft}
        duration={durationLabel(st.course.weeksCount, st.course.extraDays, studyDays.length)}
      />
    </Page>
  );
}
