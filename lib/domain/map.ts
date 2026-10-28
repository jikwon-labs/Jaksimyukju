// 커리큘럼 지도 좌표 (목업 Curriculum.dc.html renderVals 그대로)
export const MAP_W = 350;
export const MAP_CX = 175;
export const MAP_ROW = 92;
export const MAP_PAD = 24;
export const MAP_OFF = [0, 56, 84, 56, 0, -56, -84, -56];
export const NODE = 64;
export const GOAL_NODE = 76;
export const MAP_CHAR_W = 72;

export interface MapNode {
  cx: number;
  cy: number;
  size: number;
  left: number;
  top: number;
}

export interface MapLayout {
  height: number;
  nodes: MapNode[];
  donePath: string;
  todoPath: string;
  char: { left: number; top: number } | null;
}

export function nodeCenter(i: number): [number, number] {
  return [MAP_CX + MAP_OFF[i % MAP_OFF.length], MAP_PAD + i * MAP_ROW + MAP_ROW / 2];
}

export function curve(pts: [number, number][], from: number, to: number): string {
  if (to < from || from < 0 || to >= pts.length) return "";
  let d = `M${pts[from][0]} ${pts[from][1]}`;
  for (let i = from + 1; i <= to; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    d += ` C${p0[0]} ${p0[1] + MAP_ROW / 2} ${p1[0]} ${p1[1] - MAP_ROW / 2} ${p1[0]} ${p1[1]}`;
  }
  return d;
}

/**
 * kinds: 칸 종류 목록(goal은 큰 칸). lastDone: 완료 또는 오늘인 마지막 칸(-1이면 없음).
 * todayIdx: 오늘 칸(-1이면 없음). 선생님은 오늘 칸 옆에 선다: 오프셋이 0 이상이면 왼쪽, 음수면 오른쪽.
 */
export function mapLayout(kinds: ("lesson" | "quiz" | "goal")[], lastDone: number, todayIdx: number): MapLayout {
  const pts = kinds.map((_, i) => nodeCenter(i));
  const nodes = kinds.map((k, i) => {
    const size = k === "goal" ? GOAL_NODE : NODE;
    const [cx, cy] = pts[i];
    return { cx, cy, size, left: cx - size / 2, top: cy - size / 2 };
  });
  let char: MapLayout["char"] = null;
  if (todayIdx >= 0) {
    const [cx, cy] = pts[todayIdx];
    const right = MAP_OFF[todayIdx % MAP_OFF.length] < 0;
    char = { left: right ? cx + 52 : cx - 52 - MAP_CHAR_W, top: cy - 36 };
  }
  return {
    height: MAP_PAD * 2 + kinds.length * MAP_ROW,
    nodes,
    donePath: curve(pts, 0, lastDone),
    todoPath: curve(pts, Math.max(lastDone, 0), kinds.length - 1),
    char,
  };
}

/** 선택한 칸 설명 카드의 top */
export function popoverTop(node: MapNode): number {
  return node.cy + node.size / 2 + 14;
}
