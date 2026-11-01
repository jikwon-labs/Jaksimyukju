"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { wrapUpAction } from "@/app/actions/lesson";
import { Switch } from "@/components/ui";
import { SocialButton } from "@/components/ui/SocialButton";
import { ONE_LINER_MAX, RATING_MAX, REVIEW_MAX } from "@/lib/domain/lesson";
import { LINK_ERROR_MESSAGE, linkSucceeded, messageFor, PROVIDER_LABEL, type ProviderId } from "@/lib/domain/oauth";
import s from "./complete.module.css";

const FORM = "wrapup";

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className={s.buttons}>
      <button type="submit" name="to" value="curriculum" className={s.next} disabled={pending}>
        다음 칸 보기
      </button>
      <button type="submit" name="to" value="home" className={s.home} disabled={pending} data-testid="complete-home">
        홈으로
      </button>
    </div>
  );
}

const RATING_WORD = ["", "별로였어요", "아쉬웠어요", "괜찮았어요", "좋았어요", "최고였어요"];

/** 오늘 수업 평점(별 1~5)과 후기. 아래 "홈으로"·"다음 칸 보기"를 누를 때 한 줄 요약과 함께 저장된다 */
function Review({ rating, review }: { rating: number | null; review: string }) {
  const [stars, setStars] = useState(rating ?? 0);
  const [text, setText] = useState(review);
  return (
    <section aria-label="오늘 수업 후기" className={s.review}>
      <div className={s.reviewHead}>
        <span className={s.oneLabel} id="rating-label">
          오늘 수업은 어땠어요?
        </span>
        <span className={s.reviewWord} aria-live="polite">
          {RATING_WORD[stars]}
        </span>
      </div>
      <div role="radiogroup" aria-label="오늘 수업 평점" className={s.stars}>
        {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((n) => (
          <label key={n} className={s.star} data-on={n <= stars ? "true" : "false"}>
            <input
              type="radio"
              name="rating"
              value={n}
              form={FORM}
              checked={stars === n}
              onChange={() => setStars(n)}
              aria-label={`${n}점`}
              className={s.starInput}
            />
            <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z" strokeLinejoin="round" />
            </svg>
          </label>
        ))}
      </div>
      <label htmlFor="lesson-review" className={s.srOnly}>
        수업 후기
      </label>
      <textarea
        id="lesson-review"
        name="review"
        form={FORM}
        rows={3}
        maxLength={REVIEW_MAX}
        placeholder="좋았던 점, 아쉬웠던 점을 적어 주세요(선택)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={s.oneInput}
        data-testid="lesson-review"
      />
    </section>
  );
}

function LinkCard({ lessonId, providers, result }: { lessonId: string; providers: ProviderId[]; result: string | null }) {
  const error = messageFor(LINK_ERROR_MESSAGE, result);
  const next = encodeURIComponent(`/lesson/${lessonId}/complete`);
  return (
    <section aria-label="계정 연결" className={s.linkCard} data-testid="link-account">
      <h2>오늘 채운 잔디를 지키려면</h2>
      <p>계정을 연결하면 휴대폰을 바꾸거나 앱을 지워도 기록과 그룹이 남아요. 10초면 끝나요.</p>
      {providers.length > 0 ? (
        <div className={s.linkBtns}>
          {providers.map((p) => (
            <SocialButton key={p} provider={p} href={`/api/auth/${p}/start?mode=link&next=${next}`} className={s.provider} testId={`link-${p}`}>
              {PROVIDER_LABEL[p]}로 연결
            </SocialButton>
          ))}
        </div>
      ) : (
        <p className={s.foot}>계정 연결은 곧 열려요.</p>
      )}
      {error && (
        <p role="alert" className={s.error} data-testid="link-error">
          {error}
        </p>
      )}
      <p className={s.foot}>연결하면 이용약관과 개인정보 처리방침에 동의하게 돼요.</p>
    </section>
  );
}

function Linked() {
  return (
    <div role="status" className={s.linked} data-testid="link-done">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      계정을 연결했어요. 기록이 안전하게 저장돼요.
    </div>
  );
}

export function CompleteActions({
  lessonId,
  oneLiner,
  rating,
  review,
  needLink,
  providers,
  linkResult,
  groupInitials,
}: {
  lessonId: string;
  oneLiner: string;
  rating: number | null;
  review: string;
  needLink: boolean;
  providers: ProviderId[];
  linkResult: string | null;
  groupInitials: string[];
}) {
  const [share, setShare] = useState(true);
  const [line, setLine] = useState(oneLiner);

  return (
    <>
      <section aria-label="오늘 배운 한 줄" className={s.oneLiner}>
        <label htmlFor="one-liner" className={s.oneLabel}>
          오늘 배운 한 줄
        </label>
        <textarea
          id="one-liner"
          name="oneLiner"
          form={FORM}
          rows={2}
          maxLength={ONE_LINER_MAX}
          placeholder="오늘 배운 걸 한 문장으로 적어 보세요"
          value={line}
          onChange={(e) => setLine(e.target.value)}
          className={s.oneInput}
          data-testid="one-liner"
        />
      </section>

      <Review rating={rating} review={review} />

      {needLink ? (
        <LinkCard lessonId={lessonId} providers={providers} result={linkResult} />
      ) : (
        linkSucceeded(linkResult) && <Linked />
      )}

      {groupInitials.length > 0 && (
        <div className={s.switchCard}>
          <Switch
            on={share}
            onChange={setShare}
            label="그룹에 완료 알리기"
            sub={`${groupInitials.join(", ")}님에게 "오늘 완료"만 보여요`}
          />
          <input type="hidden" name="share" value={share ? "on" : "off"} form={FORM} />
        </div>
      )}

      <form id={FORM} action={wrapUpAction}>
        <input type="hidden" name="lessonId" value={lessonId} />
        <Buttons />
      </form>
    </>
  );
}
