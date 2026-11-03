import "server-only";
// 푸시 발송. 운영은 Expo 푸시 서비스로, 개발·E2E는 mock으로 보낸다(lib/domain/push.ts의 pushSenderName).
// mock은 밖으로 아무것도 보내지 않고 보낸 것으로 기록만 한다(pushedAt). 기기 토큰은 앱 껍데기가 웹을 거쳐 넘겨준다.
import type { Notification, Prisma } from "@prisma/client";
import { devToolsEnabled } from "@/lib/clock";
import { isExpoPushToken, pushSenderName, sendExpo, type ExpoSendResult } from "@/lib/domain/push";
import { prisma } from "@/lib/prisma";

export interface PushMessage {
  title: string;
  body: string;
  href: string | null;
}

export interface PushSender {
  readonly name: string;
  /** token은 기기 토큰(mock은 없어도 된다) */
  send(token: string | null, msg: PushMessage): Promise<ExpoSendResult>;
}

export const mockPush: PushSender = {
  name: "mock",
  async send(_token, msg) {
    if (devToolsEnabled()) console.info(`[push:mock] ${msg.title} - ${msg.body}`);
    return { ok: true };
  },
};

export const expoPush: PushSender = {
  name: "expo",
  async send(token, msg) {
    // 앱에서 알림을 허락하지 않았거나 웹으로만 쓰는 사용자. 알림 목록에는 남는다
    if (!token) return { ok: false, dropToken: false, reason: "no token" };
    return sendExpo(fetch, token, msg, { accessToken: process.env.EXPO_ACCESS_TOKEN || undefined });
  },
};

export function getPushSender(): PushSender {
  return pushSenderName(process.env) === "expo" ? expoPush : mockPush;
}

type Db = Pick<Prisma.TransactionClient, "notification">;

/** 알림 한 건을 푸시로 보내고 pushedAt을 남긴다. 발송이 실패해도 알림 목록에는 남아 있으니 던지지 않는다 */
export async function pushNotification(n: Notification, db: Db = prisma): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({ where: { id: n.userId }, select: { pushToken: true } });
    const token = user?.pushToken ?? null;
    const r = await getPushSender().send(token, { title: n.title, body: n.body, href: n.href });
    if (r.ok) {
      await db.notification.update({ where: { id: n.id }, data: { pushedAt: new Date() } });
      return true;
    }
    // 앱을 지웠거나 기기에서 알림을 끈 토큰은 지운다. 그사이 새 토큰으로 바뀌었으면 그대로 둔다
    if (r.dropToken && token) await prisma.user.updateMany({ where: { id: n.userId, pushToken: token }, data: { pushToken: null } });
    if (r.reason !== "no token") console.warn("[push] 보내지 못함", r.reason);
    return false;
  } catch (e) {
    console.error("[push] 발송 실패", e);
    return false;
  }
}

/** 기기 토큰을 이 사용자에 붙인다. 같은 기기를 쓰던 다른 사용자에게서는 뗀다(로그아웃 없이 계정을 바꾼 경우) */
export async function savePushToken(userId: string, token: unknown): Promise<boolean> {
  if (!isExpoPushToken(token)) return false;
  await prisma.$transaction([
    prisma.user.updateMany({ where: { pushToken: token, id: { not: userId } }, data: { pushToken: null } }),
    prisma.user.update({ where: { id: userId }, data: { pushToken: token } }),
  ]);
  return true;
}

export async function clearPushToken(userId: string): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId }, data: { pushToken: null } });
}
