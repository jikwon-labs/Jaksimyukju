import { describe, expect, it } from "vitest";
import { mockTutor } from "./mock";
import { LEVELS } from "@/lib/domain/finish";
import {
  carriedUnderstanding,
  forceDone,
  lessonMaterial,
  levelRule,
  openAnswers,
  stripLeak,
  TUTOR_MAX_OPEN,
  tutorRole,
  weakSpots,
} from "./tutor";
import type { TutorInput, TutorTurn } from "./types";

const sections = [
  {
    heading: "현금은 언제 들어오나",
    text: "매출은 외상으로 잡혀도 현금은 나중에 들어온다.",
    example: "3월에 팔고 5월에 받는 경우",
    ref: 0,
  },
  {
    heading: "감가상각",
    text: "기계값은 한 번에 나가지만 비용은 나눠 잡는다.",
    example: "1,000만 원 기계를 5년에 나눠",
    ref: 1,
  },
];

const base: TutorInput = {
  teacher: "온",
  lessonTitle: "현금흐름",
  core: "이익과 현금은 다르다",
  history: [],
};

/** 객관식 하나 + 열린 답 n개까지 진행된 기록 */
function afterOpen(n: number): TutorTurn[] {
  const h: TutorTurn[] = [
    { role: "ai", content: "핵심은?", choices: ["가", "나", "다"] },
    { role: "user", content: "나" },
  ];
  for (let i = 0; i < n; i++) {
    h.push({ role: "ai", content: "그럼 예를 들어 볼래요?" });
    h.push({ role: "user", content: "몰라" });
  }
  return h;
}

describe("레슨 본문 넘기기", () => {
  it("섹션 제목·본문·예시가 프롬프트에 들어간다", () => {
    const role = tutorRole({ ...base, sections });
    for (const s of sections) {
      expect(role).toContain(s.heading);
      expect(role).toContain(s.text);
      expect(role).toContain(s.example);
    }
    expect(role).toContain("레슨 본문에 없는 사실은 지어내지 않는다");
  });
  it("본문이 길면 한도에서 자른다", () => {
    const long = [{ heading: "h", text: "가".repeat(5000), example: "e", ref: 0 }];
    expect(lessonMaterial(long, 1000).length).toBeLessThanOrEqual(1001);
  });
  it("본문이 없으면 본문 줄을 넣지 않는다", () => {
    expect(tutorRole(base)).not.toContain("레슨 본문:");
  });
});

describe("오답 반복 상한", () => {
  it("열린 질문 답 수는 객관식 답을 빼고 센다", () => {
    expect(openAnswers([])).toBe(0);
    expect(openAnswers(afterOpen(0))).toBe(0);
    expect(openAnswers(afterOpen(2))).toBe(2);
  });
  it("상한 전에는 남은 기회를, 상한에서는 정답을 알려 주고 끝내라고 한다", () => {
    expect(tutorRole({ ...base, history: afterOpen(1) })).toContain(
      `남은 기회 ${TUTOR_MAX_OPEN - 1}번`,
    );
    const last = tutorRole({ ...base, history: afterOpen(TUTOR_MAX_OPEN) });
    expect(last).toContain("정답과 이유");
    expect(last).toContain("done=true");
    expect(last).toContain("규칙 이야기는 하지 않는다");
  });
  it("상한에 닿았는데 AI가 안 끝내면 서버가 끝낸다", () => {
    const r = {
      content: "다시 해 볼까요?",
      understanding: "미흡" as const,
      done: false,
      choices: [],
    };
    const forced = forceDone(r, afterOpen(TUTOR_MAX_OPEN), base.core);
    expect(forced.done).toBe(true);
    // 또 묻는 AI 답은 버리고 핵심을 알려 주는 마무리로 바꾼다
    expect(forced.content).not.toContain("?");
    expect(forced.content).toContain(base.core);
    expect(forceDone(r, afterOpen(1), base.core)).toBe(r);
  });
  it("상한 규칙은 프롬프트 맨 끝에 있고, 첫 질문 앞에서 정답을 말하지 말라고 한다", () => {
    const role = tutorRole({ ...base, history: afterOpen(TUTOR_MAX_OPEN) });
    expect(role.trim().split("\n").at(-1)).toContain("마지막 규칙");
    expect(tutorRole(base)).toContain("정답을 미리 말하지 않는다");
  });
  it("mock도 상한에서 정답을 알려 주고 끝낸다", () => {
    const r = mockTutor({ ...base, history: afterOpen(TUTOR_MAX_OPEN) });
    expect(r.done).toBe(true);
    expect(r.understanding).toBe("미흡");
    expect(r.content).toContain(base.core);
  });
});

describe("자유 질문", () => {
  it("답을 달라고 하거나 이미 되물었으면 바로 답하라고 한다", () => {
    const role = tutorRole({ ...base, free: true });
    expect(role).toContain("그냥 알려줘");
    expect(role).toContain("바로 답한다");
    expect(role).not.toContain("답을 바로 주지 않고");
    expect(role).toContain('사용자"라고 부르지 않는다');
  });
  it("자유 질문은 레슨 밖 기초 지식도 밝히고 답한다, 확인 중에는 레슨 본문만", () => {
    expect(tutorRole({ ...base, sections, free: true })).toContain("레슨 밖 내용이라고");
    expect(tutorRole({ ...base, sections })).not.toContain("레슨 밖 내용이라고");
  });
});

describe("지난 레슨에서 헷갈린 것", () => {
  it("마지막 판정이 미흡·부분인 레슨 제목만, 최근 것부터 한도만큼", () => {
    const rows = [
      { title: "A", understanding: "미흡" },
      { title: "B", understanding: "이해" },
      { title: "C", understanding: "부분" },
      { title: "D", understanding: null },
      { title: "E", understanding: "미흡" },
    ];
    expect(weakSpots(rows, 2)).toEqual(["A", "C"]);
  });
  it("열린 질문을 낼 차례에만 프롬프트에 넣는다", () => {
    expect(tutorRole({ ...base, weak: ["감가상각"], history: afterOpen(0) })).toContain("감가상각");
    expect(tutorRole({ ...base, weak: ["감가상각"] })).not.toContain("감가상각");
    expect(tutorRole({ ...base, weak: [], history: afterOpen(0) })).not.toContain("지난 레슨");
    expect(tutorRole({ ...base, weak: ["감가상각"], free: true })).not.toContain("감가상각");
  });
});

describe("수준별 난이도", () => {
  it("세 수준마다 열린 질문 지시가 다르다", () => {
    const rules = LEVELS.map((level) => levelRule(level));
    expect(new Set(rules).size).toBe(3);
    expect(levelRule("처음이에요")).toContain("자기 말로");
    expect(levelRule("조금 알아요")).toContain("새 상황");
    expect(levelRule("꽤 알아요")).toContain("업무 장면");
  });
  it("열린 질문을 낼 차례에 수준 지시가 프롬프트 끝에 들어간다", () => {
    const role = tutorRole({ ...base, level: "꽤 알아요", history: afterOpen(0) });
    expect(role.trim().split("\n").at(-1)).toContain(levelRule("꽤 알아요"));
  });
  it("모르는 수준 값이면 일반 지시, 없으면 수준 줄이 없다", () => {
    expect(levelRule("실무 3년차")).toContain("실무 3년차");
    expect(tutorRole({ ...base, history: afterOpen(0) })).not.toContain("학습자 수준");
  });
});

describe("첫 질문에서 정답 새는 것 막기", () => {
  const choices = [
    "이익이 나면 통장도 는다",
    "이익과 현금은 들어오는 때가 다르다",
    "현금흐름표는 손익계산서와 같다",
  ];
  const reply = (content: string) => ({
    content,
    understanding: "부분" as const,
    done: false,
    choices,
  });
  it("첫 질문 차례에는 정답을 미리 말하지 말라는 지시가 끝에 있다", () => {
    expect(tutorRole(base).trim().split("\n").at(-1)).toContain("정답 힌트를 쓰지 않는다");
  });
  it("핵심 요약이나 보기 문장을 담은 앞 말풍선을 뺀다", () => {
    const r = reply(
      "레슨 잘 읽으셨어요.\n\n이번 레슨의 핵심은 이익과 현금이 다르다는 거예요.\n\n가장 가까운 것을 골라 볼래요?",
    );
    expect(stripLeak(r, [], base.core).content).toBe(
      "레슨 잘 읽으셨어요.\n\n가장 가까운 것을 골라 볼래요?",
    );
    const r2 = reply("이익과 현금은 들어오는 때가 다르다, 기억나죠?\n\n골라 볼래요?");
    expect(stripLeak(r2, [], base.core).content).toBe("골라 볼래요?");
  });
  it("새는 게 없거나, 첫 질문이 아니면 그대로 둔다", () => {
    const ok = reply("레슨 잘 읽으셨어요.\n\n가장 중요한 건 뭘까요?");
    expect(stripLeak(ok, [], base.core)).toBe(ok);
    const later = reply("이번 레슨의 핵심은 이거예요.\n\n다음 질문이에요?");
    expect(stripLeak(later, afterOpen(0), base.core)).toBe(later);
  });
});

describe("자유 질문 답의 판정", () => {
  it("확인 단계의 마지막 판정을 잇는다", () => {
    const h = [
      { role: "ai", understanding: "부분" },
      { role: "user", understanding: null },
      { role: "ai", understanding: "미흡" },
      { role: "user", understanding: null },
    ];
    expect(carriedUnderstanding(h)).toBe("미흡");
    expect(carriedUnderstanding([])).toBe("이해");
  });
});
