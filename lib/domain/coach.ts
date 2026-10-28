// 앱을 열 때 선생님이 남기는 알림(Coach). 푸시·스케줄러가 없는 대신 알림 목록에만 남긴다.
import type { TeacherName } from "@/lib/design/types";
import { mondayOf, weekday, type DayKey } from "./dates";

export const MISSED_ONE_LINE: Record<TeacherName, string> = {
  온: "어제는 쉬어 갔네요. 괜찮아요, 오늘 5분만 같이 해요.",
  결: "어제 한 칸 비었습니다. 오늘은 5분 버전이라도 채웁니다.",
  새: "어제 못 본 사이에 궁금한 게 하나 생겼어요. 5분만 볼래요?",
};

export const RETRO_LINE: Record<TeacherName, string> = {
  온: "이번 주도 수고했어요. 3분만 같이 돌아볼까요?",
  결: "한 주 정리합니다. 질문 3개, 3분이면 끝납니다.",
  새: "이번 주에 배운 걸 엉뚱한 데랑 이어 볼 시간이에요!",
};

export interface CoachInput {
  today: DayKey;
  /** 어제부터 거꾸로 이어진 빈 학습일 수 */
  missed: number;
  studiedToday: boolean;
  restingToday: boolean;
  /** 이미 남긴 알림 제목과 날짜(같은 날 같은 알림을 두 번 남기지 않는다) */
  sent: { key: string; day: DayKey }[];
  /** 이번 주(월요일 기준) 회고를 이미 했는지 */
  retroDoneThisWeek: boolean;
}

export interface CoachNote {
  key: "missed_one" | "retro";
  kind: "teacher" | "retro";
  href: string;
}

/**
 * 남길 알림. 학습일 1일 빔이면 다음 날 선생님 알림 한 번(2일 이상은 복귀 화면이 맡는다),
 * 일요일이면 주간 회고 알림 한 번.
 */
export function coachNotes(i: CoachInput): CoachNote[] {
  const out: CoachNote[] = [];
  if (i.restingToday) return out;
  const sentToday = (key: string) => i.sent.some((s) => s.key === key && s.day === i.today);
  if (i.missed === 1 && !i.studiedToday && !sentToday("missed_one")) {
    out.push({ key: "missed_one", kind: "teacher", href: "/home" });
  }
  const week = mondayOf(i.today);
  const retroSent = i.sent.some((s) => s.key === "retro" && mondayOf(s.day) === week);
  if (weekday(i.today) === 0 && !i.retroDoneThisWeek && !retroSent) {
    out.push({ key: "retro", kind: "retro", href: "/retro" });
  }
  return out;
}
