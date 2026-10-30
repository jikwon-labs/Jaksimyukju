"use client";

import type { ComponentProps } from "react";
import { openInApp } from "@/lib/external";

/** 바깥 링크. 웹은 새 탭, 앱 껍데기 안에서는 인앱 브라우저(lib/external.ts) */
export function ExternalLink({ href, onClick, ...rest }: Omit<ComponentProps<"a">, "target" | "rel"> & { href: string }) {
  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && openInApp(href)) e.preventDefault();
      }}
    />
  );
}
