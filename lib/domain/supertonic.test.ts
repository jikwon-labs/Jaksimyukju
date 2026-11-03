import { describe, expect, it } from "vitest";
import {
  isMetered,
  isSupertonicVoice,
  latentLength,
  megabytes,
  missingBytes,
  pcmKey,
  SizedLru,
  storageRoom,
  preprocessForSupertonic,
  SUPERTONIC_FILES,
  SUPERTONIC_TOTAL_BYTES,
  supertonicVoiceLabel,
  textToIds,
} from "./supertonic";

describe("preprocessForSupertonic", () => {
  it("wraps with the language tag and adds a final period", () => {
    expect(preprocessForSupertonic("hello world")).toBe("<ko>hello world.</ko>");
    expect(preprocessForSupertonic("Done!", "en")).toBe("<en>Done!</en>");
  });
  it("decomposes Hangul into jamo (NFKD) like the original", () => {
    const out = preprocessForSupertonic("한");
    expect(out).toBe(`<ko>${"한".normalize("NFKD")}.</ko>`);
    expect(out.length).toBe("<ko>".length + 3 + 1 + "</ko>".length);
  });
  it("cleans symbols, emoji and spacing", () => {
    expect(preprocessForSupertonic("A → B [1] 📈 ok")).toBe("<ko>A B 1 ok.</ko>");
    expect(preprocessForSupertonic("A , B ?")).toBe("<ko>A, B?</ko>");
    expect(preprocessForSupertonic("say “hi”")).toBe('<ko>say "hi"</ko>');
  });
});

describe("textToIds", () => {
  it("maps code points through the indexer and marks unknown ones", () => {
    const indexer = Array.from({ length: 128 }, (_, i) => i * 2);
    expect(textToIds("AB", indexer)).toEqual([130, 132]);
    expect(textToIds("가", indexer)).toEqual([-1]);
  });
});

describe("latentLength", () => {
  it("rounds up to whole chunks", () => {
    // 44100Hz, 512*6 = 3072 samples per latent step
    expect(latentLength(1, 44100, 512, 6)).toBe(Math.ceil(44100 / 3072));
    expect(latentLength(0, 44100, 512, 6)).toBe(1);
  });
});

describe("manifest and labels", () => {
  it("lists every model part and 10 voices, about 263MB", () => {
    expect(SUPERTONIC_FILES.filter((f) => f.path.endsWith(".onnx"))).toHaveLength(4);
    expect(SUPERTONIC_FILES.filter((f) => f.path.startsWith("voice_styles/"))).toHaveLength(10);
    expect(megabytes(SUPERTONIC_TOTAL_BYTES)).toBe("267MB");
  });
  it("labels voices in Korean", () => {
    expect(supertonicVoiceLabel("F1")).toBe("여성 1");
    expect(supertonicVoiceLabel("M5")).toBe("남성 5");
    expect(isSupertonicVoice("M3")).toBe(true);
    expect(isSupertonicVoice("X1")).toBe(false);
  });
});

describe("missingBytes", () => {
  it("adds only files not cached yet", () => {
    expect(missingBytes([])).toBe(SUPERTONIC_TOTAL_BYTES);
    expect(missingBytes(SUPERTONIC_FILES.map(() => true))).toBe(0);
    const firstOnly = SUPERTONIC_FILES.map((_, i) => i === 0);
    expect(missingBytes(firstOnly)).toBe(SUPERTONIC_TOTAL_BYTES - SUPERTONIC_FILES[0].bytes);
  });
});

describe("storageRoom", () => {
  it("passes when the estimate is unknown", () => {
    expect(storageRoom(null, 100)).toEqual({ ok: true });
    expect(storageRoom({ quota: 1000 }, 100)).toEqual({ ok: true });
  });
  it("needs 10% headroom over the download", () => {
    expect(storageRoom({ quota: 1000, usage: 890 }, 100)).toEqual({ ok: true });
    expect(storageRoom({ quota: 1000, usage: 900 }, 100)).toEqual({ ok: false, free: 100 });
    expect(storageRoom({ quota: 1000, usage: 1200 }, 100)).toEqual({ ok: false, free: 0 });
  });
});

describe("isMetered", () => {
  it("is false when the browser does not tell", () => {
    expect(isMetered(undefined)).toBe(false);
    expect(isMetered({})).toBe(false);
  });
  it("flags cellular and data saver", () => {
    expect(isMetered({ type: "cellular" })).toBe(true);
    expect(isMetered({ type: "wifi", saveData: true })).toBe(true);
  });
  it("trusts wifi over a slow effective type, and flags slow unknown links", () => {
    expect(isMetered({ type: "wifi", effectiveType: "3g" })).toBe(false);
    expect(isMetered({ effectiveType: "3g" })).toBe(true);
    expect(isMetered({ effectiveType: "4g" })).toBe(false);
  });
});

describe("SizedLru", () => {
  const lru = () => new SizedLru<string>(10, (v) => v.length);
  it("evicts the least recently used past the budget", () => {
    const c = lru();
    c.set("a", "aaaa");
    c.set("b", "bbbb");
    expect(c.get("a")).toBe("aaaa");
    c.set("c", "cccc");
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe("aaaa");
    expect(c.get("c")).toBe("cccc");
    expect(c.bytes).toBe(8);
  });
  it("replaces an existing key without double counting", () => {
    const c = lru();
    c.set("a", "aaaa");
    c.set("a", "aaaaaa");
    expect(c.bytes).toBe(6);
    expect(c.size).toBe(1);
  });
  it("skips a value larger than the whole budget", () => {
    const c = lru();
    c.set("a", "aa");
    c.set("big", "x".repeat(11));
    expect(c.get("big")).toBeUndefined();
    expect(c.get("a")).toBe("aa");
  });
  it("clears", () => {
    const c = lru();
    c.set("a", "aa");
    c.clear();
    expect(c.size).toBe(0);
    expect(c.bytes).toBe(0);
  });
});

describe("pcmKey", () => {
  it("differs by voice, speed and text", () => {
    const k = pcmKey("F1", 1.05, "안녕");
    expect(k).not.toBe(pcmKey("M1", 1.05, "안녕"));
    expect(k).not.toBe(pcmKey("F1", 1.26, "안녕"));
    expect(k).not.toBe(pcmKey("F1", 1.05, "안녕."));
  });
});
