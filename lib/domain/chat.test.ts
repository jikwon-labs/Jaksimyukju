import { describe, expect, it } from "vitest";
import { splitBubbles } from "./chat";

describe("splitBubbles", () => {
  it("빈 줄마다 나눈다", () => {
    expect(splitBubbles("좋아요.\n\n그럼 질문할게요?")).toEqual(["좋아요.", "그럼 질문할게요?"]);
  });
  it("공백만 있는 줄과 여러 빈 줄도 한 번만 나눈다", () => {
    expect(splitBubbles("하나\n  \n\n\n둘")).toEqual(["하나", "둘"]);
  });
  it("줄바꿈 하나는 같은 말풍선에 둔다", () => {
    expect(splitBubbles("첫 줄\n둘째 줄")).toEqual(["첫 줄\n둘째 줄"]);
  });
  it("빈 글은 그대로 하나", () => {
    expect(splitBubbles("")).toEqual([""]);
  });
});
