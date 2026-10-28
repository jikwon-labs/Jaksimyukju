"use client";

import { useEffect } from "react";
import { applyTeacher, useDraft } from "./draft";

/** 초안에 고른 선생님이 있으면 강조색을 맞춘다(새로고침·뒤로 가기 대비) */
export function TeacherSync() {
  const { teacher } = useDraft();
  useEffect(() => {
    if (teacher) applyTeacher(teacher);
  }, [teacher]);
  return null;
}
