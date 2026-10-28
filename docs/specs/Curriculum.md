# Curriculum (커리큘럼) — 학습 지도 / 목록

Source: `mockup/Curriculum.dc.html` (dark variant `CurriculumDark.dc.html` = same component with `theme="다크"`).
Frame 390 x 844, `position: relative; overflow: hidden; background: p.bg; color: p.ink; font-family: 'Noto Sans KR', system-ui, sans-serif`.
No Jua on this screen. Tab bar is the shared bottom nav with "커리큘럼" active.

Note: this file's local palette has no `good/goodBg`; it defines
`green = dark ? '#7FD9AC' : '#1F6B42'`, `greenBg = dark ? 'rgba(76,195,138,0.18)' : '#E2F5EA'` (identical to `p.good` / `p.goodBg` in common.py).

## 1. Layout (top to bottom)

**Scroll area**: `position: absolute; top 0; left 0; right 0; bottom 76px; overflow-y: auto; padding 20px 20px 32px 20px; flex column; gap 14px`.

### 1.1 Header (height 44, flex, space-between, center)
- `h1` "커리큘럼" — 22px / 700 / letter-spacing -0.4px.
- View toggle `role=group aria-label="보기 방식"`: padding 3px, radius 14, bg `p.surface`, border `p.cardBorder`.
  - Two buttons "지도" / "목록": height 36, padding 0 14px, no border, radius 11, 13px / 700.
  - Selected: bg `a.btnBg`, ink `a.btnInk`. Unselected: transparent, ink `p.sub`. `aria-pressed`.

### 1.2 Course progress card `aria-label="진행 중인 과정"`
bg `p.surface`, border `p.cardBorder`, radius 20, padding 14px 16px, column gap 8.
- Row (baseline, space-between, gap 8): "재무제표 읽기" 17px/700/-0.3px; right "6주 · 월–금 · 하루 10분" 12px `p.sub`.
- Progress bar (`role=progressbar` min 0 max 30 now 8, aria-label "레슨 진행률 8 / 30"): height 8, radius 4, track `p.future`; fill width 27%, `a.btnBg`.
- Row (space-between, 12px): left "레슨 8 / 30 · 목적지까지 22칸" `p.sub`; right "27%" 700 `a.text`.

### 1.3 Map view (when `view === 'map'`, default) `aria-label="학습 지도"`, column gap 12
For each week `w` (column):

**Week banner** (button, `aria-expanded=w.open`, click `w.toggle`):
width 100%, flex center gap 12, padding 12px 16px, min-height 64, radius 20, text-left;
border `w.bannerBorder`, bg `w.bannerBg`, ink `w.bannerInk`, box-shadow `w.bannerShadow`.
- Left column (gap 2): kicker `{n}주차 · {state}` 12px/700 opacity .85; title 16px/700/-0.3px.
- Right: `w.meta` 12px/500 opacity .85, flex none.

| week status | state word | bannerBg | bannerInk | border (dark only) | shadow |
|---|---|---|---|---|---|
| done | 완료 | greenBg | green | none | none |
| current | 진행 중 | a.btnBg | a.btnInk | none | `0 4px 0 ` + (dark ? rgba(t.body,.45) : rgba(t.deep,.55)) |
| todo | 잠김 | p.surface | p.sub | `1px solid #26262D` in dark, else none | none |

**Week map canvas** (only if `w.open`): `position: relative; width 350px; height {h}px`.
- SVG 350 x h, `viewBox="0 0 350 h"`, absolute at 0,0, two paths, both `fill none; stroke-width 6; stroke-linecap round; stroke-dasharray "1 14"` (dotted road):
  1. `todoPath` stroke `p.line` (drawn first, underneath)
  2. `donePath` stroke `w.trail` (done week: dark `#7FD9AC` / light `#4CC38A`; else `a.text`)
- Nodes (absolute box at left/top, size 64, or 76 for goal):
  - Pulse ring `span.mp-pulse` inset 0, circle, `border: 3px solid a.text`, displayed only for `today`.
  - Button `.mp-node`, inset 0, circle, no border, bg/shadow per state, centered icon SVG (24 viewBox, stroke `n.ink`, stroke-width 2.6, round caps/joins); icon size 28 (goal 34). `aria-label`, `aria-expanded=selected`.
  - "시작" bubble `span.mp-bob`: absolute, left 50%, top -38px, margin-left -34px, 68 x 30, radius 10, bg `p.surface`, `border: 2px solid a.text`, ink `a.text`, 13px/700, flex centered. Shown only on today node when it is not selected.
- Character (only if the week has a today node): 72 x 66 SVG, absolute at `charLeft/charTop`, `overflow: visible`, aria-label "{t.name} 선생님이 오늘 칸 옆에서 기다려요".
- Popover card (only in the week containing the selected node): `role=dialog`, absolute left 20 right 20, top `popTop`, z-index 2, radius 20, padding 16, shadow `0 12px 32px rgba(0,0,0,0.18)`, column gap 6, bg `sel.bg`, ink `sel.ink`.
  - kicker 12px/700 opacity .8; title 16px/23px/700; meta 13px/19px opacity .85;
  - CTA `<a href=sel.href>`: margin-top 6, height 46, radius 14, bg `sel.btnBg`, ink `sel.btnInk`, 15px/700, flex centered, hidden (`display:none`) when no CTA.

**Destination flag** (after all weeks) `<a href="Finish.dc.html" aria-label="목적지: 과정을 마치면 도착해요">`, column center gap 6, padding 8px 0 4px 0, ink `p.ink`:
- Circle 72 x 72, bg `p.surface`, `border: 3px dashed p.line`, with flag icon 30px stroke `p.sub` width 2.2 (`M5 21V4` + `M5 4h11l-2 4 2 4H5`).
- "목적지" 14px/700.
- "내 회사와 관심 회사의 재무제표를<br>혼자 읽고 한 장으로 요약하기" 12px/18px `p.sub` centered.

### 1.4 List view (when `view === 'list'`), column gap 10
Each week card: bg `p.surface`, border `w.border`, radius 20, overflow hidden.
- Header button (`aria-expanded`): flex center gap 12, padding 14px 16px, min-height 64, transparent, ink `p.ink`.
  - Badge 36 x 36 radius 12, 13px/700 text `{n}주`, bg/ink `badgeBg/badgeInk`.
  - Title 15px/700; meta 12px `p.sub` (gap 2).
  - Chevron 20px stroke `p.sub` (`M6 9l6 6 6-6`), `transform: rotate(180deg)` when open.
- Body when open: padding 0 16px 16px, column gap 4.
  - If week has no days (`locked`): note box 13px/19px `p.sub`, bg `p.bg`, radius 14, padding 12px 14px:
    "이전 주차를 마치면 레슨이 열려요. 진도에 맞춰 선생님이 내용을 다듬어요."
  - Day rows: flex center gap 12, padding 10px 4px, `border-top: 1px solid p.line`.
    - day letter width 20, 12px `p.sub`
    - status circle 22 x 22 radius 11, border `d.ring`, bg `d.fill`, check icon 12px stroke `d.check` width 3.5
    - title 14px/20px, weight `d.weight`, ink `d.ink`
    - optional tag pill 11px/700 radius 999 padding 3px 8px, bg `d.tagBg`, ink `d.tagInk`

| week status | border | badgeBg | badgeInk |
|---|---|---|---|
| current | `2px solid a.text` | a.btnBg | a.btnInk |
| done | dark `1px solid #26262D` / light `2px solid transparent` | greenBg | green |
| todo | same as done | p.future | p.sub |

### 1.5 Bottom tab bar
`nav aria-label="하단 탭"`: absolute bottom 0, height 76, padding 8px 12px 16px 12px, bg `p.tab`, `border-top: 1px solid p.line`, 4-column grid. Each item column, gap 4, 11.5px, icon 24px (stroke 1.8; active 2.0).
- "오늘" → `Main.dc.html` (ink `p.sub`)
- "커리큘럼" → `Curriculum.dc.html`, `aria-current="page"`, ink `a.text`, 700
- "그룹" → `Group.dc.html`
- "내 정보" → `Profile.dc.html`

## 2. Copy (verbatim)

Weeks (data):

| n | title | status | meta (banner/list) |
|---|---|---|---|
| 1 | 손익계산서 기본 | done | 레슨 5/5 · 퀴즈 80점 |
| 2 | 현금흐름표 이해 | current | 레슨 3/5 |
| 3 | 재무상태표로 체력 보기 | todo | 레슨 5개 |
| 4 | 비율로 회사 비교하기 | todo | 레슨 5개 (map banner: "3주차 뒤 열림") |
| 5 | 현금흐름으로 위험 읽기 | todo | 레슨 5개 (map banner: "4주차 뒤 열림") |
| 6 | 실제 회사 분석해 보기 | todo | 레슨 4개 · 최종 (map banner: "5주차 뒤 열림") |

Week 1 steps: 월 매출과 비용의 기본 (done) · 화 영업이익과 순이익 (done) · 수 원가와 판관비 (done) · 목 손익계산서 한 장 읽기 (done) · 주차 퀴즈 3문제 (done, 80점) · 금 마일스톤: 관심 회사 손익 요약 (done)

Week 2 steps: 월 현금은 어디서 들어오나 (done) · 화 영업·투자·재무 활동 나누기 (done) · 수 감가상각이 현금에 미치는 영향 (five) · 목 현금흐름표는 왜 손익계산서와 다를까 (today) · 주차 퀴즈 3문제 (todo) · 금 마일스톤: 내 회사 현금흐름 한 장 요약 (todo)

Weeks 3-6 steps (all `lock`): "레슨 1" ... "레슨 N" (N = 4,4,4,3), then "주차 퀴즈 3문제", then "마일스톤".

Popover strings:
- kicker: `{n}주차 {d}요일 {kindWord} · {stateWord}` (`{d}요일 ` omitted when no day). kindWord: 레슨 / 퀴즈 / 마일스톤. stateWord: done 완료 · five 5분 버전으로 완료 · today 오늘 · todo 열림 · lock 잠김.
- meta:
  - lock: "앞 칸을 마치면 열려요. 진도에 맞춰 선생님이 내용을 다듬어요."
  - quiz done: "점수 {note} · 틀린 문제만 다시 풀 수 있어요" (e.g. "점수 80점 · ...")
  - quiz not done: "이번 주 레슨으로 3문제 · 약 3분"
  - goal: "선생님이 기준 3개로 피드백해요"
  - lesson five: "5분 버전으로 끝냈어요 · 전체 버전 약 10분"
  - lesson other: "약 10분 · 설명과 튜터 질문 3개"
- CTA: lock → none; done/five → "다시 보기"; quiz → "퀴즈 풀기"; goal → "결과물 제출하기"; lesson → "학습 시작".
- Node aria-label: `{n}주차 {kindWord} {title}, {stateWord}`.
- Today bubble: "시작".

List tags: today → "오늘"; five → "5분 버전"; done step whose title starts with "마일스톤" → "제출".

No per-teacher copy differences on this screen (only colors and character).

## 3. State & logic

State: `view` ('map' default | 'list'), `openW` (map: week-open map, default `{1:false, 2:true, 3:true, 4:false, 5:false, 6:false}`), `sel` (selected node id `"{week}-{index}"`, default ''), `openN` (list: single open week, default 2; 0 = none).

Rules:
- **Map cell states** (5 values): `done`, `five` (completed via 5분 버전, counts as done), `today`, `todo` (open/upcoming), `lock`. Kinds: `lesson`, `quiz`, `goal` (milestone).
- **Next week only**: weeks with status todo and `n > 3` are "far": banner shows `{n-1}주차 뒤 열림`, cannot be expanded (toggle no-op). Week 3 (the immediate next week) can expand and shows locked cells. (Hard-coded `w.n > 3`; generalize as `n > currentWeek + 1`.)
- Tapping a node toggles its selection (one selection globally); the popover renders in that node's week under the node (`popTop = cy + size/2 + 14`). Popover is "hot" (accent filled) for today/todo nodes.
- Popover hrefs: quiz → `Quiz.dc.html`, goal → `Milestone.dc.html`, lesson → `Lesson.dc.html`.
- Character sits beside the today node: on the left of it if offset >= 0, on the right if offset < 0.
- Road: `donePath` from first node to last done/today node; `todoPath` from that node to the end.
- List view: only weeks 1 and 2 have day rows (quiz steps filtered out); weeks 3-6 show the locked note. Clicking a header opens it exclusively (clicking the open one closes all).

Example computed (week 2, 6 steps): h = 600; centers cy = 70,162,254,346,438,530; cx = 175,231,259,231,175,119. Today idx 3 → char left 107px, top 310px.

### renderVals (verbatim, map + list part)

```js
    var green = p.dark ? '#7FD9AC' : '#1F6B42', greenBg = p.dark ? 'rgba(76,195,138,0.18)' : '#E2F5EA';
    var st = this.state || {};
    var self = this;
    var view = st.view || 'map';

    // 날짜별 상태: done 완료, five 5분 버전으로 완료, today 오늘, todo 예정, lock 잠김
    var day = function (d, title, s) {
      var done = s === 'done' || s === 'five';
      return {
        day: d, title: title,
        ring: done ? 'none' : (s === 'today' ? '2px solid ' + a.text : '2px solid ' + p.line),
        fill: done ? a.btnBg : 'transparent',
        check: done ? a.btnInk : 'transparent',
        weight: s === 'today' ? 700 : 400,
        ink: s === 'todo' ? p.sub : p.ink,
        tag: s === 'today' ? '오늘' : (s === 'five' ? '5분 버전' : (title.indexOf('마일스톤') === 0 && s === 'done' ? '제출' : '')),
        tagBg: s === 'today' ? a.btnBg : (s === 'five' ? p.future : greenBg),
        tagInk: s === 'today' ? a.btnInk : (s === 'five' ? p.sub : green)
      };
    };
    // 지도 칸: kind lesson / quiz / goal(마일스톤)
    var L = function (d, title, s) { return { kind: 'lesson', d: d, title: title, s: s }; };
    var Q = function (s, note) { return { kind: 'quiz', d: '', title: '주차 퀴즈 3문제', s: s, note: note }; };
    var G = function (d, title, s) { return { kind: 'goal', d: d, title: title, s: s }; };
    var lockedWeek = function (lessons) {
      var out = [];
      for (var i = 0; i < lessons; i++) out.push(L('', '레슨 ' + (i + 1), 'lock'));
      out.push(Q('lock'));
      out.push(G('', '마일스톤', 'lock'));
      return out;
    };
    var data = [
      { n: 1, title: '손익계산서 기본', status: 'done', meta: '레슨 5/5 · 퀴즈 80점', steps: [
        L('월', '매출과 비용의 기본', 'done'), L('화', '영업이익과 순이익', 'done'), L('수', '원가와 판관비', 'done'),
        L('목', '손익계산서 한 장 읽기', 'done'), Q('done', '80점'), G('금', '마일스톤: 관심 회사 손익 요약', 'done')] },
      { n: 2, title: '현금흐름표 이해', status: 'current', meta: '레슨 3/5', steps: [
        L('월', '현금은 어디서 들어오나', 'done'), L('화', '영업·투자·재무 활동 나누기', 'done'), L('수', '감가상각이 현금에 미치는 영향', 'five'),
        L('목', '현금흐름표는 왜 손익계산서와 다를까', 'today'), Q('todo'), G('금', '마일스톤: 내 회사 현금흐름 한 장 요약', 'todo')] },
      { n: 3, title: '재무상태표로 체력 보기', status: 'todo', meta: '레슨 5개', steps: lockedWeek(4) },
      { n: 4, title: '비율로 회사 비교하기', status: 'todo', meta: '레슨 5개', steps: lockedWeek(4) },
      { n: 5, title: '현금흐름으로 위험 읽기', status: 'todo', meta: '레슨 5개', steps: lockedWeek(4) },
      { n: 6, title: '실제 회사 분석해 보기', status: 'todo', meta: '레슨 4개 · 최종', steps: lockedWeek(3) }
    ];

    var ICON = {
      check: 'M5 12.5l4.5 4.5L19 7.5',
      book: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z',
      star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
      quiz: 'M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3 M12 18v.2',
      flag: 'M6 21V4 M6 4h11l-2 4 2 4H6',
      lock: 'M8 11V8a4 4 0 0 1 8 0v3 M6 11h12v9H6z'
    };
    // 지그재그 길: 칸 중심이 좌우로 흔들리며 내려간다
    var W = 350, CX = 175, ROW = 92, PAD = 24, OFF = [0, 56, 84, 56, 0, -56, -84, -56];
    var openW = st.openW || { 1: false, 2: true, 3: true, 4: false, 5: false, 6: false };
    var sel = st.sel || '';
    var selInfo = null;
    var popTop = '0px', popWeek = 0;

    var map = data.map(function (w) {
      var pts = [];
      var lastDone = -1;
      var nodes = w.steps.map(function (s, i) {
        var size = s.kind === 'goal' ? 76 : 64;
        var cx = CX + OFF[i % OFF.length], cy = PAD + i * ROW + ROW / 2;
        pts.push([cx, cy]);
        var done = s.s === 'done' || s.s === 'five';
        if (done || s.s === 'today') lastDone = i;
        var id = w.n + '-' + i;
        var icon = s.s === 'lock' ? 'lock' : (done ? 'check' : (s.s === 'today' ? 'star' : (s.kind === 'quiz' ? 'quiz' : (s.kind === 'goal' ? 'flag' : 'book'))));
        if (s.kind === 'goal' && s.s !== 'lock') icon = 'flag';
        var bg, shadow, ink;
        if (done || s.s === 'today') { bg = a.btnBg; ink = a.btnInk; shadow = '0 6px 0 ' + (p.dark ? rgba(t.body, 0.45) : rgba(t.deep, 0.55)); }
        else if (s.s === 'todo') { bg = a.tint; ink = a.text; shadow = '0 6px 0 ' + (p.dark ? rgba(t.body, 0.25) : rgba(t.deep, 0.22)); }
        else { bg = p.future; ink = p.sub; shadow = '0 6px 0 ' + p.line; }
        if (s.kind === 'goal' && done) { bg = p.dark ? '#7FD9AC' : '#1F7A4A'; ink = p.dark ? '#111114' : '#FFFFFF'; shadow = '0 6px 0 ' + (p.dark ? 'rgba(127,217,172,0.4)' : '#15563A'); }
        var stateWord = { done: '완료', five: '5분 버전으로 완료', today: '오늘', todo: '열림', lock: '잠김' }[s.s];
        var kindWord = { lesson: '레슨', quiz: '퀴즈', goal: '마일스톤' }[s.kind];
        if (sel === id) {
          var href = s.kind === 'quiz' ? 'Quiz.dc.html' : (s.kind === 'goal' ? 'Milestone.dc.html' : 'Lesson.dc.html');
          var cta = s.s === 'lock' ? '' : (done ? '다시 보기' : (s.kind === 'quiz' ? '퀴즈 풀기' : (s.kind === 'goal' ? '결과물 제출하기' : '학습 시작')));
          var meta = s.s === 'lock' ? '앞 칸을 마치면 열려요. 진도에 맞춰 선생님이 내용을 다듬어요.'
            : (s.kind === 'quiz' ? (done ? '점수 ' + s.note + ' · 틀린 문제만 다시 풀 수 있어요' : '이번 주 레슨으로 3문제 · 약 3분')
            : (s.kind === 'goal' ? '선생님이 기준 3개로 피드백해요' : (s.s === 'five' ? '5분 버전으로 끝냈어요 · 전체 버전 약 10분' : '약 10분 · 설명과 튜터 질문 3개')));
          var hot = s.s === 'today' || s.s === 'todo';
          selInfo = {
            kicker: w.n + '주차 ' + (s.d ? s.d + '요일 ' : '') + kindWord + ' · ' + stateWord,
            title: s.title, meta: meta, href: href, cta: cta, showBtn: cta ? 'flex' : 'none',
            bg: hot ? a.btnBg : p.surface, ink: hot ? a.btnInk : p.ink,
            btnBg: hot ? (p.dark ? '#111114' : '#FFFFFF') : a.btnBg, btnInk: hot ? a.text : a.btnInk
          };
          popTop = (cy + size / 2 + 14) + 'px';
          popWeek = w.n;
        }
        return {
          left: (cx - size / 2) + 'px', top: (cy - size / 2) + 'px', size: size + 'px', icon: s.kind === 'goal' ? 34 : 28,
          bg: bg, ink: ink, shadow: shadow, path: ICON[icon],
          pulse: s.s === 'today' ? 'block' : 'none', bubble: s.s === 'today' && sel !== id ? 'flex' : 'none',
          selected: sel === id,
          label: w.n + '주차 ' + kindWord + ' ' + s.title + ', ' + stateWord,
          pick: function () { self.setState({ sel: sel === id ? '' : id }); }
        };
      });
      var curve = function (from, to) {
        if (to < from) return '';
        var d = 'M' + pts[from][0] + ' ' + pts[from][1];
        for (var i = from + 1; i <= to; i++) {
          var p0 = pts[i - 1], p1 = pts[i];
          d += ' C' + p0[0] + ' ' + (p0[1] + ROW / 2) + ' ' + p1[0] + ' ' + (p1[1] - ROW / 2) + ' ' + p1[0] + ' ' + p1[1];
        }
        return d;
      };
      var h = PAD * 2 + w.steps.length * ROW;
      var todayIdx = -1;
      w.steps.forEach(function (s, i) { if (s.s === 'today') todayIdx = i; });
      var charLeft = '0px', charTop = '0px';
      if (todayIdx >= 0) {
        var c = pts[todayIdx], right = OFF[todayIdx % OFF.length] < 0;
        charLeft = (right ? c[0] + 52 : c[0] - 52 - 72) + 'px';
        charTop = (c[1] - 36) + 'px';
      }
      var cur = w.status === 'current', fin = w.status === 'done';
      // 바로 다음 주차까지만 칸을 보여 주고, 그 뒤는 배너만 둔다
      var far = w.status === 'todo' && w.n > 3;
      var isOpen = !far && !!openW[w.n];
      return {
        n: w.n, title: w.title, meta: far ? (w.n - 1) + '주차 뒤 열림' : w.meta, nodes: nodes, open: isOpen,
        state: fin ? '완료' : (cur ? '진행 중' : '잠김'),
        bannerBg: cur ? a.btnBg : (fin ? greenBg : p.surface),
        bannerInk: cur ? a.btnInk : (fin ? green : p.sub),
        bannerBorder: p.dark && !cur && !fin ? '1px solid #26262D' : 'none',
        bannerShadow: cur ? '0 4px 0 ' + (p.dark ? rgba(t.body, 0.45) : rgba(t.deep, 0.55)) : 'none',
        trail: fin ? (p.dark ? '#7FD9AC' : '#4CC38A') : a.text,
        h: h, height: h + 'px', viewBox: '0 0 ' + W + ' ' + h,
        donePath: curve(0, lastDone),
        todoPath: curve(Math.max(lastDone, 0), w.steps.length - 1),
        hasChar: todayIdx >= 0, charLeft: charLeft, charTop: charTop,
        hasPop: popWeek === w.n, popTop: popTop,
        toggle: function () { if (far) return; var next = Object.assign({}, openW); next[w.n] = !isOpen; self.setState({ openW: next }); }
      };
    });

    var openN = st.openN !== undefined ? st.openN : 2;
    var listDays = {
      1: data[0].steps.filter(function (s) { return s.kind !== 'quiz'; }).map(function (s) { return day(s.d, s.title, s.s); }),
      2: data[1].steps.filter(function (s) { return s.kind !== 'quiz'; }).map(function (s) { return day(s.d, s.title, s.s); })
    };
    var weeks = data.map(function (w) {
      var open = w.n === openN;
      var days = listDays[w.n] || [];
      return {
        n: w.n, title: w.title, meta: w.meta, days: days,
        open: open, locked: days.length === 0,
        chev: open ? 'rotate(180deg)' : 'none',
        border: w.status === 'current' ? '2px solid ' + a.text : (p.dark ? '1px solid #26262D' : '2px solid transparent'),
        badgeBg: w.status === 'done' ? greenBg : (w.status === 'current' ? a.btnBg : p.future),
        badgeInk: w.status === 'done' ? green : (w.status === 'current' ? a.btnInk : p.sub),
        toggle: function () { self.setState({ openN: open ? 0 : w.n }); }
      };
    });
    var isMap = view === 'map';
    var v = {
      map: isMap, list: !isMap,
      mapBg: isMap ? a.btnBg : 'transparent', mapInk: isMap ? a.btnInk : p.sub,
      listBg: !isMap ? a.btnBg : 'transparent', listInk: !isMap ? a.btnInk : p.sub
    };
    // returned: { t, p, a, v, map, weeks, f: face(t.name,'base'),
    //   sel: selInfo || { kicker:'', title:'', meta:'', href:'Lesson.dc.html', cta:'', showBtn:'none', bg:p.surface, ink:p.ink, btnBg:a.btnBg, btnInk:a.btnInk },
    //   showMap: () => setState({view:'map'}), showList: () => setState({view:'list'}) }
```

## 4. Animation CSS (screen-specific)

```css
/* 학습 지도: 오늘 칸 물결, 시작 말풍선 까딱임 */
.mp-pulse{animation:mp-pulse 2s ease-out infinite}
.mp-bob{animation:mp-bob 1.6s ease-in-out infinite}
.mp-node{transition:transform 0.12s ease-out}
.mp-node:active{transform:translateY(4px)}
@keyframes mp-pulse{0%{transform:scale(1);opacity:0.55}100%{transform:scale(1.55);opacity:0}}
@keyframes mp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@media (prefers-reduced-motion: reduce){.mp-pulse,.mp-bob{animation:none}.mp-pulse{opacity:0}}
```
Plus the shared character motion CSS (`ci-*`, see Pause.md section 4).

## 5. Character

| where | size | state | jump |
|---|---|---|---|
| Map, beside the today node of the current week (`charLeft/charTop`) | 72 x 66 | base | yes |
