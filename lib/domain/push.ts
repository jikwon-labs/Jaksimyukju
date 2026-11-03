// Expo 푸시 서비스와 주고받는 모양. 서버 발송기(lib/server/push.ts)와 기기 토큰 저장이 같이 쓴다.
// 형식: https://docs.expo.dev/push-notifications/sending-notifications/

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** 앱 껍데기(mobile/App.tsx)가 만드는 안드로이드 알림 채널 */
export const PUSH_CHANNEL = "default";

/** ExponentPushToken[...] 또는 ExpoPushToken[...] 모양이면 true */
export function isExpoPushToken(token: unknown): token is string {
  return typeof token === "string" && token.length <= 200 && /^Expo(nent)?PushToken\[[^\]\s]+\]$/.test(token);
}

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: { href: string | null };
  sound: "default";
  channelId: string;
  priority: "high";
}

export function expoMessage(to: string, msg: { title: string; body: string; href: string | null }): ExpoMessage {
  return {
    to,
    title: msg.title,
    body: msg.body,
    data: { href: msg.href },
    sound: "default",
    channelId: PUSH_CHANNEL,
    priority: "high",
  };
}

export type ExpoSendResult =
  | { ok: true }
  /** 다시 보내도 안 될 토큰(앱 삭제, 알림 끔 등). 지워야 한다 */
  | { ok: false; dropToken: true; reason: string }
  | { ok: false; dropToken: false; reason: string };

/** 메시지 하나를 보낸 응답(HTTP 상태, 본문 JSON)을 결과로 바꾼다 */
export function readExpoResponse(status: number, body: unknown): ExpoSendResult {
  if (status < 200 || status >= 300) return { ok: false, dropToken: false, reason: `http ${status}` };
  const data = (body as { data?: unknown } | null)?.data;
  // 한 건을 보내면 data는 티켓 하나(객체)로, 여러 건이면 배열로 온다
  const ticket = (Array.isArray(data) ? data[0] : data) as
    | { status?: unknown; message?: unknown; details?: { error?: unknown } }
    | undefined;
  if (ticket?.status === "ok") return { ok: true };
  const error = typeof ticket?.details?.error === "string" ? ticket.details.error : "";
  const reason = error || (typeof ticket?.message === "string" ? ticket.message : "bad response");
  return { ok: false, dropToken: error === "DeviceNotRegistered", reason };
}

type Fetch = (url: string, init: RequestInit) => Promise<{ status: number; json(): Promise<unknown> }>;

/** Expo 푸시 서비스로 한 건 보낸다. 네트워크 오류·시간 초과도 결과로 돌려준다(던지지 않는다) */
export async function sendExpo(
  fetchFn: Fetch,
  to: string,
  msg: { title: string; body: string; href: string | null },
  opts: { accessToken?: string; timeoutMs?: number } = {},
): Promise<ExpoSendResult> {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  // Expo 대시보드에서 "향상된 보안"을 켜면 이 토큰이 있어야 보낼 수 있다
  if (opts.accessToken) headers.authorization = `Bearer ${opts.accessToken}`;
  try {
    const res = await fetchFn(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(expoMessage(to, msg)),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    });
    const body = await res.json().catch(() => null);
    return readExpoResponse(res.status, body);
  } catch (e) {
    return { ok: false, dropToken: false, reason: e instanceof Error ? e.message : "network" };
  }
}

/** 어떤 발송기를 쓸지. PUSH_SENDER가 있으면 그대로, 없으면 운영은 expo, 개발·E2E는 mock */
export function pushSenderName(env: { PUSH_SENDER?: string; NODE_ENV?: string }): "expo" | "mock" {
  if (env.PUSH_SENDER === "expo" || env.PUSH_SENDER === "mock") return env.PUSH_SENDER;
  return env.NODE_ENV === "production" ? "expo" : "mock";
}
