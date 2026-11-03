// 소셜 로그인의 이름·안내 문구. 브라우저 컴포넌트가 가져다 쓴다.
// oauth.ts는 zod와 node:crypto를 불러오므로, 클라이언트에서는 이 파일만 import 해야 번들에 그것들이 딸려 가지 않는다.

export const PROVIDER_IDS = ["kakao", "google", "apple"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_LABEL: Record<ProviderId, string> = { kakao: "카카오", google: "Google", apple: "Apple" };

/** 안내 문구 표에서 찾는다. ?link=constructor 같은 값이 Object.prototype을 꺼내지 않게 */
export function messageFor(table: Record<string, string>, key: string | null | undefined): string | undefined {
  return key && Object.hasOwn(table, key) ? table[key] : undefined;
}

/** 계정 연결 결과(?link=) 안내 문구. linked·already는 성공 */
export const LINK_ERROR_MESSAGE: Record<string, string> = {
  taken: "이 계정은 이미 다른 기록에 연결돼 있어요. 다른 계정을 골라 주세요.",
  other: "이미 같은 곳의 다른 계정이 연결돼 있어요.",
  cancel: "연결을 취소했어요. 언제든 다시 할 수 있어요.",
  failed: "연결하지 못했어요. 잠시 뒤 다시 해 주세요.",
};

export function linkSucceeded(result: string | null | undefined): boolean {
  return result === "linked" || result === "already";
}

/** 게스트 기록을 잃는다는 경고. 연결 전에 로그아웃하거나 다른 계정으로 들어갈 때 */
export const GUEST_LOSS_WARNING = "계정을 연결하지 않은 기록은 로그아웃하면 다시 열 수 없어요.";
