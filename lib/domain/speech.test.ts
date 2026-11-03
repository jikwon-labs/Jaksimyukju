import { describe, expect, it } from "vitest";
import {
  cleanForSpeech,
  DEFAULT_SPEECH_PREFS,
  koreanVoices,
  parseSpeechPrefs,
  pickVoice,
  rateLabel,
  splitForSpeech,
  voiceLabel,
} from "./speech";

describe("parseSpeechPrefs", () => {
  it("falls back to defaults on empty or broken input", () => {
    expect(parseSpeechPrefs(null)).toEqual(DEFAULT_SPEECH_PREFS);
    expect(parseSpeechPrefs("{oops")).toEqual(DEFAULT_SPEECH_PREFS);
  });
  it("keeps valid fields and drops unknown rates", () => {
    expect(parseSpeechPrefs('{"on":false,"voice":"v1","rate":1.2}')).toEqual({ on: false, voice: "v1", rate: 1.2 });
    expect(parseSpeechPrefs('{"rate":7}').rate).toBe(1);
  });
  it("labels rates", () => {
    expect(rateLabel(1)).toBe("보통");
    expect(rateLabel(1.5)).toBe("1.5배");
  });
});

describe("cleanForSpeech", () => {
  it("removes markers and symbols", () => {
    expect(cleanForSpeech("**ROE**는 [1] 중요해요 📈")).toBe("ROE는 중요해요");
    expect(cleanForSpeech("매출 → 이익")).toBe("매출 , 이익");
    expect(cleanForSpeech("3~5년")).toBe("3에서 5년");
  });
});

describe("splitForSpeech", () => {
  it("splits by sentence and line", () => {
    expect(splitForSpeech("첫 문장이에요. 두 번째예요!\n세 번째")).toEqual(["첫 문장이에요.", "두 번째예요!", "세 번째"]);
  });
  it("keeps chunks under the limit", () => {
    const long = Array.from({ length: 30 }, (_, i) => `단어${i}`).join(" ");
    const parts = splitForSpeech(long, 40);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 40)).toBe(true);
    expect(parts.join(" ")).toBe(long);
  });
  it("prefers commas when splitting", () => {
    expect(splitForSpeech("앞부분은 이렇고, 뒷부분은 저래요", 12)).toEqual(["앞부분은 이렇고,", "뒷부분은 저래요"]);
  });
  it("returns nothing for blank text", () => {
    expect(splitForSpeech("  \n ")).toEqual([]);
  });
});

describe("voices", () => {
  const voices = [
    { voiceURI: "en", name: "Samantha", lang: "en-US" },
    { voiceURI: "yuna", name: "Yuna", lang: "ko-KR" },
    { voiceURI: "g", name: "Google 한국의", lang: "ko_KR", default: true },
    { voiceURI: "yuna", name: "Yuna", lang: "ko-KR" },
  ];
  it("keeps Korean voices only, default first, no duplicates", () => {
    expect(koreanVoices(voices).map((v) => v.voiceURI)).toEqual(["g", "yuna"]);
  });
  it("picks the saved voice or the first Korean one", () => {
    expect(pickVoice(voices, "yuna")?.voiceURI).toBe("yuna");
    expect(pickVoice(voices, "gone")?.voiceURI).toBe("g");
    expect(pickVoice([voices[0]], "")).toBeNull();
  });
  it("strips language tags from names", () => {
    expect(voiceLabel({ name: "Microsoft Heami - Korean (Korean)" })).toBe("Microsoft Heami");
    expect(voiceLabel({ name: "유나(한국어(대한민국))" })).toBe("유나");
    expect(voiceLabel({ name: "Yuna (향상됨)" })).toBe("Yuna (향상됨)");
  });
});
