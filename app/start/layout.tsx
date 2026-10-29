import { cookies } from "next/headers";
import { parseTeacher, TEACHER_COOKIE } from "@/lib/theme";
import { TeacherSync } from "./TeacherSync";

export default async function StartLayout({ children }: { children: React.ReactNode }) {
  const fallback = parseTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  return <TeacherSync fallback={fallback}>{children}</TeacherSync>;
}
