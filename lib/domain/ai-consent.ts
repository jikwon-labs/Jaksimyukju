// 외부 AI(Anthropic)로 학습 내용을 보내는 데 대한 동의(App Store 5.1.2(i), 개인정보 보호법의 처리위탁·국외 이전 고지).
// 계정이 생기기 전(시작 흐름)에는 쿠키에, 계정이 있으면 users.aiConsentAt 에 남긴다.

export const AI_CONSENT_COOKIE = "j6_ai_consent";

/** 안내 내용이 크게 바뀌면 올린다. 쿠키 값이 다르면 다시 묻는다 */
export const AI_CONSENT_VERSION = "2026-11-04";

/** 동의 화면에서 돌아갈 앱 안 경로. 이상한 값이면 홈 */
export function consentNext(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000- \u007f]/.test(next)
  )
    return "/home";
  return next;
}

export function consentPath(next: string): string {
  return `/ai-consent?next=${encodeURIComponent(consentNext(next))}`;
}
