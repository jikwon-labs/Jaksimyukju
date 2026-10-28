// 매일 루프 화면의 선생님별 문구(목업 Complete, States 그대로)
import type { TeacherName } from "@/lib/design/types";

export const COMPLETE_LINE: Record<TeacherName, string> = {
  온: "오늘도 해냈네요. 정말 잘했어요. 내일도 이 시간에 기다릴게요.",
  결: "좋습니다. 계획대로 갑니다. 내일 레슨은 9시 30분에 열립니다.",
  새: "오늘 배운 거, 내일 누군가에게 한 문장으로 설명해 볼래요?",
};

export const AI_FAIL_BODY: Record<TeacherName, string> = {
  온: "미안해요, 답을 만들다 끊겼어요. 질문은 그대로 저장해 뒀어요.",
  결: "응답이 끊겼습니다. 질문은 저장했습니다. 다시 시도하세요.",
  새: "어, 생각하다 길을 잃었어요. 질문은 잘 챙겨 뒀어요!",
};

export const NO_RESOURCE_BODY: Record<TeacherName, string> = {
  온: "링크가 열리고 내용이 맞는 자료만 보여 드리려고 해요. 오늘은 제 설명만으로도 충분해요.",
  결: "검증 안 된 링크는 보여 주지 않습니다. 오늘은 레슨 본문으로 진행합니다.",
  새: "쓸 만한 자료가 안 보여요. 대신 제가 예시를 하나 더 만들어 볼게요.",
};

export const OFFLINE_BODY: Record<TeacherName, string> = {
  온: "괜찮아요. 오늘 레슨은 미리 받아 둬서 지금 바로 읽을 수 있어요.",
  결: "오늘 레슨은 저장돼 있습니다. 읽기는 지금 가능합니다.",
  새: "지하철인가요? 오늘 레슨은 가방에 넣어 뒀어요.",
};

export const OFFLINE_BAR = "오프라인 · 연결되면 자동으로 올라가요";
export const OFFLINE_NOTE = "튜터 질문과 퀴즈는 연결되면 열려요. 오늘 칸은 연결되는 순간 채워져요.";
export const NO_RESOURCE_NOTE = "내일 아침에 다시 찾아보고, 찾으면 알림으로 알려 드려요.";
