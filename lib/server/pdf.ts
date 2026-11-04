// PDF에서 글자만 뽑는다. 서버(Route Handler)와 단위 테스트에서 쓴다(server-only를 붙이지 않는다).
import { isPdfBytes, joinWrappedLines, MaterialError } from "@/lib/domain/material";

/** PDF 글 뽑기. unpdf는 pdf.js 서버리스 빌드라 Vercel 함수에서 네이티브 모듈 없이 돈다 */
export async function extractPdf(
  bytes: Uint8Array,
): Promise<{ text: string; pages: number; title: string }> {
  if (!isPdfBytes(bytes)) throw new MaterialError("not_pdf");
  const { extractText, getDocumentProxy, getMeta } = await import("unpdf");
  let doc;
  try {
    doc = await getDocumentProxy(bytes);
  } catch {
    throw new MaterialError("pdf_broken");
  }
  try {
    const { totalPages, text } = await extractText(doc, { mergePages: false });
    const meta = await getMeta(doc).catch(() => null);
    const title = typeof meta?.info?.Title === "string" ? meta.info.Title.trim() : "";
    return { text: text.map(joinWrappedLines).join("\n\n"), pages: totalPages, title };
  } catch {
    throw new MaterialError("pdf_broken");
  } finally {
    await doc.loadingTask.destroy().catch(() => {});
  }
}
