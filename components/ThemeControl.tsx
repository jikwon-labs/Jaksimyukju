"use client";

import { useState } from "react";
import { THEME_COOKIE, THEME_LABELS, type ThemeMode } from "@/lib/theme";
import s from "./ThemeControl.module.css";

const MODES: ThemeMode[] = ["system", "light", "dark"];

export function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeControl({
  initial,
  onChange,
}: {
  initial: ThemeMode;
  onChange?: (mode: ThemeMode) => void;
}) {
  const [mode, setMode] = useState<ThemeMode>(initial);
  return (
    <div role="radiogroup" aria-label="테마" className={s.group}>
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          className={s.option}
          onClick={() => {
            setMode(m);
            applyTheme(m);
            onChange?.(m);
          }}
        >
          {THEME_LABELS[m]}
        </button>
      ))}
    </div>
  );
}
