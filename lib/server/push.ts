import "server-only";
// 푸시 발송. 발송 서비스(Expo, FCM 등)를 아직 고르지 않아서 mock 발송기만 있다.
// mock은 밖으로 아무것도 보내지 않고 보낸 것으로 기록만 한다(pushedAt). 실제 발송기는 PushSender를 구현해 getPushSender에서 고른다.
import type { Notification, Prisma } from "@prisma/client";
import { devToolsEnabled } from "@/lib/clock";
import { prisma } from "@/lib/prisma";

export interface PushMessage {
  title: string;
  body: string;
  href: string | null;
}

export interface PushSender {
  readonly name: string;
  /** 보냈으면 true. token은 기기 토큰(mock은 없어도 된다) */
  send(token: string | null, msg: PushMessage): Promise<boolean>;
}

export const mockPush: PushSender = {
  name: "mock",
  async send(_token, msg) {
    if (devToolsEnabled()) console.info(`[push:mock] ${msg.title} - ${msg.body}`);
    return true;
  },
};

export function getPushSender(): PushSender {
  return mockPush;
}

type Db = Pick<Prisma.TransactionClient, "notification">;

/** 알림 한 건을 푸시로 보내고 pushedAt을 남긴다. 발송이 실패해도 알림 목록에는 남아 있으니 던지지 않는다 */
export async function pushNotification(n: Notification, db: Db = prisma): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: n.userId }, select: { pushToken: true } });
  try {
    const ok = await getPushSender().send(user?.pushToken ?? null, { title: n.title, body: n.body, href: n.href });
    if (ok) await db.notification.update({ where: { id: n.id }, data: { pushedAt: new Date() } });
    return ok;
  } catch (e) {
    console.error("[push] 발송 실패", e);
    return false;
  }
}
