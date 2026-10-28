// 결정적 모의 응답. 같은 입력이면 항상 같은 결과를 돌려준다.
import { LINES } from "./teachers";
import {
  CASHFLOW_LESSON,
  CASHFLOW_QUIZ,
  FINANCE_EXCLUDES,
  FINANCE_TOPIC,
  FINANCE_WEEKS,
} from "./finance";
import { lessonsPerWeek } from "@/lib/domain/course";
import { eul, iga } from "@/lib/domain/josa";
import type {
  AiProvider,
  CurriculumInput,
  CurriculumPlan,
  Librarian,
  LessonBody,
  MilestoneFeedback,
  MilestoneInput,
  PlannedWeek,
  QuizQuestion,
  ResourceItem,
  RetroCard,
  RetroInput,
  TutorInput,
  TutorReply,
} from "./types";

const GENERIC_WEEKS = [
  "큰 그림 잡기",
  "핵심 용어 익히기",
  "기본 원리 이해하기",
  "작은 예제로 연습하기",
  "자주 하는 실수 피하기",
  "실전 사례 읽기",
  "나만의 방식 만들기",
  "깊이 더하기",
  "응용해 보기",
  "다른 분야와 잇기",
  "전체 다시 보기",
];

const LESSON_STEMS = ["무엇인지 알기", "왜 중요한지 보기", "예시로 따라 하기", "직접 해 보기", "정리하고 묻기", "한 걸음 더"];

function isFinance(topic: string): boolean {
  return topic.replace(/\s/g, "").includes("재무제표");
}

/** 수준에 따라 앞부분을 건너뛴다: 처음 0, 조금 1, 꽤 2 */
function levelSkip(level: string): number {
  if (level.includes("꽤")) return 2;
  if (level.includes("조금")) return 1;
  return 0;
}

function genericLesson(topic: string, title: string, minutes: number, ref: number): LessonBody {
  return {
    core: `${title}: 오늘은 ${topic}에서 이것 하나만 가져가요.`,
    sections: [
      {
        heading: `1. ${title}의 뜻`,
        text: `${iga(title)} 무엇인지 한 문장으로 말할 수 있으면 오늘의 절반은 끝난다. 먼저 정의를 읽고, 내 말로 바꿔 적어 본다.`,
        example: `${eul(topic)} 처음 배우는 동료에게 30초 안에 설명한다고 생각하고 말해 본다.`,
        ref,
      },
      {
        heading: `2. 실제로 쓰이는 곳`,
        text: `배운 것은 바로 써 볼 때 남는다. 오늘 분량(약 ${minutes}분)의 마지막 몇 분은 작은 예제로 손을 움직여 본다.`,
        example: `내 업무나 일상에서 ${iga(title)} 보이는 장면 하나를 찾아 적는다.`,
        ref: (ref + 1) % 3,
      },
    ],
  };
}

function genericQuiz(topic: string, week: PlannedWeek): QuizQuestion[] {
  const [l0, l1, l2] = week.lessons.map((l) => l.title);
  return [
    {
      q: `이번 주 "${week.title}"에서 가장 먼저 다룬 레슨은?`,
      choices: [l0 ?? "첫 레슨", "아직 배우지 않은 내용", "지난 과정의 복습", "정답 없음"],
      answer: 0,
      why: `이번 주는 "${l0 ?? week.title}"으로 시작했어요. 순서를 기억하면 다음 레슨이 쉬워져요.`,
    },
    {
      q: `${eul(topic)} 배울 때 오늘 분량을 끝내는 가장 좋은 방법은?`,
      choices: ["한 번에 몰아서 하기", "정해 둔 분량만 매일 하기", "기분 좋은 날만 하기", "건너뛰기"],
      answer: 1,
      why: "작게 매일 하는 게 끝까지 가는 가장 확실한 길이에요.",
    },
    {
      q: `"${l1 ?? week.title}" 다음에 배운 레슨은?`,
      choices: ["처음으로 돌아가기", "마일스톤 제출", l2 ?? "정리하기", "퀴즈"],
      answer: 2,
      why: `"${l2 ?? "정리하기"}"로 이어졌어요. 앞 레슨 위에 쌓이는 내용이에요.`,
    },
  ];
}

export function mockCurriculum(input: CurriculumInput): CurriculumPlan {
  const perWeek = lessonsPerWeek(input.studyDays.length);
  const weeks: PlannedWeek[] = [];
  const finance = isFinance(input.topic);
  const skip = levelSkip(input.level);
  for (let w = 0; w < input.weeks; w++) {
    const last = w === input.weeks - 1;
    let title: string;
    let milestone: string;
    let criteria: string[];
    let lessonTitles: string[];
    if (finance && w < FINANCE_WEEKS.length && !last) {
      const fw = FINANCE_WEEKS[Math.min(w + skip, FINANCE_WEEKS.length - 2)];
      ({ title, milestone, criteria } = fw);
      lessonTitles = fw.lessons;
    } else if (finance && last) {
      const fw = FINANCE_WEEKS[FINANCE_WEEKS.length - 1];
      ({ title, criteria } = fw);
      milestone = input.goal || fw.milestone;
      lessonTitles = fw.lessons;
    } else {
      const base = last ? "목적지에 도착하기" : GENERIC_WEEKS[(w + skip) % GENERIC_WEEKS.length];
      title = `${input.topic} ${base}`;
      milestone = last ? input.goal || `${input.topic} 결과물 한 장` : `${base} 한 장 정리`;
      criteria = [`${base} 핵심을 나눠 적었다`, "숫자나 예시 근거가 있다", "한 줄 결론이 있다"];
      lessonTitles = LESSON_STEMS.map((s) => `${base}: ${s}`);
    }
    const lessons = Array.from({ length: perWeek }, (_, i) => {
      const lt = lessonTitles[i % lessonTitles.length] + (i >= lessonTitles.length ? ` ${Math.floor(i / lessonTitles.length) + 1}` : "");
      const body =
        finance && lt === "현금흐름표는 왜 손익계산서와 다를까"
          ? CASHFLOW_LESSON
          : genericLesson(input.topic, lt, input.minutes, i % 3);
      return { title: lt, body };
    });
    const week: PlannedWeek = { title, milestone, criteria, lessons, quiz: [] };
    week.quiz = finance && title === "현금흐름표 이해" ? CASHFLOW_QUIZ : genericQuiz(input.topic, week);
    weeks.push(week);
  }
  return {
    goal: input.goal,
    excludes: finance ? FINANCE_EXCLUDES : [`${input.topic} 자격증 시험 대비`, "전문가용 세부 이론", "도구 설치와 환경 설정"],
    weeks,
  };
}

export function mockTutor(input: TutorInput): TutorReply {
  const L = LINES[input.teacher];
  const finance = input.lessonTitle === "현금흐름표는 왜 손익계산서와 다를까";
  const userTurns = input.history.filter((h) => h.role === "user");
  const first = finance
    ? L.tutorFirst
    : {
        온: `천천히 해도 돼요. "${input.lessonTitle}"에서 가장 기억에 남는 걸 내 말로 설명해 볼래요?`,
        결: `질문 하나 합니다. "${input.lessonTitle}"의 핵심을 한 문장으로 말해 보세요.`,
        새: `이상한 질문 하나! "${input.lessonTitle}"을 요리에 비유하면 뭘까요?`,
      }[input.teacher];
  const follow = finance
    ? L.tutorFollow
    : {
        온: "좋은 출발이에요. 그럼 그걸 내 일에 쓴다면 어디에 쓸 수 있을까요?",
        결: "하나는 됐습니다. 그럼 내 업무에 쓰는 장면 하나를 바로 대 보세요.",
        새: "오, 재밌는 생각이에요. 그럼 그게 내 하루 어디에 숨어 있을까요?",
      }[input.teacher];
  if (userTurns.length === 0) return { content: first, understanding: "부분", done: false };
  const lastAnswer = userTurns[userTurns.length - 1].content.trim();
  if (lastAnswer.length < 6) {
    const retry = {
      온: "괜찮아요. 한 문장만 더 길게, 예시 하나를 붙여서 말해 볼래요?",
      결: "너무 짧습니다. 이유를 한 문장으로 붙이세요.",
      새: "음, 조금만 더 들려줘요! 예시 하나면 충분해요.",
    }[input.teacher];
    return { content: retry, understanding: "미흡", done: false };
  }
  if (userTurns.length === 1) return { content: follow, understanding: "부분", done: false };
  return { content: L.tutorWrap, understanding: "이해", done: true };
}

export function mockMilestone(input: MilestoneInput): MilestoneFeedback {
  const text = input.content.trim();
  const lines = text.split(/\n+/).filter((l) => l.trim()).length;
  const checks: ("충족" | "보완 필요" | "빠짐")[] = [
    lines >= 3 || text.length >= 60 ? "충족" : text.length > 0 ? "보완 필요" : "빠짐",
    /\d/.test(text) ? "충족" : "빠짐",
    /(그래서|결론|따라서|한 줄로|결국)/.test(text) ? "충족" : "빠짐",
  ];
  const fixHints = [
    "항목을 나눠서 한 줄씩 적어 주세요. 세 줄이면 충분해요.",
    "숫자 하나를 붙여 주세요. 얼마인지, 작년보다 늘었는지면 돼요.",
    '마지막에 "그래서 ~하다"는 한 줄 결론을 넣어 주세요.',
  ];
  const criteria = input.criteria.slice(0, 3).map((label, i) => ({ label, status: checks[i] ?? "충족" }));
  const passed = criteria.every((c) => c.status === "충족");
  const L = LINES[input.teacher];
  const next = input.nextWeek ? ` ${input.nextWeek}주차에서 만나요.` : "";
  return {
    headline: passed ? L.milestonePass + next : L.milestoneFirst,
    criteria,
    fixes: passed ? [] : criteria.map((c, i) => (c.status === "충족" ? "" : fixHints[i])).filter(Boolean),
    passed,
  };
}

export function mockRoommate(input: RetroInput): RetroCard {
  const learned = input.answers[0]?.trim() || input.topic;
  const next = input.answers[2]?.trim() || "하루 10분";
  const bridge = {
    온: `"${learned}"를 요리에 빗대면 어떤 장면일까요? 천천히 떠올려 봐요.`,
    결: `"${learned}"를 운동 계획에 적용하면 무엇이 달라집니까?`,
    새: `"${learned}"랑 여행 짐 싸기는 어디가 닮았을까요?`,
  }[input.teacher];
  return { bridge, pledge: `${input.weekIndex + 1}주차에는 ${next}` };
}

const KINDS: ResourceItem["kind"][] = ["영상", "글", "책"];

export const mockLibrarian: Librarian = {
  async search(topic, lessonTitle) {
    const q = encodeURIComponent(topic);
    return [
      {
        title: `${lessonTitle} 한눈에 보기`,
        url: `https://ko.wikipedia.org/wiki/${encodeURIComponent(topic.replace(/\s*읽기$/, ""))}`,
        kind: KINDS[1],
        minutes: 6,
        reason: "오늘 레슨의 용어를 한 번 더 정리해 줘요.",
        summary: [`${topic}의 기본 정의를 정리한 글이에요.`, "핵심 용어마다 짧은 설명이 붙어 있어요.", "처음 보는 사람도 읽을 수 있는 분량이에요."],
      },
      {
        title: `${lessonTitle} 설명 영상`,
        url: `https://www.youtube.com/results?search_query=${q}`,
        kind: KINDS[0],
        minutes: 12,
        reason: "그림으로 보면 더 빨리 이해돼요.",
        summary: ["화면 예시로 흐름을 따라가요.", "10분 남짓이라 출퇴근길에 볼 수 있어요.", "끝에 짧은 요약이 있어요."],
      },
      {
        title: `${topic} 입문서의 한 장`,
        url: `https://search.shopping.naver.com/book/search?query=${q}`,
        kind: KINDS[2],
        minutes: 20,
        reason: "주말에 깊게 보고 싶을 때 좋아요.",
        summary: ["입문서에서 오늘 레슨과 맞닿은 장을 골랐어요.", "예제가 많아 손으로 따라 하기 좋아요.", "다음 주 내용의 예고편 역할도 해요."],
      },
    ];
  },
};

export const mockProvider: AiProvider = {
  name: "mock",
  async generateCurriculum(input) {
    return mockCurriculum(input);
  },
  async tutorReply(input) {
    return mockTutor(input);
  },
  async milestoneFeedback(input) {
    return mockMilestone(input);
  },
  async roommate(input) {
    return mockRoommate(input);
  },
};

export { FINANCE_TOPIC };
