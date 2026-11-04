// 사용자가 준 링크를 서버가 가져오기 전에 거르는 순수 검사(SSRF 막기).
// 실제 연결은 lib/server/fetch-link.ts가 하고, 거기서 DNS로 얻은 주소도 여기 함수로 다시 본다.

export type UrlCheck =
  | { ok: true; url: URL }
  | {
      ok: false;
      reason: "bad_url" | "scheme" | "credentials" | "port" | "blocked_host" | "blocked_ip";
    };

const ALLOWED_PORTS = new Set(["", "80", "443"]);
const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".lan",
  ".intranet",
  ".corp",
];

/** 사설·루프백·링크로컬·예약 IPv4 대역 [시작, 접두 길이] */
const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function v4ToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function v4Blocked(ip: string): boolean {
  const n = v4ToInt(ip);
  if (n === null) return true;
  return V4_BLOCKS.some(([base, bits]) => {
    const b = v4ToInt(base)!;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (n & mask) >>> 0 === (b & mask) >>> 0;
  });
}

/** IPv6 문자열을 16비트 8칸으로. 끝에 IPv4가 붙은 꼴(::ffff:1.2.3.4)도 받는다. 못 읽으면 null */
function v6Groups(ip: string): number[] | null {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, "");
  const zone = s.indexOf("%");
  if (zone >= 0) s = s.slice(0, zone);
  const lastColon = s.lastIndexOf(":");
  if (s.slice(lastColon + 1).includes(".")) {
    const n = v4ToInt(s.slice(lastColon + 1));
    if (n === null) return null;
    s = `${s.slice(0, lastColon + 1)}${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string) =>
    part === ""
      ? []
      : part.split(":").map((x) => (/^[0-9a-f]{1,4}$/.test(x) ? parseInt(x, 16) : NaN));
  const head = parse(halves[0]);
  let groups = head;
  if (halves.length === 2) {
    const rest = parse(halves[1]);
    const fill = 8 - head.length - rest.length;
    if (fill < 1) return null;
    groups = [...head, ...Array<number>(fill).fill(0), ...rest];
  }
  if (groups.length !== 8 || groups.some((g) => Number.isNaN(g))) return null;
  return groups;
}

function v6Blocked(ip: string): boolean {
  const g = v6Groups(ip);
  if (!g) return true;
  const embedded = () => `${g[6] >>> 8}.${g[6] & 0xff}.${g[7] >>> 8}.${g[7] & 0xff}`;
  // ::, ::1
  if (g.slice(0, 7).every((x) => x === 0) && (g[7] === 0 || g[7] === 1)) return true;
  // ::ffff:a.b.c.d (IPv4 대응), ::a.b.c.d (옛 호환)
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0))
    return v4Blocked(embedded());
  // 64:ff9b::/96 (NAT64): 안에 든 IPv4로 본다
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0))
    return v4Blocked(embedded());
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 고유 로컬
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 링크로컬
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 옛 사이트 로컬
  if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 멀티캐스트
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // 문서용
  if (g[0] === 0x2002)
    return v4Blocked(`${g[1] >>> 8}.${g[1] & 0xff}.${g[2] >>> 8}.${g[2] & 0xff}`); // 6to4
  if (g[0] === 0x0100 && g.slice(1, 4).every((x) => x === 0)) return true; // 100::/64 버림
  return false;
}

export function isIpLiteral(host: string): 4 | 6 | 0 {
  if (v4ToInt(host) !== null) return 4;
  if (host.includes(":")) return 6;
  return 0;
}

/** 가져오면 안 되는 주소면 true. 읽지 못하는 주소도 막는다 */
export function isBlockedAddress(ip: string): boolean {
  const kind = isIpLiteral(ip.replace(/^\[|\]$/g, ""));
  if (kind === 4) return v4Blocked(ip);
  if (kind === 6) return v6Blocked(ip);
  return true;
}

/** http/https, 기본 포트, 계정 정보 없음, 내부 이름·내부 IP가 아닌 주소만 통과 */
export function checkPublicUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "bad_url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "scheme" };
  if (url.username || url.password) return { ok: false, reason: "credentials" };
  if (!ALLOWED_PORTS.has(url.port)) return { ok: false, reason: "port" };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return { ok: false, reason: "bad_url" };
  const bare = host.replace(/^\[|\]$/g, "");
  if (isIpLiteral(bare))
    return isBlockedAddress(bare) ? { ok: false, reason: "blocked_ip" } : { ok: true, url };
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s)))
    return { ok: false, reason: "blocked_host" };
  // 점이 없는 이름(사내 호스트)은 막는다
  if (!host.includes(".")) return { ok: false, reason: "blocked_host" };
  url.hash = "";
  return { ok: true, url };
}

/** 리다이렉트 Location을 지금 주소 기준으로 풀고 다시 검사한다 */
export function checkRedirect(from: URL, location: string | undefined | null): UrlCheck {
  if (!location) return { ok: false, reason: "bad_url" };
  let next: string;
  try {
    next = new URL(location, from).toString();
  } catch {
    return { ok: false, reason: "bad_url" };
  }
  return checkPublicUrl(next);
}

/** DNS가 준 주소 가운데 하나라도 내부 주소면 통째로 막는다(섞어 두고 고르게 하는 수를 막는다) */
export function pickSafeAddress(
  addresses: readonly { address: string; family: number }[],
): { address: string; family: number } | null {
  if (addresses.length === 0) return null;
  if (addresses.some((a) => isBlockedAddress(a.address))) return null;
  return addresses[0];
}
