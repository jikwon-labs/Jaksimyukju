import { eun } from "./josa";
// 주간 회고(룸메이트) 대화 순서와 문구
import type { TeacherName } from "@/lib/design/types";

export const RETRO_STEPS = 3;

/**
 * 선생님 말 4줄(질문 3개 + 마무리). shortDay는 이번 주 5분 버전으로 이어 간 요일("수").
 * 5분으로 이어 간 날이 없으면 하기 싫은 날 자체를 짚는다.
 */
export function retroLines(who: TeacherName, week: number, shortDay: string | null): string[] {
  const d = shortDay;
  const L: Record<TeacherName, string[]> = {
    온: [
      "한 주 고생 많았어요. 이번 주에 제일 기억에 남는 건 뭐였어요?",
      "그거 정말 어려운 부분인데 잘 잡았어요. 그럼 제일 하기 싫었던 날은 언제였어요?",
      d
        ? `${d}요일에 5분 버전으로라도 이어 간 덕에 연속이 끊기지 않았어요. 다음 주 ${d}요일은 처음부터 5분 버전으로 잡아 둘까요?`
        : "그런 날도 있어요. 다음 주에 그날이 오면 처음부터 5분 버전으로 잡아 둘까요?",
      "좋아요. 다음 주도 같이 가요.",
    ],
    결: [
      `${week}주차 정리합니다. 이번 주에 확실히 남은 건 뭡니까?`,
      "좋습니다. 다음. 제일 하기 싫었던 날은 언제였습니까?",
      d
        ? `${d}요일은 5분으로 버텼습니다. 그게 연속을 지켰습니다. 다음 주 ${d}요일은 아예 5분으로 고정하죠.`
        : "그날이 고비입니다. 다음 주 그날은 아예 5분으로 고정하죠.",
      "확정합니다. 금요일 마일스톤까지 이대로 갑니다.",
    ],
    새: [
      "이번 주 탐험 일지 써 볼까요? 제일 기억에 남는 발견은 뭐였어요?",
      "오, 그거 저도 처음엔 신기했어요. 그럼 제일 귀찮았던 날은요?",
      d
        ? `${d}요일에 5분만 한 게 신의 한 수였어요. 다음 주 ${d}요일은 처음부터 5분 모험으로 해 볼까요?`
        : "그런 날엔 짧은 모험이 최고예요. 다음 주 그날은 처음부터 5분 모험으로 해 볼까요?",
      "좋아요! 다음 주엔 새 지도를 펼쳐 봐요.",
    ],
  };
  return L[who];
}

export const RETRO_YES = "좋아요, 그렇게 해요";

/** 단계별 답 칩. Q1은 이번 주 레슨 제목에서 뽑는다 */
export function retroChips(step: number, lessonTitles: string[], minutes: number): string[] {
  if (step === 0) return [...lessonTitles.slice(0, 2), "솔직히 잘 모르겠어요"];
  if (step === 1) return ["화요일, 야근해서", "수요일, 피곤해서 5분만 했어요", "딱히 없었어요"];
  if (step === 2) return [RETRO_YES, `아니요, ${minutes}분 해 볼게요`];
  return [];
}

/**
 * Q3 답을 다음 주 계획 문장으로 바꾼다. 다짐 카드 문장의 재료가 된다.
 * 칩 "좋아요" -> 5분 요일을 뺀 나머지는 평소 분량, 직접 쓴 답은 그대로.
 */
export function retroPlan(answer: string, opts: { days: string[]; shortDay: string | null; minutes: number; daysLabel: string }): string {
  const a = answer.trim();
  if (a === RETRO_YES) {
    const sd = opts.shortDay;
    if (sd && opts.days.includes(sd) && opts.days.length > 1) {
      return `${eun(opts.days.filter((x) => x !== sd).join("·"))} ${opts.minutes}분, ${sd}요일은 5분 버전`;
    }
    return `${opts.daysLabel} 힘든 날은 5분 버전으로`;
  }
  if (/^아니요, \d+분 해 볼게요$/.test(a)) return `${opts.daysLabel} 매일 ${opts.minutes}분, 전체 버전으로`;
  return a;
}
