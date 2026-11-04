import { redirect } from "next/navigation";
import { Teacher } from "@/components/teacher/Teacher";
import { BackHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import type { TeacherName } from "@/lib/design/types";
import { MATERIALS_PER_COURSE } from "@/lib/domain/material";
import { teacherOf } from "@/lib/server/course";
import { listCourseMaterials } from "@/lib/server/material";
import { AddMaterial } from "./material.client";
import s from "./material.module.css";

export const metadata = { title: "내 자료 · 작심육주" };

const INTRO: Record<TeacherName, string> = {
  온: "가지고 있는 교재나 읽던 글이 있으면 올려 주세요. 아직 안 한 레슨에 근거로 붙이고, 튜터도 그 자료를 보고 물어볼게요.",
  결: "자료를 올리면 남은 레슨에 근거로 붙입니다. 튜터 질문도 그 자료를 기준으로 합니다.",
  새: "갖고 있는 지도를 더 보여 주세요! 남은 레슨 곳곳에 표시해 두고, 튜터 질문에도 써먹을게요.",
};

function kindLabel(kind: string, pages: number | null): string {
  return kind === "pdf" ? `PDF${pages ? ` · ${pages}쪽` : ""}` : "웹 링크";
}

export default async function MaterialPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const st = await listCourseMaterials(user);
  if (!st) redirect("/start/personality");
  const who = teacherOf(user);
  const { course, materials } = st;
  const canAdd = course.status === "active" && materials.length < MATERIALS_PER_COURSE;

  return (
    <main className={s.page}>
      <BackHeader href="/curriculum" title="내 자료" />

      <div className={s.why}>
        <Teacher who={who} size={44} label={`${who} 선생님`} />
        <p>{INTRO[who]}</p>
      </div>

      <section aria-label="이 과정의 내 자료" className={s.list}>
        <h2 className={s.h2}>
          {course.topic} · 내 자료 {materials.length}/{MATERIALS_PER_COURSE}
        </h2>
        {materials.length === 0 ? (
          <p className={s.empty} data-testid="material-empty">
            아직 올린 자료가 없어요.
          </p>
        ) : (
          <ul className={s.items}>
            {materials.map((m) => (
              <li key={m.id} className={s.item} data-testid="material-item">
                <span className={s.itemTitle}>{m.title}</span>
                <span className={s.itemMeta}>
                  {kindLabel(m.kind, m.pages)} · 글자 {m.chars.toLocaleString("ko-KR")}자
                  {m.truncated ? "(앞부분만)" : ""} · 레슨 {m._count.resources}개에 근거
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canAdd ? (
        <AddMaterial who={who} />
      ) : (
        <p className={s.empty}>
          {course.status !== "active"
            ? "끝난 과정에는 자료를 더할 수 없어요."
            : `과정 하나에 자료는 ${MATERIALS_PER_COURSE}개까지예요.`}
        </p>
      )}
    </main>
  );
}
