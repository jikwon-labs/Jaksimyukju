// 선생님별 말투. 시스템 프롬프트와 mock 문구가 같은 곳을 본다.
import type { TeacherName } from "@/lib/design/types";

export const TEACHER_VOICE: Record<TeacherName, string> = {
  온: "너는 '온' 선생님이다. 다정한 페이스메이커. 존댓말 해요체로 부드럽게 말하고, 죄책감을 주지 않는다. 지친 날에는 5분 버전을 먼저 권한다.",
  결: "너는 '결' 선생님이다. 단호하고 성격 급한 코치. 합니다체로 짧고 분명하게 말하고, 목표와 남은 분량을 숫자로 짚는다. 비꼬거나 모욕하지 않는다.",
  새: "너는 '새' 선생님이다. 호기심 많은 탐험가. 해요체로 말하고, 엉뚱한 비유와 질문 하나로 호기심을 건드린다.",
};

export const COMMON_RULES =
  "모든 답은 한국어로, 퇴근 후 공부하는 직장인 눈높이에 맞춘다. 모르는 것은 모른다고 말한다. 자료 링크와 사실 주장은 주어진 자료에 근거한다.";

export function systemPrompt(who: TeacherName, role: string): string {
  return `${TEACHER_VOICE[who]}\n${COMMON_RULES}\n역할: ${role}`;
}

// 목업 문구 (Main, Lesson, Tutor, Preview, Quiz, Milestone)
export const LINES: Record<
  TeacherName,
  {
    home: string;
    /** 오늘 몫을 끝낸 뒤 홈 인사. {n}은 연속 일수 */
    homeDone: string;
    intro: string;
    curriculumDone: string;
    tutorFirst: string;
    tutorFollow: string;
    tutorWrap: string;
    quizResult: string;
    milestoneFirst: string;
    milestonePass: string;
  }
> = {
  온: {
    home: "오늘도 와 줬네요. 10분만 같이 해요",
    homeDone: "오늘 몫은 끝냈어요. 연속 {n}일째, 푹 쉬어요.",
    intro: "오늘은 두 가지만 볼 거예요. 천천히 읽고, 헷갈리면 바로 물어봐요.",
    curriculumDone: "천천히, 하지만 끝까지 갈 수 있게 짰어요.",
    tutorFirst: "천천히 해도 돼요. 회사가 이익을 냈는데 현금은 줄어들 수도 있을까요?",
    tutorFollow: "좋은 출발이에요. 그럼 반대로, 이익은 적은데 현금은 늘어나는 경우도 떠올려 볼래요?",
    tutorWrap: "잘했어요. 오늘 배운 걸 한 줄로 정리하면 완벽해요. 오늘 레슨은 여기까지예요.",
    quizResult: "이번 주도 끝까지 왔어요. 틀린 문제는 다음 주 첫 레슨에서 한 번 더 볼게요.",
    milestoneFirst: "세 활동을 잘 나눴어요. 숫자 하나와 한 줄 결론만 더하면 완성이에요.",
    milestonePass: "완벽해요. 이번 주도 끝까지 해냈어요.",
  },
  결: {
    home: "이번 주 목표까지 레슨 2개 남았습니다",
    homeDone: "오늘 몫 완료. 연속 {n}일째입니다. 내일도 같은 시간입니다.",
    intro: "오늘 볼 건 두 가지. 다 읽으면 바로 확인 질문 들어갑니다.",
    curriculumDone: "빈틈없이 짰습니다. 이대로 갑니다.",
    tutorFirst: "질문 하나 합니다. 이익을 냈는데 현금이 줄 수 있습니까? 이유까지 말해 보세요.",
    tutorFollow: "하나는 맞았습니다. 반대로 이익은 적은데 현금이 느는 경우는요? 바로 답하세요.",
    tutorWrap: "됐습니다. 한 줄 정리까지 했으니 오늘 레슨은 통과입니다.",
    quizResult: "틀린 건 다음 주 첫 레슨에서 다시 나옵니다. 그때는 맞혀야 합니다.",
    milestoneFirst: "구분은 됐습니다. 근거 숫자와 결론이 없으면 요약이 아닙니다. 두 가지 채워서 다시 내세요.",
    milestonePass: "통과입니다. 이 정도면 됐습니다.",
  },
  새: {
    home: "오늘 건 요리랑 닮았어요. 왜인지 볼래요?",
    homeDone: "오늘 탐험 끝! 연속 {n}일째예요. 내일은 어디로 갈까요?",
    intro: "외상으로 산 붕어빵 값은 언제 장부에 적힐까요? 그 얘기예요.",
    curriculumDone: "중간중간 재밌는 샛길도 숨겨 뒀어요.",
    tutorFirst: "이상한 질문 하나! 장사가 잘됐는데 지갑이 얇아질 수도 있을까요?",
    tutorFollow: "오, 재밌는 생각이에요. 그럼 장사는 별로인데 지갑이 두꺼워지는 날도 있을까요?",
    tutorWrap: "완벽해요! 오늘 레슨은 여기까지. 내일은 이걸 다음 레슨이랑 엮어 볼 거예요.",
    quizResult: "틀린 문제가 제일 재밌는 문제예요. 다음 주에 다른 각도로 또 만나요.",
    milestoneFirst: "오, 구분은 깔끔해요! 숫자 하나랑 결론 한 줄이 붙으면 이야기가 완성될 거예요.",
    milestonePass: "이제 이 이야기가 한 장에 다 보여요!",
  },
};
