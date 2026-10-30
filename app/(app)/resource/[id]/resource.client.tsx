"use client";

import { ExternalLink } from "@/components/ExternalLink";
import { ReportButton } from "@/components/lesson/ReportButton";
import { useState } from "react";
import s from "./resource.module.css";

export function ResourceButtons({ url, resourceId }: { url: string; resourceId: string }) {
  const [read, setRead] = useState(false);
  return (
    <>
      <div className={s.buttons}>
        <button
          type="button"
          aria-pressed={read}
          className={s.read}
          data-read={read ? "true" : "false"}
          onClick={() => setRead(!read)}
        >
          {read ? "다 읽었어요" : "읽음 표시"}
        </button>
        <ExternalLink href={url} className={s.open} data-testid="resource-open">
          원문 열기
        </ExternalLink>
      </div>
      <div className={s.reportRow}>
        <ReportButton resourceId={resourceId} label="자료가 이상해요" reasons={["자료 링크가 이상해요", "설명이 틀린 것 같아요"]} />
      </div>
    </>
  );
}
