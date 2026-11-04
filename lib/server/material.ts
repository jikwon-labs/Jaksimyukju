import "server-only";
// 내 자료: PDF·링크에서 글을 뽑아 저장하고, 과정의 레슨에 근거로 붙인다. 원본 파일은 저장하지 않는다.
import type { User } from "@prisma/client";
import {
  htmlToText,
  isPdfBytes,
  type MaterialKind,
  MaterialError,
  materialResource,
  MATERIALS_PER_COURSE,
  prepareText,
  titleFromFileName,
} from "@/lib/domain/material";
import { prisma } from "@/lib/prisma";
import { fetchPublicLink } from "./fetch-link";
import { extractPdf } from "./pdf";
import { lessonBody } from "./course";
import { lessonQuery } from "./write-course";

export interface Extracted {
  kind: MaterialKind;
  title: string;
  source: string;
  text: string;
  chars: number;
  pages: number | null;
  truncated: boolean;
}

export async function fromPdfFile(name: string, bytes: Uint8Array): Promise<Extracted> {
  const pdf = await extractPdf(bytes);
  const prepared = prepareText(pdf.text);
  return {
    kind: "pdf",
    title: pdf.title && pdf.title.length <= 80 ? pdf.title : titleFromFileName(name),
    source: name.slice(0, 200),
    pages: pdf.pages,
    ...prepared,
  };
}

export async function fromLink(raw: string): Promise<Extracted> {
  const got = await fetchPublicLink(raw);
  const type = got.contentType.toLowerCase();
  const host = new URL(got.url).hostname.replace(/^www\./, "");
  if (type.includes("application/pdf") || (!type && isPdfBytes(got.body))) {
    const pdf = await extractPdf(got.body);
    return {
      kind: "link",
      title: pdf.title || host,
      source: got.url,
      pages: pdf.pages,
      ...prepareText(pdf.text),
    };
  }
  if (
    !type.includes("text/html") &&
    !type.includes("application/xhtml") &&
    !type.includes("text/plain")
  ) {
    throw new MaterialError("unsupported");
  }
  const charset = /charset=([^;]+)/.exec(type)?.[1]?.trim().replace(/["']/g, "") || "utf-8";
  let decoded: string;
  try {
    decoded = new TextDecoder(charset).decode(got.body);
  } catch {
    decoded = new TextDecoder("utf-8").decode(got.body);
  }
  const page = type.includes("text/plain") ? { title: "", text: decoded } : htmlToText(decoded);
  return {
    kind: "link",
    title: page.title || host,
    source: got.url,
    pages: null,
    ...prepareText(page.text),
  };
}

/** 시작 흐름에서 올린 자료(아직 과정이 없다). 과정이 없는 옛 자료는 지워 하나만 남긴다 */
export async function saveDraftMaterial(user: Pick<User, "id">, x: Extracted) {
  return prisma.$transaction(async (tx) => {
    await tx.material.deleteMany({ where: { userId: user.id, courseId: null } });
    return tx.material.create({ data: { ...x, userId: user.id } });
  });
}

/**
 * 진행 중 과정에 자료를 더한다. 아직 안 한 레슨마다 맞닿은 문장이 있으면 근거로 붙인다.
 * 내 과정이 아니면 no_course
 */
export async function addCourseMaterial(
  user: Pick<User, "id">,
  x: Extracted,
): Promise<{ id: string; title: string; lessons: number }> {
  const course = await prisma.course.findFirst({
    where: { userId: user.id, status: "active" },
    orderBy: { createdAt: "desc" },
    include: { lessons: { where: { status: "todo" }, orderBy: { order: "asc" } } },
  });
  if (!course) throw new MaterialError("no_course");
  return prisma.$transaction(async (tx) => {
    const count = await tx.material.count({ where: { courseId: course.id } });
    if (count >= MATERIALS_PER_COURSE) throw new MaterialError("too_many");
    const m = await tx.material.create({ data: { ...x, userId: user.id, courseId: course.id } });
    const rows = course.lessons
      .map((l) => {
        const r = materialResource(m, m.text, lessonQuery(l.title, lessonBody(l.body)));
        return r ? { ...r, lessonId: l.id, checkedAt: new Date() } : null;
      })
      .filter((r) => r !== null);
    if (rows.length) await tx.resource.createMany({ data: rows });
    return { id: m.id, title: m.title, lessons: rows.length };
  });
}

/**
 * 시작 흐름에서 올리고 아직 어느 과정에도 붙지 않은 내 자료. 이미 과정에 붙은 자료(지난 시작 흐름의 초안이
 * 브라우저에 남은 경우 등)는 돌려주지 않아, 새 과정이 옛 과정의 자료를 빼앗아 가지 않는다
 */
export async function getDraftMaterial(user: Pick<User, "id">, id: string) {
  return prisma.material.findFirst({ where: { id, userId: user.id, courseId: null } });
}

/** 내 자료만 연다(소유자 검사) */
export async function getOwnMaterial(user: Pick<User, "id">, id: string) {
  return prisma.material.findFirst({ where: { id, userId: user.id } });
}

/** 지금 과정에 붙은 내 자료 목록(글 본문은 빼고) */
export async function listCourseMaterials(user: Pick<User, "id">) {
  const course = await prisma.course.findFirst({
    where: { userId: user.id, status: { in: ["active", "finished"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, topic: true },
  });
  if (!course) return null;
  const materials = await prisma.material.findMany({
    where: { courseId: course.id, userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      kind: true,
      title: true,
      source: true,
      chars: true,
      pages: true,
      truncated: true,
      createdAt: true,
      _count: { select: { resources: true } },
    },
  });
  return { course, materials };
}

/** 튜터가 볼 이 과정의 내 자료(소유자 기준) */
export async function courseMaterialTexts(userId: string, courseId: string) {
  return prisma.material.findMany({
    where: { courseId, userId },
    orderBy: { createdAt: "asc" },
    select: { title: true, text: true },
  });
}
