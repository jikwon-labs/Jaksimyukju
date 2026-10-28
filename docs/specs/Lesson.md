# Lesson (레슨 보기) 스펙

Source: `mockup/Lesson.dc.html`; `LessonDark.dc.html` is a plain dark wrapper (no extra markup). Props: `teacher`, `theme` (same as Main). Palette subset: `bg, surface, ink, sub, line, cardBorder`. Accent `a` = `{text, tint, btnBg, btnInk}` (no glow used). Font: Noto Sans KR only (no Jua on this screen).

## Layout (390 x 844, relative, overflow hidden, bg `p.bg`)

### Scroll area
`position:absolute; top:0; left:0; right:0; bottom:96px; overflow-y:auto; box-sizing:border-box; padding:20px 20px 24px 20px; display:flex; flex-direction:column; gap:16px`.

1. **Header** (height 44, space-between, align center)
   - Back `<a href="Main.dc.html" aria-label="오늘로 돌아가기">` 44x44, radius 22, `border: p.cardBorder`, bg `p.surface`. Icon 20x20 stroke `p.ink` width 2 round: `<path d="M15 5l-7 7 7 7"/>`.
   - Segmented control `role="group" aria-label="분량"`: flex, padding 4, radius 14, bg `p.surface`, `border: p.cardBorder`.
     - Buttons `전체 10분` / `5분 버전`: h 36, padding 0 12, no border, radius 10, 13px/700. Selected: bg `a.btnBg`, color `a.btnInk`. Unselected: bg transparent, color `p.sub`. `aria-pressed` reflects state.
2. **Title block** (column gap 8)
   - `재무제표 읽기 · 2주차 목요일` 12px `p.sub`.
   - `<h1>` 24px/33px 700, letter-spacing -0.5.
3. **Teacher intro** (flex, align flex-start, gap 10)
   - Character 40x37, state **base**, **no jump** (`flex:none`).
   - `<p>` bubble: flex 1, bg `p.surface`, `border: p.cardBorder`, radius `4px 16px 16px 16px` (tail top-left), padding `10px 14px`, 14px/21px. Text = `t.intro`.
4. **핵심 한 줄** section: bg `a.tint`, radius 20, padding `16px 18px`, column gap 6.
   - Label 12px/700 `a.text`; body 16px/25px 700.
5. **설명 1** section (column gap 10)
   - `<h2>` 17px/700; `<p>` 15px/25px.
   - Example box: `border:1.5px solid p.line`, radius 16, padding `14px 16px`, column gap 6; label `예시` 12px/700 `p.sub`; body 14px/22px.
6. **Only when `full`** (hidden in 5분 버전):
   - **설명 2** section — same structure as 설명 1.
   - **추천 자료** section (column gap 10)
     - Header baseline/space-between: `<h2>더 보고 싶다면</h2>` 17px/700; `선생님이 고른 자료 3개` 12px `p.sub`.
     - 3 rows `<a href="Resource.dc.html">`: flex align center gap 12, min-height 56, padding `10px 14px`, radius 16, bg `p.surface`, `border: p.cardBorder`, color `p.ink`.
       - Kind badge 36x36, radius 10, bg `a.tint`, color `a.text`, 12px/700, text `r.kind`.
       - Text column gap 2: title 14px/500; meta 12px `p.sub`.
       - Arrow-out icon 16x16 stroke `p.sub` width 2: `<path d="M7 17L17 7"/><path d="M8 7h9v9"/>`.

### Fixed bottom CTA bar
`position:absolute; left:0; right:0; bottom:0; height:96px; box-sizing:border-box; padding:12px 20px 28px 20px; background:p.bg; border-top:1px solid p.line`.
- `<a href="Tutor.dc.html">{t.name} 선생님과 확인하기</a>`: flex center gap 8, h 56, radius 18, bg `a.btnBg`, color `a.btnInk`, 17px/700.

## Copy (verbatim)

Per-teacher intro `t.intro`:
- 온: `오늘은 두 가지만 볼 거예요. 천천히 읽고, 헷갈리면 바로 물어봐요.`
- 결: `오늘 볼 건 두 가지. 다 읽으면 바로 확인 질문 들어갑니다.`
- 새: `외상으로 산 붕어빵 값은 언제 장부에 적힐까요? 그 얘기예요.`

Fixed:
- Segment: `전체 10분`, `5분 버전`
- `재무제표 읽기 · 2주차 목요일`
- H1: `현금흐름표는 왜 손익계산서와 다를까`
- `핵심 한 줄` / `손익계산서는 번 돈을, 현금흐름표는 실제로 들어오고 나간 돈을 보여 준다.`
- `1. 팔았다고 돈이 들어온 건 아니다`
- `손익계산서는 거래가 일어난 때를 기준으로 매출과 비용을 적는다. 그래서 외상으로 팔아도 매출은 그 달에 바로 잡힌다. 현금흐름표는 돈이 실제로 움직인 때만 적는다.`
- `예시` / `1월에 1,000만 원어치를 외상으로 팔고 3월에 돈을 받았다면, 손익계산서의 1월 매출은 1,000만 원이지만 현금흐름표의 1월 유입은 0원이다.`
- `2. 비용인데 돈은 안 나가는 것도 있다`
- `장비처럼 오래 쓰는 자산은 산 값을 몇 년에 나눠 비용으로 잡는다. 이게 감가상각이다. 비용은 매년 생기지만, 현금은 산 해에 한 번만 나간다.`
- `예시` / `5,000만 원짜리 장비를 5년에 나누면 해마다 비용은 1,000만 원이다. 그런데 현금 5,000만 원은 첫해에 다 나간다.`
- `더 보고 싶다면` / `선생님이 고른 자료 3개`
- Resources (placeholders; comment: "실제 서비스에서는 웹 검색으로 확인한 자료가 들어간다"):
  - kind `영상`, title `[웹 검색으로 찾은 영상 제목]`, meta `영상 · 약 12분 · [출처]`
  - kind `글`, title `[웹 검색으로 찾은 글 제목]`, meta `글 · 약 6분 · [출처]`
  - kind `책`, title `[웹 검색으로 찾은 책의 한 장]`, meta `책 · 약 20분 · [출처]`
- CTA: `{t.name} 선생님과 확인하기` (e.g. `온 선생님과 확인하기`)
- aria: back `오늘로 돌아가기`, group `분량`, sections `핵심 한 줄`, `설명 1`, `설명 2`, `추천 자료`.

## State / logic

- `state.short` (default false). `full = !short`.
- `showFull` -> `setState({short:false})`; `showShort` -> `setState({short:true})`.
- `full` renders 설명 2 + 추천 자료; short shows only 핵심 한 줄 + 설명 1.
- Home's `5분 버전` button should deep-link here with `short = true` (not wired in mockup).
- Navigation: back -> Main, resource rows -> Resource, CTA -> Tutor.
- Teacher objects also carry legacy `brows`/`mouth` fields (unused by the circle character).

## Motion

Only the shared character CSS (`ci-*`, see Main.md). Legacy `.sl-breathe/.sl-eyes` rules present but unused. No screen-specific animation.

## Character placements

| Where | Size | State | Jump |
|---|---|---|---|
| Intro bubble, left | 40x37 | base | no |
