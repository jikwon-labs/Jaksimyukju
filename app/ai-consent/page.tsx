import Link from "next/link";
import { agreeAiAction, withdrawAiAction } from "@/app/actions/ai-consent";
import { getSessionUser } from "@/lib/auth";
import { consentNext } from "@/lib/domain/ai-consent";
import { hasAiConsent } from "@/lib/server/ai-consent";
import { PROCESSORS } from "@/lib/legal";
import s from "./consent.module.css";

export const metadata = { title: "AI 선생님과 데이터 · 작심육주" };

const AI = PROCESSORS[0];

/**
 * 외부 AI로 학습 내용을 보내기 전의 안내와 동의(App Store 5.1.2(i)).
 * 시작 흐름의 커리큘럼 만들기, 튜터, 마일스톤, 회고 화면이 동의 전이면 여기로 보낸다. 설정에서 열면 동의 상태와 철회를 보여 준다
 */
export default async function AiConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; from?: string; withdrawn?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const agreed = await hasAiConsent(user);
  const fromSettings = sp.from === "settings";
  const next = consentNext(sp.next ?? (fromSettings ? "/settings" : "/home"));
  const since = user?.aiConsentAt
    ? user.aiConsentAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
    : null;

  return (
    <main className={s.page}>
      <header className={s.head}>
        {fromSettings && (
          <Link href="/settings" className={s.back} aria-label="설정으로 돌아가기">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
        )}
        <h1 className={s.title}>AI 선생님과 데이터</h1>
        <p className={s.lead}>
          작심육주의 선생님(온·결·새)은 외부 AI 서비스로 답을 만들어요. 그래서 공부하면서 적은 내용
          일부를 그 서비스에 보내요. 보내기 전에 무엇을 어디로 보내는지 알려 드리고 동의를 받아요.
        </p>
      </header>

      <dl className={s.card} data-testid="ai-consent-facts">
        <div className={s.row}>
          <dt>받는 곳</dt>
          <dd>
            {AI.name}({AI.country}) · Claude API
          </dd>
        </div>
        <div className={s.row}>
          <dt>보내는 정보</dt>
          <dd>{AI.items}</dd>
        </div>
        <div className={s.row}>
          <dt>보내지 않는 정보</dt>
          <dd>이름·별명, 이메일, 카카오·Google·Apple 계정 정보, 푸시 알림 토큰</dd>
        </div>
        <div className={s.row}>
          <dt>쓰는 곳</dt>
          <dd>{AI.task}</dd>
        </div>
        <div className={s.row}>
          <dt>보내는 때와 방법</dt>
          <dd>
            {AI.timing}, {AI.method}
          </dd>
        </div>
        <div className={s.row}>
          <dt>보관</dt>
          <dd>{AI.retention}</dd>
        </div>
      </dl>

      <ul className={s.notes}>
        <li>주민등록번호, 연락처, 건강 정보처럼 민감한 내용은 튜터나 회고에 적지 말아 주세요.</li>
        <li>
          AI가 만든 설명은 틀릴 수 있어요. 이상하면 레슨의 &lsquo;이상해요&rsquo;로 알려 주세요.
        </li>
        <li>
          동의하지 않으면 커리큘럼 만들기, 튜터, 마일스톤 피드백, 주간 회고 카드를 쓸 수 없어요.
          동의는 설정 &gt; 약관과 정책에서 언제든 철회할 수 있어요.
        </li>
      </ul>
      <p className={s.more}>
        자세한 내용은{" "}
        <Link href="/privacy" className={s.link}>
          개인정보 처리방침
        </Link>
        에 있어요.
      </p>

      {sp.withdrawn === "1" && (
        <p role="status" className={s.status} data-testid="ai-consent-withdrawn">
          동의를 철회했어요. AI 기능을 쓰려면 다시 동의해 주세요.
        </p>
      )}

      {agreed ? (
        <div className={s.actions}>
          <p className={s.status} data-testid="ai-consent-status">
            {since ? `${since}에 동의했어요.` : "이 기기에서 동의했어요."}
          </p>
          {fromSettings ? (
            <form action={withdrawAiAction}>
              <button type="submit" className={s.secondary} data-testid="ai-consent-withdraw">
                동의 철회하기
              </button>
            </form>
          ) : (
            <Link href={next} className={s.primary}>
              계속하기
            </Link>
          )}
        </div>
      ) : (
        <form action={agreeAiAction} className={s.actions}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className={s.primary} data-testid="ai-consent-agree">
            동의하고 계속하기
          </button>
          <Link
            href={fromSettings ? "/settings" : user ? "/home" : "/"}
            className={s.secondary}
            data-testid="ai-consent-decline"
          >
            동의하지 않기
          </Link>
        </form>
      )}
    </main>
  );
}
