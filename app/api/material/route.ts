import { NextResponse, type NextRequest } from "next/server";
import { createGuest, getSessionUser } from "@/lib/auth";
import { isTeacher } from "@/lib/design/tokens";
import {
  FILE_MAX_BYTES,
  looksLikePdf,
  MATERIAL_ERRORS,
  MaterialError,
  type MaterialErrorCode,
  type MaterialResponse,
  UPLOAD_RATE,
} from "@/lib/domain/material";
import { clientKey, hitRate, type RateWindow } from "@/lib/domain/rate-limit";
import {
  addCourseMaterial,
  type Extracted,
  fromLink,
  fromPdfFile,
  saveDraftMaterial,
} from "@/lib/server/material";

// PDF 글 뽑기와 링크 가져오기에 시간이 걸린다
export const maxDuration = 30;

const STATUS: Partial<Record<MaterialErrorCode, number>> = {
  auth: 401,
  too_big: 413,
  no_course: 409,
  too_many: 409,
  too_often: 429,
};

// 함수 인스턴스마다 따로 센다(인스턴스가 여럿이면 느슨해진다). 한 곳에서 몰아 부르는 요청을 줄이는 과속방지턱이다
const guestHits = new Map<string, RateWindow>();
const userHits = new Map<string, RateWindow>();

function fail(code: MaterialErrorCode) {
  return NextResponse.json<MaterialResponse>(
    { error: code, message: MATERIAL_ERRORS[code] },
    { status: STATUS[code] ?? 400 },
  );
}

/**
 * 내 자료 올리기. multipart로 file(PDF) 또는 url 하나와 for(start | course)를 받는다.
 * - start: 시작 흐름. 세션이 없으면 게스트를 만들고, 과정이 없는 자료로 둔다(과정을 만들 때 붙는다)
 * - course: 진행 중인 내 과정에 더하고, 아직 안 한 레슨에 근거를 붙인다
 */
export async function POST(req: NextRequest) {
  // 본문을 읽기 전에 크기부터 본다(파일 한도 + 폼 여유)
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > FILE_MAX_BYTES + 64 * 1024) return fail("too_big");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("bad_request");
  }
  const mode = form.get("for") === "course" ? "course" : "start";
  const file = form.get("file");
  const url = typeof form.get("url") === "string" ? String(form.get("url")).trim() : "";

  let user = await getSessionUser();
  // 과정에 더하기는 로그인(게스트 세션)과 진행 중 과정이 있어야 한다. 무거운 일 전에 먼저 본다
  if (mode === "course" && !user) return fail("auth");
  // 세션 없이 오면 올릴 때마다 게스트와 자료가 새로 생긴다. 글을 뽑기 전에 횟수부터 본다
  const allowed = user
    ? hitRate(userHits, user.id, Date.now(), { ...UPLOAD_RATE, limit: UPLOAD_RATE.userLimit })
    : hitRate(guestHits, clientKey(req.headers), Date.now(), {
        ...UPLOAD_RATE,
        limit: UPLOAD_RATE.guestLimit,
      });
  if (!allowed) return fail("too_often");

  let extracted: Extracted;
  try {
    if (file instanceof File && file.size > 0) {
      if (file.size > FILE_MAX_BYTES) return fail("too_big");
      if (!looksLikePdf(file.name, file.type)) return fail("not_pdf");
      extracted = await fromPdfFile(file.name, new Uint8Array(await file.arrayBuffer()));
    } else if (url) {
      if (url.length > 2000) return fail("bad_url");
      extracted = await fromLink(url);
    } else {
      return fail("bad_request");
    }
  } catch (e) {
    if (e instanceof MaterialError) return fail(e.code);
    console.error("[material] extract", e);
    return fail("fetch_failed");
  }

  try {
    if (mode === "course") {
      const r = await addCourseMaterial(user!, extracted);
      return NextResponse.json<MaterialResponse>({
        id: r.id,
        title: r.title,
        kind: extracted.kind,
        chars: extracted.chars,
        pages: extracted.pages,
        truncated: extracted.truncated,
        lessons: r.lessons,
      });
    }
    if (!user) {
      const t = form.get("teacher");
      user = await createGuest({ teacher: isTeacher(t) ? t : "온" });
    }
    const m = await saveDraftMaterial(user, extracted);
    return NextResponse.json<MaterialResponse>({
      id: m.id,
      title: m.title,
      kind: extracted.kind,
      chars: m.chars,
      pages: m.pages,
      truncated: m.truncated,
    });
  } catch (e) {
    if (e instanceof MaterialError) return fail(e.code);
    console.error("[material] save", e);
    return NextResponse.json<MaterialResponse>(
      { error: "bad_request", message: "저장하지 못했어요. 잠시 뒤 다시 해 주세요." },
      { status: 500 },
    );
  }
}
