"use client";

import { useState } from "react";
import { CERT_SIZE, certificateSvg, type CertificateInput } from "@/lib/domain/certificate";
import s from "./finish.module.css";

/** SVG 수료 카드를 캔버스에 그려 PNG로 내려받는다 */
async function toPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = CERT_SIZE.width;
    canvas.height = CERT_SIZE.height;
    canvas.getContext("2d")?.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SaveCard({ card }: { card: CertificateInput }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  async function save() {
    setState("saving");
    try {
      const png = await toPng(certificateSvg(card));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(png);
      a.download = `작심육주-수료-${card.topic}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setState("saved");
    } catch {
      setState("failed");
    }
  }
  return (
    <button
      type="button"
      className={s.save}
      data-saved={state === "saved" ? "true" : "false"}
      onClick={save}
      disabled={state === "saving"}
      aria-live="polite"
      data-testid="save-card"
    >
      {state === "saved"
        ? "수료 카드를 저장했어요"
        : state === "failed"
          ? "저장하지 못했어요. 다시 눌러 주세요"
          : state === "saving"
            ? "카드를 만드는 중"
            : "수료 카드 저장하기"}
    </button>
  );
}
