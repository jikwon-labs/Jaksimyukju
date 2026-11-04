"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MaterialUpload } from "@/components/material/MaterialUpload";
import type { TeacherName } from "@/lib/design/types";
import s from "./material.module.css";

export function AddMaterial({ who }: { who: TeacherName }) {
  const router = useRouter();
  const [done, setDone] = useState<string | null>(null);
  return (
    <section aria-label="자료 더하기" className={s.add}>
      <h2 className={s.h2}>자료 더하기</h2>
      {done && (
        <p role="status" className={s.done} data-testid="material-done">
          {done}
        </p>
      )}
      <MaterialUpload
        mode="course"
        teacher={who}
        onDone={(r) => {
          setDone(
            r.lessons
              ? `"${r.title}" 자료를 남은 레슨 ${r.lessons}개에 근거로 붙였어요.`
              : `"${r.title}" 자료를 저장했어요. 남은 레슨과 겹치는 문장은 아직 못 찾았지만, 튜터가 함께 봐요.`,
          );
          router.refresh();
        }}
      />
    </section>
  );
}
