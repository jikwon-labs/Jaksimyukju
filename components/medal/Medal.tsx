import { MEDAL_BOX, medalLabel, medalSvg, type MedalInput } from "@/lib/domain/medal";

interface Props extends MedalInput {
  /** 가로 px. 세로는 비율대로 */
  size?: number;
  /** 장식으로만 쓸 때(옆에 같은 내용의 글자가 있을 때) */
  decorative?: boolean;
  className?: string;
}

/** 완주 메달. 그림은 lib/domain/medal 의 SVG 를 그대로 쓴다(수료 카드와 같은 그림) */
export function Medal({ size = MEDAL_BOX.width, decorative = false, className, ...medal }: Props) {
  const height = Math.round((size * MEDAL_BOX.height) / MEDAL_BOX.width);
  return (
    <span
      className={className}
      style={{ display: "inline-block", width: size, height, flex: "none", lineHeight: 0 }}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": medalLabel(medal) })}
      // 숫자와 고정 색만 들어간 SVG 라 사용자 입력이 섞이지 않는다
      dangerouslySetInnerHTML={{ __html: medalSvg(medal, size) }}
    />
  );
}
