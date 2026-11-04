import { describe, expect, it } from "vitest";
import { MaterialError, prepareText } from "@/lib/domain/material";
import { extractPdf } from "./pdf";

/** 글자 한 줄씩 그린 작은 PDF를 만든다(xref 오프셋까지 맞춘다) */
function makePdf(lines: string[]): Uint8Array {
  const content = lines.length
    ? `BT /F1 12 Tf 72 720 Td ${lines.map((l, i) => `${i ? "0 -16 Td " : ""}(${l.replace(/[()\\]/g, "\\$&")}) Tj`).join(" ")} ET`
    : "";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

describe("extractPdf", () => {
  it("글자가 있는 PDF에서 글을 뽑는다", async () => {
    const pdf = await extractPdf(
      makePdf([
        "Cash flow statement shows the money that really came in.",
        "Depreciation is a cost but no cash leaves the company.",
      ]),
    );
    expect(pdf.pages).toBe(1);
    expect(pdf.text).toContain("Cash flow statement");
    expect(pdf.text).toContain("Depreciation");
    expect(prepareText(pdf.text).chars).toBeGreaterThan(80);
  });

  it("글자가 없는 PDF(스캔본)는 no_text가 된다", async () => {
    const pdf = await extractPdf(makePdf([]));
    expect(() => prepareText(pdf.text)).toThrow(MaterialError);
  });

  it("PDF가 아니면 not_pdf, 깨진 PDF는 pdf_broken", async () => {
    await expect(extractPdf(new TextEncoder().encode("hello"))).rejects.toMatchObject({
      code: "not_pdf",
    });
    await expect(extractPdf(new TextEncoder().encode("%PDF-1.4\ngarbage"))).rejects.toMatchObject({
      code: "pdf_broken",
    });
  });
});
