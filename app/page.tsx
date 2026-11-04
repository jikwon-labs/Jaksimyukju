import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteGroup } from "@/lib/server/onboarding";
import { availableProviders } from "@/lib/server/oauth";
import { parseTeacher, TEACHER_COOKIE } from "@/lib/theme";
import { WidgetSync } from "@/components/WidgetSync";
import { Welcome } from "./welcome.client";

export const metadata = { title: "작심육주" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  const { login } = await searchParams;
  const user = await getSessionUser();
  let guestAtRisk = false;
  if (user) {
    const active = await prisma.course.count({ where: { userId: user.id, status: "active" } });
    if (active > 0) redirect("/home");
    // 연결 안 한 게스트가 기록을 가진 채 다른 계정으로 들어가면 그 기록은 다시 열 수 없다
    guestAtRisk = !user.linkedAt && (await prisma.course.count({ where: { userId: user.id } })) > 0;
  }
  const teacher = user ? parseTeacher(user.teacher) : parseTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  const group = await inviteGroup();
  const invite = group ? { inviter: group.createdBy.name, group: group.name } : null;
  return (
    <>
      <Welcome teacher={teacher} invite={invite} providers={availableProviders()} loginResult={login ?? null} guestAtRisk={guestAtRisk} />
      {/* 로그아웃 뒤에는 홈 화면 위젯을 비운다 */}
      <WidgetSync />
    </>
  );
}
