import { generateKeyPairSync, verify } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accountLabel,
  APPLE_ISSUER,
  appleClientSecret,
  appOrigin,
  authorizeUrl,
  callbackPath,
  challengeOf,
  decodeFlow,
  messageFor,
  encodeFlow,
  newFlow,
  parseProfile,
  parseAppleIdToken,
  pathOf,
  type Provider,
  safeNext,
  sameState,
} from "./oauth";

const google: Provider = {
  id: "google",
  mock: false,
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userinfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
  clientId: "cid",
  clientSecret: null,
  scope: "openid email profile",
  pkce: true,
};

describe("safeNext", () => {
  it("앱 안 경로만 받는다", () => {
    expect(safeNext("/lesson/a/complete", "/home")).toBe("/lesson/a/complete");
    expect(safeNext("https://evil.example", "/home")).toBe("/home");
    expect(safeNext("//evil.example", "/home")).toBe("/home");
    expect(safeNext("/\\evil.example", "/home")).toBe("/home");
    expect(safeNext(null, "/home")).toBe("/home");
    // URL 해석기가 탭·줄바꿈을 지워 "//evil.com"이 되는 경우
    expect(safeNext("/\t/evil.example", "/home")).toBe("/home");
    expect(safeNext("/\n/evil.example", "/home")).toBe("/home");
    expect(safeNext("/ /evil.example", "/home")).toBe("/home");
  });
});

describe("appOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("APP_URL이 있으면 그 주소를 쓴다(끝의 / 는 뗀다)", () => {
    vi.stubEnv("APP_URL", "https://jaksim.example/");
    expect(appOrigin("http://localhost:3100")).toBe("https://jaksim.example");
  });

  it("APP_URL이 비었거나 공백뿐이면 들어온 주소를 쓴다(.env.example을 그대로 복사한 경우)", () => {
    vi.stubEnv("APP_URL", "");
    expect(appOrigin("http://192.168.0.10:3100")).toBe("http://192.168.0.10:3100");
    vi.stubEnv("APP_URL", "   ");
    expect(appOrigin("http://192.168.0.10:3100")).toBe("http://192.168.0.10:3100");
  });

  it("APP_URL 앞뒤 공백은 떼고 쓴다", () => {
    vi.stubEnv("APP_URL", " https://jaksim.example ");
    expect(appOrigin("http://localhost:3100")).toBe("https://jaksim.example");
  });
});

describe("callbackPath", () => {
  const login = { mode: "login" as const, next: "/lesson/a" };
  const link = { mode: "link" as const, next: "/lesson/a/complete?x=1" };

  it("주소 앞부분 없이 앱 안 경로만 돌려준다", () => {
    expect(callbackPath(login, "ok")).toBe("/lesson/a");
    expect(callbackPath(login, "none")).toBe("/?login=none");
    expect(callbackPath(null, "failed")).toBe("/?login=failed");
    expect(callbackPath(link, "linked")).toBe("/lesson/a/complete?x=1&link=linked");
  });

  it("쿠키의 next가 앱 밖을 가리키면 홈으로 보낸다", () => {
    expect(callbackPath({ mode: "login", next: "//evil.example" }, "ok")).toBe("/home");
    expect(callbackPath({ mode: "login", next: "https://evil.example" }, "ok")).toBe("/home");
    // "/./"는 URL 해석 뒤 "//evil.example"로 바뀐다
    expect(callbackPath({ mode: "login", next: "/.//evil.example" }, "ok")).toBe("/home");
    expect(callbackPath({ mode: "link", next: "/.//evil.example" }, "taken")).toBe("/home?link=taken");
  });
});

describe("pathOf", () => {
  it("주소에서 경로와 쿼리만 남긴다", () => {
    expect(pathOf("http://localhost:3100/api/dev/oauth/authorize?provider=kakao&state=s")).toBe(
      "/api/dev/oauth/authorize?provider=kakao&state=s",
    );
  });
});

describe("state 쿠키", () => {
  it("넣은 그대로 꺼낸다", () => {
    const f = newFlow("kakao", "link", "/lesson/x/complete");
    expect(decodeFlow(encodeFlow(f))).toEqual(f);
  });
  it("열린 리다이렉트 경로는 /home으로 바꿔 둔다", () => {
    expect(newFlow("google", "login", "https://evil.example").next).toBe("/home");
  });
  it("깨진 값이나 모르는 공급자는 null", () => {
    expect(decodeFlow(undefined)).toBeNull();
    expect(decodeFlow("not-base64-json")).toBeNull();
    const bad = Buffer.from(JSON.stringify({ ...newFlow("kakao", "login", "/"), provider: "naver" })).toString("base64url");
    expect(decodeFlow(bad)).toBeNull();
  });
  it("state 비교는 길이가 달라도 터지지 않는다", () => {
    expect(sameState("abc", "abc")).toBe(true);
    expect(sameState("abc", "abd")).toBe(false);
    expect(sameState("abc", "abcd")).toBe(false);
  });
});

describe("authorizeUrl", () => {
  it("PKCE S256과 state, scope를 붙인다", () => {
    const f = newFlow("google", "login", "/home");
    const u = new URL(authorizeUrl(google, f, "http://localhost:3100/api/auth/google/callback"));
    expect(u.origin + u.pathname).toBe(google.authorizeUrl);
    expect(u.searchParams.get("state")).toBe(f.state);
    expect(u.searchParams.get("code_challenge")).toBe(challengeOf(f.verifier));
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("scope")).toBe("openid email profile");
    expect(u.searchParams.get("redirect_uri")).toBe("http://localhost:3100/api/auth/google/callback");
  });
  it("PKCE를 쓰지 않는 공급자에는 challenge를 붙이지 않는다", () => {
    const f = newFlow("kakao", "login", "/home");
    const u = new URL(authorizeUrl({ ...google, id: "kakao", pkce: false, scope: null }, f, "http://x/cb"));
    expect(u.searchParams.has("code_challenge")).toBe(false);
    expect(u.searchParams.has("scope")).toBe(false);
  });
  it("challenge는 RFC 7636 예시와 같다", () => {
    expect(challengeOf("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("parseProfile", () => {
  it("구글: 확인된 이메일만 받는다", () => {
    expect(parseProfile("google", { sub: "1", email: "a@b.com", email_verified: true, name: "가" })).toEqual({
      sub: "1",
      email: "a@b.com",
      name: "가",
    });
    expect(parseProfile("google", { sub: "1", email: "a@b.com", email_verified: false })?.email).toBeNull();
    expect(parseProfile("google", { email: "a@b.com" })).toBeNull();
  });
  it("카카오: 숫자 id를 문자열로, 이메일이 없어도 된다", () => {
    expect(parseProfile("kakao", { id: 12345, kakao_account: { profile: { nickname: "나" } } })).toEqual({
      sub: "12345",
      email: null,
      name: "나",
    });
    expect(parseProfile("kakao", { id: 1, kakao_account: { email: "k@k.com", is_email_verified: false } })?.email).toBeNull();
    expect(parseProfile("kakao", {})).toBeNull();
  });
});

describe("messageFor", () => {
  it("표에 있는 키만 꺼낸다", () => {
    const t = { failed: "실패" };
    expect(messageFor(t, "failed")).toBe("실패");
    expect(messageFor(t, "constructor")).toBeUndefined();
    expect(messageFor(t, "__proto__")).toBeUndefined();
    expect(messageFor(t, null)).toBeUndefined();
  });
});

describe("accountLabel", () => {
  it("연결 전은 게스트, 연결 후는 공급자와 이메일", () => {
    expect(accountLabel([], null)).toBe("게스트");
    expect(accountLabel([{ provider: "kakao" }], "me@x.com")).toBe("카카오 · me@x.com");
    expect(accountLabel([{ provider: "kakao" }, { provider: "google" }], null)).toBe("카카오·Google 연결됨");
  });
});

describe("Apple", () => {
  const enc = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const idToken = (claims: object) => `${enc({ alg: "RS256" })}.${enc(claims)}.sig`;
  const base = { iss: APPLE_ISSUER, aud: "com.jaksim6.web", sub: "001.abc", exp: 2000 };

  it("id_token에서 번호를 꺼내고, 확인된 이메일만 받는다", () => {
    expect(parseAppleIdToken(idToken(base), "com.jaksim6.web", 1000)).toEqual({ sub: "001.abc", email: null, name: null });
    expect(parseAppleIdToken(idToken({ ...base, email: "x@privaterelay.appleid.com", email_verified: "true" }), "com.jaksim6.web", 1000)?.email).toBe(
      "x@privaterelay.appleid.com",
    );
    expect(parseAppleIdToken(idToken({ ...base, email: "x@a.com", email_verified: "false" }), "com.jaksim6.web", 1000)?.email).toBeNull();
  });

  it("다른 발급자, 다른 client_id, 만료된 토큰, 깨진 값은 받지 않는다", () => {
    expect(parseAppleIdToken(idToken({ ...base, iss: "https://evil.example" }), "com.jaksim6.web", 1000)).toBeNull();
    expect(parseAppleIdToken(idToken(base), "other.client", 1000)).toBeNull();
    expect(parseAppleIdToken(idToken(base), "com.jaksim6.web", 2000)).toBeNull();
    expect(parseAppleIdToken("not-a-jwt", "com.jaksim6.web", 1000)).toBeNull();
    expect(parseAppleIdToken("a.@@@.c", "com.jaksim6.web", 1000)).toBeNull();
  });

  it("client secret은 .p8 키로 서명한 ES256 JWT다(환경 변수의 \\n도 받는다)", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString().replace(/\n/g, "\\n");
    const jwt = appleClientSecret({ teamId: "TEAM", keyId: "KEY", clientId: "com.jaksim6.web", privateKey: pem }, 1000);
    const [head, body, sig] = jwt.split(".");
    expect(JSON.parse(Buffer.from(head, "base64url").toString())).toEqual({ alg: "ES256", kid: "KEY" });
    expect(JSON.parse(Buffer.from(body, "base64url").toString())).toEqual({
      iss: "TEAM",
      iat: 1000,
      exp: 1300,
      aud: APPLE_ISSUER,
      sub: "com.jaksim6.web",
    });
    const ok = verify("sha256", Buffer.from(`${head}.${body}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url"));
    expect(ok).toBe(true);
  });

  it("사용자 정보 응답으로는 Apple 프로필을 만들지 않는다", () => {
    expect(parseProfile("apple", { sub: "1" })).toBeNull();
  });

  it("계정 줄에 Apple 이름이 나온다", () => {
    expect(accountLabel([{ provider: "apple" }], null)).toBe("Apple 연결됨");
  });
});
