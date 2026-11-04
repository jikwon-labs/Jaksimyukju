import { describe, expect, it } from "vitest";
import { checkPublicUrl, checkRedirect, isBlockedAddress, pickSafeAddress } from "./ssrf";

describe("checkPublicUrl", () => {
  it("공개 http/https 주소는 통과한다", () => {
    const r = checkPublicUrl("https://ko.wikipedia.org/wiki/재무제표#개요");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url.hash).toBe("");
    expect(checkPublicUrl("http://example.com:80/a").ok).toBe(true);
    expect(checkPublicUrl("https://8.8.8.8/").ok).toBe(true);
  });

  it("http/https가 아니면 막는다", () => {
    for (const u of [
      "file:///etc/passwd",
      "ftp://example.com/a",
      "gopher://x.com",
      "javascript:alert(1)",
      "data:text/html,hi",
    ]) {
      expect(checkPublicUrl(u)).toMatchObject({ ok: false, reason: "scheme" });
    }
    expect(checkPublicUrl("그냥 글")).toMatchObject({ ok: false, reason: "bad_url" });
  });

  it("계정 정보와 기본이 아닌 포트를 막는다", () => {
    expect(checkPublicUrl("https://user:pw@example.com/")).toMatchObject({
      ok: false,
      reason: "credentials",
    });
    expect(checkPublicUrl("http://example.com:6379/")).toMatchObject({ ok: false, reason: "port" });
    expect(checkPublicUrl("http://example.com:22/")).toMatchObject({ ok: false, reason: "port" });
  });

  it("루프백·사설·링크로컬 IP를 막는다(여러 표기 포함)", () => {
    for (const u of [
      "http://127.0.0.1/",
      "http://127.1/",
      "http://2130706433/",
      "http://0x7f000001/",
      "http://0.0.0.0/",
      "http://10.1.2.3/",
      "http://172.16.0.1/",
      "http://172.31.255.255/",
      "http://192.168.0.10/",
      "http://169.254.169.254/latest/meta-data/",
      "http://100.64.0.1/",
      "http://[::1]/",
      "http://[::]/",
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:7f00:1]/",
      "http://[fe80::1]/",
      "http://[fd00::1]/",
      "http://[64:ff9b::a9fe:a9fe]/",
    ]) {
      expect(checkPublicUrl(u), u).toMatchObject({ ok: false, reason: "blocked_ip" });
    }
  });

  it("내부 이름을 막는다", () => {
    for (const u of [
      "http://localhost/",
      "http://LOCALHOST./",
      "http://app.localhost/",
      "http://printer.local/",
      "http://intranet/",
      "http://db.internal/",
    ]) {
      expect(checkPublicUrl(u), u).toMatchObject({ ok: false, reason: "blocked_host" });
    }
  });
});

describe("isBlockedAddress", () => {
  it("공개 주소는 통과, 내부 주소는 막는다", () => {
    expect(isBlockedAddress("93.184.216.34")).toBe(false);
    expect(isBlockedAddress("2606:4700:4700::1111")).toBe(false);
    expect(isBlockedAddress("172.32.0.1")).toBe(false);
    expect(isBlockedAddress("172.15.255.255")).toBe(false);
    expect(isBlockedAddress("127.0.0.53")).toBe(true);
    expect(isBlockedAddress("::ffff:10.0.0.1")).toBe(true);
    expect(isBlockedAddress("::ffff:8.8.8.8")).toBe(false);
    expect(isBlockedAddress("fe80::1%en0")).toBe(true);
    expect(isBlockedAddress("ff02::1")).toBe(true);
    expect(isBlockedAddress("224.0.0.1")).toBe(true);
    expect(isBlockedAddress("255.255.255.255")).toBe(true);
  });

  it("읽지 못하는 주소는 막는다", () => {
    expect(isBlockedAddress("not-an-ip")).toBe(true);
    expect(isBlockedAddress("999.1.1.1")).toBe(true);
    expect(isBlockedAddress("1:2:3")).toBe(true);
  });
});

describe("checkRedirect", () => {
  const from = new URL("https://example.com/a/b");
  it("상대 주소를 풀고 다시 검사한다", () => {
    const r = checkRedirect(from, "/c");
    expect(r.ok && r.url.toString()).toBe("https://example.com/c");
  });
  it("내부 주소로 넘기는 리다이렉트를 막는다", () => {
    expect(checkRedirect(from, "http://169.254.169.254/")).toMatchObject({
      ok: false,
      reason: "blocked_ip",
    });
    expect(checkRedirect(from, "http://localhost:3100/api")).toMatchObject({ ok: false });
    expect(checkRedirect(from, "file:///etc/passwd")).toMatchObject({
      ok: false,
      reason: "scheme",
    });
    expect(checkRedirect(from, undefined)).toMatchObject({ ok: false, reason: "bad_url" });
  });
});

describe("pickSafeAddress", () => {
  it("DNS 결과에 내부 주소가 하나라도 있으면 막는다", () => {
    expect(pickSafeAddress([{ address: "93.184.216.34", family: 4 }])).toEqual({
      address: "93.184.216.34",
      family: 4,
    });
    expect(
      pickSafeAddress([
        { address: "93.184.216.34", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ]),
    ).toBeNull();
    expect(pickSafeAddress([{ address: "::1", family: 6 }])).toBeNull();
    expect(pickSafeAddress([])).toBeNull();
  });
});
