import { TeacherSync } from "./TeacherSync";

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TeacherSync />
      {children}
    </>
  );
}
