"use client";
// 내 자료 올리기 카드. PDF 파일 또는 웹 링크 하나를 POST /api/material로 보낸다.
// 시작 흐름(for=start)과 진행 중 과정의 내 자료 화면(for=course)이 같이 쓴다.
import { useId, useRef, useState } from "react";
import {
  FILE_MAX_BYTES,
  looksLikePdf,
  MATERIAL_ERRORS,
  type MaterialResponse,
} from "@/lib/domain/material";
import type { TeacherName } from "@/lib/design/types";
import s from "./material.module.css";

type Tab = "pdf" | "link";
type Phase = { kind: "idle" } | { kind: "busy" } | { kind: "error"; message: string };

export function MaterialUpload({
  mode,
  teacher,
  onDone,
}: {
  mode: "start" | "course";
  teacher: TeacherName;
  onDone: (
    r: Required<Pick<MaterialResponse, "id" | "title" | "chars">> & MaterialResponse,
  ) => void;
}) {
  const [tab, setTab] = useState<Tab>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const busy = phase.kind === "busy";

  function pick(f: File | null) {
    setPhase({ kind: "idle" });
    if (!f) return setFile(null);
    // 서버도 다시 보지만, 큰 파일은 보내기 전에 바로 알려 준다
    if (f.size > FILE_MAX_BYTES) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return setPhase({ kind: "error", message: MATERIAL_ERRORS.too_big });
    }
    if (!looksLikePdf(f.name, f.type)) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return setPhase({ kind: "error", message: MATERIAL_ERRORS.not_pdf });
    }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData();
    form.set("for", mode);
    form.set("teacher", teacher);
    if (tab === "pdf") {
      if (!file) return setPhase({ kind: "error", message: "PDF 파일을 골라 주세요." });
      form.set("file", file);
    } else {
      if (!url.trim()) return setPhase({ kind: "error", message: "링크 주소를 넣어 주세요." });
      form.set("url", url.trim());
    }
    setPhase({ kind: "busy" });
    try {
      const res = await fetch("/api/material", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as MaterialResponse;
      if (!res.ok || !body.id || !body.title || body.chars === undefined) {
        return setPhase({
          kind: "error",
          message: body.message ?? "올리지 못했어요. 잠시 뒤 다시 해 주세요.",
        });
      }
      setPhase({ kind: "idle" });
      setFile(null);
      setUrl("");
      if (fileRef.current) fileRef.current.value = "";
      onDone({ ...body, id: body.id, title: body.title, chars: body.chars });
    } catch {
      setPhase({ kind: "error", message: "연결이 끊겼어요. 잠시 뒤 다시 해 주세요." });
    }
  }

  return (
    <form
      className={s.card}
      onSubmit={submit}
      aria-label="내 자료 올리기"
      data-testid="material-upload"
    >
      <div role="tablist" aria-label="자료 종류" className={s.tabs}>
        {(["pdf", "link"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={s.tab}
            onClick={() => {
              setTab(t);
              setPhase({ kind: "idle" });
            }}
            data-testid={`material-tab-${t}`}
          >
            {t === "pdf" ? "PDF 파일" : "웹 링크"}
          </button>
        ))}
      </div>

      {tab === "pdf" ? (
        <div className={s.field}>
          <label htmlFor={`${id}-file`} className={s.fileLabel}>
            <span className={s.fileName}>{file ? file.name : "PDF 파일 고르기"}</span>
            <span className={s.hint}>
              {file
                ? `${Math.max(1, Math.round(file.size / 1024))}KB`
                : `${FILE_MAX_BYTES / 1024 / 1024}MB까지, 글자가 있는 PDF`}
            </span>
          </label>
          <input
            key="file"
            ref={fileRef}
            id={`${id}-file`}
            type="file"
            accept="application/pdf,.pdf"
            className={s.fileInput}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            disabled={busy}
            data-testid="material-file"
          />
        </div>
      ) : (
        <div className={s.field}>
          <label htmlFor={`${id}-url`} className={s.srOnly}>
            자료 링크 주소
          </label>
          <input
            key="url"
            id={`${id}-url`}
            type="url"
            inputMode="url"
            className={s.input}
            placeholder="https://"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPhase({ kind: "idle" });
            }}
            disabled={busy}
            autoComplete="off"
            maxLength={2000}
            data-testid="material-url"
          />
          <span className={s.hint}>누구나 볼 수 있는 웹 글이나 PDF 링크</span>
        </div>
      )}

      <p className={s.note}>원본 파일은 저장하지 않아요. 글자만 뽑아 과정을 짜는 데 써요.</p>

      {phase.kind === "error" && (
        <p role="alert" className={s.error} data-testid="material-error">
          {phase.message}
        </p>
      )}

      <button
        type="submit"
        className={s.submit}
        disabled={busy}
        aria-busy={busy}
        data-testid="material-submit"
      >
        {busy ? "글자를 읽는 중이에요" : "자료 올리기"}
      </button>
    </form>
  );
}
