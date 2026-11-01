import { describe, expect, it } from "vitest";
import { mockCurriculum, mockMilestone, mockProvider, mockTutor } from "./mock";
import { LINES, lessonIntro } from "./teachers";

const base = {
  topic: "재무제표 읽기",
  goal: "재무제표를 혼자 읽고 한 장으로 요약하기",
  level: "처음이에요",
  studyDays: [1, 2, 3, 4, 5],
  minutes: 10,
  weeks: 6,
  teacher: "온" as const,
};

describe("mock 커리큘럼", () => {
  it("결정적이다", () => {
    expect(mockCurriculum(base)).toEqual(mockCurriculum(base));
  });
  it("주 수와 요일 수를 반영한다", () => {
    const p = mockCurriculum({ ...base, weeks: 4, studyDays: [1, 3, 5] });
    expect(p.weeks).toHaveLength(4);
    expect(p.weeks.every((w) => w.lessons.length === 2)).toBe(true);
    expect(p.weeks.every((w) => w.quiz.length === 3 && w.criteria.length === 3)).toBe(true);
  });
  it("재무제표는 목업 주차 제목, 마지막 주 마일스톤은 목적지", () => {
    const p = mockCurriculum(base);
    expect(p.weeks.map((w) => w.title).slice(0, 2)).toEqual(["손익계산서 기본", "현금흐름표 이해"]);
    expect(p.weeks[1].lessons[3].title).toBe("현금흐름표는 왜 손익계산서와 다를까");
    expect(p.weeks[5].milestone).toBe(base.goal);
    expect(p.excludes).toContain("세무 신고");
  });
  it("다른 주제·목표·수준·분량을 반영한다", () => {
    const p = mockCurriculum({ ...base, topic: "사진 보정", goal: "여행 사진 10장 보정", level: "꽤 알아요", minutes: 30, weeks: 2 });
    expect(p.weeks[0].title).toContain("사진 보정");
    expect(p.weeks[0].title).toContain("기본 원리 이해하기");
    expect(p.weeks[1].milestone).toBe("여행 사진 10장 보정");
    expect(p.weeks[0].lessons[0].body.sections[1].text).toContain("30분");
    const easy = mockCurriculum({ ...base, topic: "사진 보정", weeks: 2 });
    expect(easy.weeks[0].title).toContain("큰 그림 잡기");
  });
});

describe("mock 튜터", () => {
  const input = { teacher: "결" as const, lessonTitle: "현금흐름표는 왜 손익계산서와 다를까", core: "", history: [] };
  it("객관식 첫 질문 → 열린 질문 → 마무리", () => {
    const q1 = mockTutor(input);
    expect(q1.content).toContain("이익을 냈는데 현금이 줄 수 있습니까");
    expect(q1.choices).toHaveLength(3);
    const h1 = [{ role: "ai" as const, content: q1.content, choices: q1.choices }, { role: "user" as const, content: q1.choices[1] }];
    const q2 = mockTutor({ ...input, history: h1 });
    expect(q2.done).toBe(false);
    expect(q2.understanding).toBe("부분");
    expect(q2.choices).toEqual([]);
    expect(q2.content).not.toContain("정답은");
    const q3 = mockTutor({ ...input, history: [...h1, { role: "ai", content: q2.content }, { role: "user", content: "감가상각처럼 돈이 안 나가는 비용이 크면요." }] });
    expect(q3).toMatchObject({ done: true, understanding: "이해" });
  });
  it("틀린 보기를 고르면 정답을 짚고 열린 질문으로 넘어간다", () => {
    const q1 = mockTutor(input);
    const r = mockTutor({ ...input, history: [{ role: "ai", content: q1.content, choices: q1.choices }, { role: "user", content: q1.choices[0] }] });
    expect(r.content).toContain(`정답은 "${q1.choices[1]}"`);
    expect(r).toMatchObject({ done: false, choices: [] });
  });
  it("열린 질문에 너무 짧게 답하면 미흡으로 다시 묻는다", () => {
    const r = mockTutor({
      ...input,
      history: [{ role: "ai", content: "q" }, { role: "user", content: "보기" }, { role: "ai", content: "q2" }, { role: "user", content: "몰라" }],
    });
    expect(r.understanding).toBe("미흡");
  });
});

describe("mock 마일스톤", () => {
  const input = { teacher: "온" as const, milestone: "내 회사 현금흐름 한 장 요약", criteria: ["세 활동을 나눴다", "숫자 근거가 있다", "한 줄 결론이 있다"], round: 1, nextWeek: 3 };
  it("목업 첫 제출은 숫자·결론이 빠짐", () => {
    const r = mockMilestone({ ...input, content: "영업활동: 플러스. 본업으로 돈을 벌고 있다.\n투자활동: 마이너스.\n재무활동: 대출을 조금 갚았다." });
    expect(r.criteria.map((c) => c.status)).toEqual(["충족", "빠짐", "빠짐"]);
    expect(r.fixes).toHaveLength(2);
    expect(r.passed).toBe(false);
  });
  it("고쳐서 다시 내면 통과", () => {
    const r = mockMilestone({ ...input, round: 2, content: "영업활동: 120억 플러스.\n투자활동: 설비 40억.\n재무활동: 대출 10억 상환.\n그래서 현금은 넉넉하다." });
    expect(r.passed).toBe(true);
    expect(r.fixes).toEqual([]);
    expect(r.headline).toContain("3주차");
  });
});

describe("mock 튜터: 확인 뒤 자유 질문", () => {
  it("답을 바로 주지 않고 되묻는다", () => {
    const r = mockTutor({
      teacher: "온",
      lessonTitle: "현금흐름표는 왜 손익계산서와 다를까",
      core: "",
      free: true,
      history: [{ role: "user", content: "감가상각은 왜 현금이 안 나가요?" }],
    });
    expect(r.done).toBe(true);
    expect(r.content).toContain("감가상각은 왜 현금이 안 나가요?");
    expect(r.content.trim().endsWith("?")).toBe(true);
  });
});

describe("다른 주제의 레슨 문구", () => {
  it("재무제표 예시가 섞이지 않고, 제목을 두 번 잇지 않는다", async () => {
    const plan = await mockProvider.generateCurriculum({
      topic: "Node.js",
      goal: "결과물 하나",
      level: "처음이에요",
      studyDays: [1, 2, 3, 4, 5],
      minutes: 30,
      weeks: 2,
      teacher: "새",
    });
    const body = plan.weeks[0].lessons[0].body;
    expect(body.core).toBe(`오늘은 Node.js의 "${plan.weeks[0].lessons[0].title}" 하나만 가져가요.`);
    expect(JSON.stringify(body)).not.toMatch(/장부|붕어빵|재무/);
    expect(lessonIntro("새", "Node.js")).not.toMatch(/붕어빵/);
    expect(lessonIntro("새", "재무제표 읽기")).toBe(LINES.새.intro);
  });
});
