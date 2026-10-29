// 선생님이 남기는 알림(Coach). 앱을 열 때와 스케줄러(/api/cron/tick)가 부른다. 실제 푸시는 보내지 않고 알림 목록에 남긴다.
import type { TeacherName } from "@/lib/design/types";
import { diffDays, mondayOf, weekday, type DayKey } from "./dates";
import { QUIET_START } from "./limits";

export const MISSED_ONE_LINE: Record<TeacherName, string> = {
  온: "어제는 쉬어 갔네요. 괜찮아요, 오늘 5분만 같이 해요.",
  결: "어제 한 칸 비었습니다. 오늘은 5분 버전이라도 채웁니다.",
  새: "어제 못 본 사이에 궁금한 게 하나 생겼어요. 5분만 볼래요?",
};

/** 빈 학습일이 어제가 아니었을 때(사이에 쉬는 요일이 낀 경우) */
export const MISSED_EARLIER_LINE: Record<TeacherName, string> = {
  온: "지난 학습일은 쉬어 갔네요. 괜찮아요, 오늘 5분만 같이 해요.",
  결: "지난 학습일 한 칸이 비었습니다. 오늘은 5분 버전이라도 채웁니다.",
  새: "지난번에 못 본 사이에 궁금한 게 하나 생겼어요. 5분만 볼래요?",
};

export const RETRO_LINE: Record<TeacherName, string> = {
  온: "이번 주도 수고했어요. 3분만 같이 돌아볼까요?",
  결: "한 주 정리합니다. 질문 3개, 3분이면 끝납니다.",
  새: "이번 주에 배운 걸 엉뚱한 데랑 이어 볼 시간이에요!",
};

/** 학습 시각이 됐는데 오늘 칸이 비어 있을 때(스케줄러만 남긴다) */
export const STUDY_LINE: Record<TeacherName, string> = {
  온: "약속한 학습 시간이에요. 오늘 한 칸, 같이 채워요.",
  결: "학습 시간입니다. 오늘 분량을 시작합니다.",
  새: "학습 시간이에요! 오늘은 뭘 알게 될까요?",
};

/** "21:30" -> 1290(하루 중 분). 깨진 값은 21:00 */
export function notifyMinutesOf(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  const h = m ? Number(m[1]) : NaN;
  const min = m ? Number(m[2]) : NaN;
  return h >= 0 && h <= 23 && min >= 0 && min <= 59 ? h * 60 + min : 21 * 60;
}

/** 밤 11시부터는 알림을 못 보내므로, 그보다 늦은 알림 시각은 마지막으로 보낼 수 있는 22:30에 보낸다 */
export const LAST_REMIND_MINUTES = QUIET_START * 60 - 30;

/** 스케줄러 tick 시각(하루 중 분)에 학습 시간 알림을 보낼 때가 됐는지 */
export function reminderDue(minuteOfDay: number, notifyTime: string): boolean {
  return minuteOfDay >= Math.min(notifyMinutesOf(notifyTime), LAST_REMIND_MINUTES);
}

export interface CoachInput {
  today: DayKey;
  /** 어제부터 거꾸로 이어진 빈 학습일 수 */
  missed: number;
  /** 빈 학습일(가장 이른 날). missed가 0이면 null */
  missedDay: DayKey | null;
  studiedToday: boolean;
  restingToday: boolean;
  /** 이미 남긴 알림 제목과 날짜(같은 날 같은 알림을 두 번 남기지 않는다) */
  sent: { key: string; day: DayKey }[];
  /** 이번 주(월요일 기준) 회고를 이미 했는지 */
  retroDoneThisWeek: boolean;
  /** 오늘이 학습일인지 */
  studyDay?: boolean;
  /** 스케줄러가 학습 시각 이후에 불렀는지(앱을 열 때는 학습 시간 알림을 남기지 않는다) */
  remind?: boolean;
}

export interface CoachNote {
  key: "missed_one" | "retro" | "study";
  kind: "teacher" | "retro";
  href: string;
  /** 같은 빈 날·같은 주에 한 번만 남기기 위한 키 */
  dedupe: string;
  /** missed_one: 빈 날이 어제였는지(문구가 다르다) */
  yesterday?: boolean;
}

/**
 * 남길 알림. 학습일 1일 빔이면 다음 날 선생님 알림 한 번(2일 이상은 복귀 화면이 맡는다),
 * 일요일이면 주간 회고 알림 한 번, 스케줄러가 학습 시각 뒤에 부르면 비어 있는 학습일에 학습 시간 알림 한 번.
 */
export function coachNotes(i: CoachInput): CoachNote[] {
  const out: CoachNote[] = [];
  if (i.restingToday) return out;
  // 빈 학습일 하나에 대해 한 번만. 그 날 이후 이미 남겼으면 다시 남기지 않는다
  const missedDay = i.missedDay;
  const sentSince = (key: string, from: DayKey) => i.sent.some((s) => s.key === key && diffDays(s.day, from) > 0);
  if (i.missed === 1 && missedDay && !i.studiedToday && !sentSince("missed_one", missedDay)) {
    out.push({
      key: "missed_one",
      kind: "teacher",
      href: "/home",
      dedupe: `missed_one:${missedDay}`,
      yesterday: diffDays(i.today, missedDay) === 1,
    });
  }
  if (i.remind && i.studyDay && !i.studiedToday && !i.sent.some((s) => s.key === "study" && s.day === i.today)) {
    out.push({ key: "study", kind: "teacher", href: "/home", dedupe: `study:${i.today}` });
  }
  const week = mondayOf(i.today);
  const retroSent = i.sent.some((s) => s.key === "retro" && mondayOf(s.day) === week);
  if (weekday(i.today) === 0 && !i.retroDoneThisWeek && !retroSent) {
    out.push({ key: "retro", kind: "retro", href: "/retro", dedupe: `retro:${week}` });
  }
  return out;
}
