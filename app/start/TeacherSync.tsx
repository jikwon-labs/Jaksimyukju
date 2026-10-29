"use client";

import { useEffect } from "react";
import type { TeacherName } from "@/lib/design/types";
import { applyTeacher, TeacherFallbackContext, useDraft } from "./draft";

/** 초안에 고른 선생님이 있으면 강조색을 맞춘다(새로고침·뒤로 가기 대비). fallback은 쿠키의 선생님 */
export function TeacherSync({ fallback, children }: { fallback: TeacherName; children: React.ReactNode }) {
  const { teacher } = useDraft();
  useEffect(() => {
    if (teacher) applyTeacher(teacher);
  }, [teacher]);
  return <TeacherFallbackContext value={fallback}>{children}</TeacherFallbackContext>;
}
