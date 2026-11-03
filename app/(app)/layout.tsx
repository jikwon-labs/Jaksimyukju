import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PushRegistrar } from "@/components/PushRegistrar";

/** 로그인한 화면들. 앱 껍데기 안이면 푸시 토큰을 등록한다 */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  // 알림 권한은 레슨을 하나라도 마친 뒤에 묻는다(처음 켜자마자 물으면 거절이 많다)
  const ask = user ? (await prisma.lesson.count({ where: { course: { userId: user.id }, status: { not: "todo" } } })) > 0 : false;
  return (
    <>
      {children}
      {user && <PushRegistrar ask={ask} />}
    </>
  );
}
