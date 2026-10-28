import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteGroup } from "@/lib/server/onboarding";
import { parseTeacher, TEACHER_COOKIE } from "@/lib/theme";
import { Welcome } from "./welcome.client";

export const metadata = { title: "작심육주" };

export default async function WelcomePage() {
  const user = await getSessionUser();
  if (user) {
    const active = await prisma.course.count({ where: { userId: user.id, status: "active" } });
    if (active > 0) redirect("/home");
  }
  const teacher = user ? parseTeacher(user.teacher) : parseTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  const group = await inviteGroup();
  const invite = group ? { inviter: group.createdBy.name, group: group.name } : null;
  return <Welcome teacher={teacher} invite={invite} />;
}
