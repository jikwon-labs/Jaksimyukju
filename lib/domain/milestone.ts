// 마일스톤 피드백 다듬기와 화면 단계
import type { MilestoneFeedback } from "@/lib/ai/types";

export const MILESTONE_MAX = 4000;
const STATUSES = ["충족", "보완 필요", "빠짐"] as const;

/**
 * AI 응답을 화면 규칙에 맞춘다: 기준 라벨은 주차 기준 그대로(3개), 고칠 점은 3개 이내,
 * 통과는 모든 기준이 충족일 때만. 통과하면 고칠 점을 비운다.
 */
export function normalizeFeedback(fb: MilestoneFeedback, labels: string[]): MilestoneFeedback {
  const criteria = labels.slice(0, 3).map((label, i) => {
    const got = fb.criteria.find((c) => c.label === label) ?? fb.criteria[i];
    const status = got && (STATUSES as readonly string[]).includes(got.status) ? got.status : "빠짐";
    return { label, status };
  });
  const passed = fb.passed === true && criteria.every((c) => c.status === "충족");
  return {
    headline: fb.headline.trim(),
    criteria,
    fixes: passed ? [] : fb.fixes.map((f) => f.trim()).filter(Boolean).slice(0, 3),
    passed,
  };
}

export type MilestoneStage = "edit" | "review" | "feedback" | "passed" | "failed";

/** 처음 들어왔을 때 단계: 제출이 없으면 쓰기, 마지막 제출이 통과면 통과, 아니면 피드백 */
export function initialStage(last: MilestoneFeedback | null): MilestoneStage {
  if (!last) return "edit";
  return last.passed ? "passed" : "feedback";
}

/** 저장된 피드백을 화면용으로 읽는다. 통과 기준은 passed === true(데이터 규칙)라서 통과면 모두 충족으로 보여 준다 */
export function storedFeedback(raw: MilestoneFeedback, labels: string[]): MilestoneFeedback {
  if (raw.passed === true) {
    return { headline: raw.headline ?? "", criteria: labels.slice(0, 3).map((label) => ({ label, status: "충족" })), fixes: [], passed: true };
  }
  return normalizeFeedback({ headline: raw.headline ?? "", criteria: raw.criteria ?? [], fixes: raw.fixes ?? [], passed: false }, labels);
}
