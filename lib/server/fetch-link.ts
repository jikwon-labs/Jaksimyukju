import "server-only";
// 사용자가 준 링크를 서버에서 가져온다. SSRF를 막으려고:
// - 주소 검사(lib/domain/ssrf.ts checkPublicUrl): http/https, 기본 포트, 내부 이름·IP 금지
// - 연결 직전 DNS 결과 검사(lookup 훅): 이름이 내부 IP로 풀리면 연결하지 않는다(DNS 리바인딩 포함)
// - 리다이렉트는 직접 따라가며 매번 다시 검사, 횟수 한도
// - 전체 시간 한도와 받는 크기 한도
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import {
  LINK_MAX_BYTES,
  LINK_MAX_REDIRECTS,
  LINK_TIMEOUT_MS,
  MaterialError,
} from "@/lib/domain/material";
import { checkPublicUrl, checkRedirect, pickSafeAddress } from "@/lib/domain/ssrf";

export interface FetchedLink {
  url: string;
  contentType: string;
  body: Uint8Array;
}

class BlockedAddress extends Error {}

/** DNS가 내부 주소를 주면 연결 전에 끊는다 */
export const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true, family: options.family ?? 0 }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = (addresses as LookupAddress[]).map((a) => ({
      address: a.address,
      family: a.family,
    }));
    const safe = pickSafeAddress(list);
    if (!safe) return callback(new BlockedAddress(`blocked ${hostname}`), "", 0);
    if (options.all)
      return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, [safe]);
    callback(null, safe.address, safe.family);
  });
};

function once(
  url: URL,
  signal: AbortSignal,
): Promise<{ status: number; location?: string; contentType: string; body: Uint8Array }> {
  const mod = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        signal,
        // 연결을 재사용하지 않는다(검사한 주소로만 연결되게)
        agent: false,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; jaksim6-material/1.0)",
          accept: "text/html,application/xhtml+xml,text/plain;q=0.9,application/pdf;q=0.9",
          "accept-encoding": "identity",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "");
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({
            status,
            location: res.headers.location,
            contentType,
            body: new Uint8Array(),
          });
        }
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > LINK_MAX_BYTES) {
          res.destroy();
          return reject(new MaterialError("too_big"));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > LINK_MAX_BYTES) {
            res.destroy();
            reject(new MaterialError("too_big"));
            return;
          }
          chunks.push(c);
        });
        res.on("end", () =>
          resolve({ status, contentType, body: new Uint8Array(Buffer.concat(chunks)) }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

/** 링크를 가져온다. 실패는 모두 MaterialError로 바꾼다 */
export async function fetchPublicLink(raw: string): Promise<FetchedLink> {
  const first = checkPublicUrl(raw);
  if (!first.ok)
    throw new MaterialError(
      first.reason === "bad_url" || first.reason === "scheme" ? "bad_url" : "blocked_url",
    );
  const signal = AbortSignal.timeout(LINK_TIMEOUT_MS);
  let url = first.url;
  try {
    for (let hop = 0; hop <= LINK_MAX_REDIRECTS; hop++) {
      const res = await once(url, signal);
      if (res.status >= 300 && res.status < 400) {
        const next = checkRedirect(url, res.location);
        if (!next.ok)
          throw new MaterialError(next.reason === "bad_url" ? "fetch_failed" : "blocked_url");
        url = next.url;
        continue;
      }
      if (res.status < 200 || res.status >= 300) throw new MaterialError("fetch_failed");
      return { url: url.toString(), contentType: res.contentType, body: res.body };
    }
    throw new MaterialError("fetch_failed");
  } catch (e) {
    if (e instanceof MaterialError) throw e;
    if (e instanceof BlockedAddress || (e as { cause?: unknown })?.cause instanceof BlockedAddress)
      throw new MaterialError("blocked_url");
    if (signal.aborted) throw new MaterialError("timeout");
    throw new MaterialError("fetch_failed");
  }
}
