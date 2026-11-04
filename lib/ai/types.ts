import type { TeacherName } from "@/lib/design/types";

export interface LessonSection {
  heading: string;
  text: string;
  example: string;
  /** 근거 자료 번호(0부터). 레슨 문장마다 근거를 표시한다 */
  ref: number;
}

export interface LessonBody {
  core: string; // 핵심 한 줄
  sections: LessonSection[]; // 5분 버전은 첫 섹션만
}

export interface QuizQuestion {
  q: string;
  choices: string[];
  answer: number;
  why: string;
}

export interface PlannedLesson {
  title: string;
  body: LessonBody;
}

export interface PlannedWeek {
  title: string;
  milestone: string;
  criteria: string[]; // 3개
  lessons: PlannedLesson[];
  quiz: QuizQuestion[]; // 3개
}

export interface CurriculumInput {
  topic: string;
  goal: string;
  level: string;
  studyDays: number[];
  minutes: number;
  weeks: number;
  teacher: TeacherName;
}

export interface CurriculumPlan {
  goal: string;
  excludes: string[];
  weeks: PlannedWeek[];
}

export type Understanding = "이해" | "부분" | "미흡";

export interface TutorTurn {
  role: "user" | "ai";
  content: string;
  /** 선생님이 객관식으로 물었을 때의 보기 */
  choices?: string[];
}

export interface TutorInput {
  teacher: TeacherName;
  lessonTitle: string;
  core: string;
  history: TutorTurn[];
  /** 확인이 끝난 뒤 사용자가 아무 때나 묻는 질문(F6). 한 번 되묻고, 답을 원하면 바로 준다 */
  free?: boolean;
  /** 레슨 본문. 질문과 채점, 자유 질문 답의 근거 */
  sections?: LessonSection[];
  /** 코스를 만들 때 적은 지금 수준. 질문 난이도를 맞춘다 */
  level?: string;
  /** 같은 코스 지난 레슨 중 확인이 덜 된 레슨 제목(최근 것부터) */
  weak?: string[];
}

export interface TutorReply {
  content: string;
  understanding: Understanding;
  done: boolean;
  /** 첫 질문(객관식)이면 보기 3개, 아니면 빈 배열 */
  choices: string[];
}

export interface MilestoneInput {
  teacher: TeacherName;
  milestone: string;
  criteria: string[];
  content: string;
  round: number;
  nextWeek: number | null;
}

export interface MilestoneFeedback {
  headline: string;
  criteria: { label: string; status: "충족" | "보완 필요" | "빠짐" }[];
  fixes: string[]; // 3개 이내
  passed: boolean;
}

export interface RetroInput {
  teacher: TeacherName;
  topic: string;
  weekIndex: number;
  answers: string[];
}

export interface RetroCard {
  bridge: string; // 다른 분야와 잇는 질문
  pledge: string; // 다음 주 다짐 한 줄
}

/** 복습 카드 문제 하나를 만들 때 주는 것(lib/domain/review.ts) */
export interface ReviewInput {
  teacher: TeacherName;
  lessonTitle: string;
  core: string;
  /** 레슨 본문. 문제는 여기서만 낸다 */
  sections: LessonSection[];
  level?: string;
  /** lesson: 마친 레슨을 다시 꺼내 보기, tutor: 튜터 확인에서 헷갈린 개념을 다시 묻기 */
  focus: "lesson" | "tutor";
  /** 몇 번째 간격인지(0부터). 같은 레슨이라도 다른 각도로 묻는다 */
  step: number;
}

export interface ResourceItem {
  title: string;
  url: string;
  kind: "글" | "영상" | "책";
  minutes: number;
  reason: string;
  summary: string[]; // 최대 3줄
}

export interface AiProvider {
  readonly name: "mock" | "anthropic";
  generateCurriculum(input: CurriculumInput): Promise<CurriculumPlan>;
  tutorReply(input: TutorInput): Promise<TutorReply>;
  milestoneFeedback(input: MilestoneInput): Promise<MilestoneFeedback>;
  roommate(input: RetroInput): Promise<RetroCard>;
  /** 복습 카드 객관식 한 문제(보기 4개) */
  reviewQuestion(input: ReviewInput): Promise<QuizQuestion>;
}

/** Librarian: 레슨마다 자료를 3개까지 고른다(lib/ai/librarian.ts) */
export interface Librarian {
  search(topic: string, lessonTitle: string, level: string): Promise<ResourceItem[]>;
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly reason: "refusal" | "parse" | "network" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "AiError";
  }
}
