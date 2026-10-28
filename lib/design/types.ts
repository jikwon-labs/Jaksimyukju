export type TeacherName = "온" | "결" | "새";
export type FaceState = "base" | "listen" | "think" | "joy" | "sad";

export interface Face {
  body: string;
  deep: string;
  cheek: string;
  brow: string;
  eye: string;
  shine: string;
  lid: string;
  mouth: string;
  mouthFill: string;
  tear: string;
  move: string;
  pose: string;
  dots: string;
}

export type FaceTable = Record<TeacherName, Record<FaceState, Face>>;
