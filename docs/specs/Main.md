# Main (홈 / 오늘 탭) 스펙

Source: `mockup/Main.dc.html` (light/system), `mockup/Dark.dc.html` (thin wrapper: `<dc-import name="Main" theme="다크">` — no extra markup; it only re-declares the same motion CSS. The flashlight is already inside Main, gated by `p.dark`).

Props: `teacher` 온|결|새 (default 온), `theme` 기기 설정|화이트|다크 (default 화이트; 기기 설정 follows `prefers-color-scheme`).

## Tokens used

- Palette `p` (Main uses subset): `bg, surface, ink, sub, line, future, tab, cardBorder`.
- Accent `a` = `{text, tint, btnBg, btnInk, glow}`. Light: text/btnBg = `t.deep`, tint = `t.tint`, btnInk `#FFFFFF`, glow `0 0 0 6px ${t.tint}`. Dark: text/btnBg = `t.body`, tint = `rgba(t.body,0.16)`, btnInk `#111114`, glow `0 0 0 6px rgba(t.body,0.14), 0 0 32px rgba(t.body,0.28)`.
- Fonts: Jua for logo "작심육주" and the streak number; Noto Sans KR (400/500/700) everywhere else.

## Layout (390 x 844, `position: relative; overflow: hidden; background: p.bg; color: p.ink`)

Content column: `display:flex; flex-direction:column; gap:12px; padding:20px 20px 0 20px`. Not scrollable in mockup (tab bar is absolutely positioned on top).

### 1. Header (height 44, space-between)
- Logo text `작심육주` — Jua 24px, letter-spacing -0.5px, `p.ink`.
- Bell button `<a href="Notifications.dc.html" aria-label="알림 3개">` 44x44, radius 22, `border: p.cardBorder`, bg `p.surface`, centered icon.
  - Icon 22x22, stroke `p.ink`, width 1.8, round caps/joins:
    `<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9"/><path d="M10 20a2 2 0 0 0 4 0"/>`
  - Unread dot: absolute top 9 right 10, 9x9, radius 5, bg `a.text`, `border: 2px solid p.surface`.

### 2. Teacher greeting row (height 56, flex, align center, gap 10)
- Character 48x44 (viewBox 0 0 120 110), state **base**, **jump = true** (`ci-jump` wrapper). aria-label `{t.name} 선생님`.
- Speech bubble: flex 1, bg `p.surface`, `border: p.cardBorder`, radius `16px 16px 16px 4px`, padding `8px 14px`.
  - Line 1: `{t.name} 선생님` 12px/500 `a.text`.
  - Line 2: `t.line` 14px/20px `p.ink` (copy below).

### 3. 오늘 할 일 card (`<section aria-label="오늘 할 일">`)
- `position:relative; margin-top:40px` (room for the character peeking above), bg `p.surface`, radius 24, `border: 2px solid a.text`, `box-shadow: a.glow`, padding 20, flex column gap 10.
- No border-beam animation exists; the emphasis is static border + glow.
- **Peeking character** (easter egg host): `<svg width="96" height="88" viewBox="0 0 120 110" aria-hidden>` absolute `top:-66px; right:18px; overflow:visible; pointer-events:none`. State **base**, **jump = true**. Has slime-style arms + sunglasses/flashlight (verbatim markup below).
- Row: pill `오늘 할 일` (12px/700, color `a.text`, bg `a.tint`, radius 999, padding `4px 10px`) + meta `2주차 목요일 · 마일스톤까지 2칸` (12px `p.sub`); flex gap 8.
- **Short path (5 cells)** `<a href="Curriculum.dc.html" aria-label={trail.label}>`: relative flex, space-between, align center, height 36, `margin-right: 96px` (keeps clear of character), no underline.
  - Track: absolute left 14 right 14 top 16, height 4, radius 2, bg `p.line`.
  - Progress: absolute left 14 top 16, width `calc((100% - 28px) * 0.5)`, height 4, radius 2, bg `a.text`.
  - Nodes (5): `done, done, today, todo, todo` with icons `check, check, star, quiz, flag`.
    - size: today 34px else 26px; circle, `box-sizing:border-box`, centered.
    - bg: done/today `a.btnBg`, todo `p.surface`. icon stroke: done/today `a.btnInk`, todo `p.sub`.
    - border: done/today none, todo `2px solid p.line`.
    - shadow: today `0 3px 0 ` + (dark ? `rgba(t.body,0.45)` : `rgba(t.deep,0.55)`), else none.
    - icon svg: size today 18 else 14, viewBox 0 0 24 24, fill none, stroke-width 3, round.
    - today only: pulse ring `<span class="mp-pulse">` absolute inset -2px, circle, `border: 2px solid a.text`.
  - Icon paths verbatim:
    - check `M5 12.5l4.5 4.5L19 7.5`
    - star `M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z`
    - quiz `M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3 M12 18v.2`
    - flag `M6 21V4 M6 4h11l-2 4 2 4H6`
- Title `<h1>`: 21px/29px 700, letter-spacing -0.4, padding-right 8, `p.ink`.
- Meta line: 13px `p.sub`.
- Buttons row (flex gap 8, margin-top 6):
  - `<a href="Lesson.dc.html">학습 시작</a>` flex 1, h 52, radius 16, bg `a.btnBg`, color `a.btnInk`, 16px/700.
  - `<button>5분 버전</button>` w 104, h 52, `border:1.5px solid p.line`, radius 16, bg `p.surface`, `p.ink`, 14px/500. **No handler in mockup** (Lesson has its own 전체/5분 toggle; implement as link to Lesson with short mode).

### 4. 학습 잔디 card (`aria-label="학습 잔디"`)
- margin-top 10, bg `p.surface`, `border: p.cardBorder`, radius 20, padding 16, flex column gap 12.
- Header row baseline/space-between: `<h2>학습 잔디</h2>` 15px/700 `p.ink`; right `6주 과정 중 2주차` 12px `p.sub`.
- Body: flex gap 20 align center.
  - Left (flex gap 6):
    - Day labels column: grid `repeat(7, 20px)` row-gap 4, width 12, 10.5px `p.sub`, right-aligned, labels at rows 1/3/5/7 only: `월`, (blank), `수`, (blank), `금`, (blank), `일` (each line-height 20px).
    - Grid `role="img" aria-label="1주차 5일, 2주차 3일 학습. 오늘은 2주차 목요일"`: `grid-template-rows: repeat(7,20px); grid-auto-columns:20px; grid-auto-flow:column; gap:4px` → 6 columns (weeks) x 7 rows (월..일) = 42 cells. Cell 20x20, radius 6, border-box.
  - Right (flex 1, column, gap 2): `연속 학습` 12px `p.sub`; `8일째` Jua 44px/48px `a.text`; `최장 기록 8일` 12px `p.ink`; `쉬는 날로 정한 주말은 연속이 끊기지 않아요` 11.5px/16px `p.sub`, margin-top 6.
- Cell data (weeks, Mon→Sun): number = level 1..4, `r` rest, `today`, `f` future:
  ```
  [3,2,4,2,3,'r','r'],
  [2,3,1,'today','f','r','r'],
  then 4 x ['f','f','f','f','f','r','r']
  ```
- Cell colors:
  - level 1-3: `rgba(t.body, L[v])`, L light `[0,0.35,0.6,0.9]`, dark `[0,0.3,0.55,0.8]`. Level 0 (alpha 0) is never used in data; a missed past study day would be level 0 -> treat as `p.future`-like empty (not specified).
  - level 4: solid `t.deep` (light) / `t.body` (dark).
  - rest `r`: bg transparent, `border: 1px dashed p.line` (dotted/dashed rest cell).
  - future `f`: bg `p.future`, no border.
  - today: bg `p.surface`, `border: 2px solid a.text` (empty outlined; gets filled on Complete).
- No fill animation on Main.

### 5. 함께하는 사람 card
- bg `p.surface`, `border: p.cardBorder`, radius 20, padding `12px 12px 12px 16px`, flex align center gap 12.
- Avatar stack: 36x36 circles, radius 18, `border:2px solid p.surface`, overlap `margin-left:-10px` (2nd/3rd), 13px/700 initial: `민`, `서`, `준`.
  - Colors `m`: light a `{bg:#E6EEFF, ink:#B3261E}`, b `{bg:#E2F5EA, ink:#1F6B42}`, c `{bg:p.future, ink:#4A463F}`; dark a `{bg:rgba(#5B8CFF,0.2), ink:#FF9A90}`, b `{bg:rgba(#4CC38A,0.2), ink:#7FD9AC}`, c `{bg:#2A2A31, ink:#C9C7CE}`.
- Text: `오늘 2명이 학습했어요` 14px/500 `p.ink`; `준님은 이틀째 쉬는 중` 12px `p.sub`.
- Button `콕 찌르기`: h 44, padding 0 14, no border, radius 14, bg `a.tint`, color `a.text`, 14px/700. No handler in mockup.

### 6. Bottom tab bar (`<nav aria-label="하단 탭">`)
- absolute left/right/bottom 0, height 76, border-box, padding `8px 12px 16px 12px`, bg `p.tab`, `border-top:1px solid p.line`, grid 4 equal cols.
- Each tab `<a>`: flex column center, gap 4, 11.5px, no underline. Active: color `a.text`, weight 700, icon stroke-width 2, `aria-current="page"`. Inactive: color `p.sub`, stroke-width 1.8. Icons 24x24 viewBox 0 0 24 24, fill none, stroke currentColor, round caps/joins.
  - `오늘` -> `Main.dc.html` (active here): `<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>`
  - `커리큘럼` -> `Curriculum.dc.html`: `<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>`
  - `그룹` -> `Group.dc.html`: `<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>`
  - `내 정보` -> `Profile.dc.html`: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>`

## Copy (verbatim)

Per-teacher greeting `t.line`:
- 온: `오늘도 와 줬네요. 10분만 같이 해요`
- 결: `이번 주 목표까지 레슨 2개 남았습니다`
- 새: `오늘 건 요리랑 닮았어요. 왜인지 볼래요?`

Fixed copy: `작심육주` · `{t.name} 선생님` · `오늘 할 일` · `2주차 목요일 · 마일스톤까지 2칸` · `현금흐름표는 왜 손익계산서와 다를까` · `재무제표 읽기 · 약 10분 · 설명과 튜터 질문 3개` · `학습 시작` · `5분 버전` · `학습 잔디` · `6주 과정 중 2주차` · `월` `수` `금` `일` · `연속 학습` · `8일째` · `최장 기록 8일` · `쉬는 날로 정한 주말은 연속이 끊기지 않아요` · `민` `서` `준` · `오늘 2명이 학습했어요` · `준님은 이틀째 쉬는 중` · `콕 찌르기` · tabs `오늘` `커리큘럼` `그룹` `내 정보`.

aria: bell `알림 3개`; path link `2주차 길: 화요일, 수요일 완료, 오늘 목요일 레슨, 다음은 주차 퀴즈와 금요일 마일스톤. 눌러서 커리큘럼 지도 보기`; grass `1주차 5일, 2주차 3일 학습. 오늘은 2주차 목요일`.

## State / logic

- Purely presentational; no internal state except `sysDark` (matchMedia listener for 기기 설정).
- `fx = { glasses: p.dark ? 'none' : 'inline', flash: p.dark ? 'inline' : 'none' }` — light shows sunglasses, dark shows flashlight + beam.
- Teacher fallback when prop unknown: 결.
- Navigation: bell -> Notifications, path -> Curriculum, 학습 시작 -> Lesson, tabs as above.
- All numbers (2주차 목요일, 8일째, 2명, etc.) are mock data -> derive from user progress in implementation.

## Easter egg markup (verbatim, inside the 96x88 card-top svg)

Before the character group:
```html
<defs>
  <linearGradient id="sl-beam-fill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFF4C2" stop-opacity="0.95"></stop>
    <stop offset="1" stop-color="#FFF4C2" stop-opacity="0"></stop>
  </linearGradient>
</defs>
<polygon class="sl-beam" points="104,96 118,96 150,250 50,250" fill="url(#sl-beam-fill)" style="display: {{fx.flash}}"></polygon>
<path class="sl-arm-l" d="M22 62 C10 56 8 44 14 38" fill="none" stroke="{{p.ink}}" stroke-width="2.5" stroke-linecap="round"></path>
<g class="sl-arm-r">
  <path d="M98 64 C110 66 114 74 110 82" fill="none" stroke="{{p.ink}}" stroke-width="2.5" stroke-linecap="round"></path>
  <g class="sl-flash" style="display: {{fx.flash}}">
    <rect x="103" y="80" width="14" height="18" rx="3" fill="#3A3A42" stroke="{{p.ink}}" stroke-width="1.5"></rect>
    <rect x="101" y="94" width="18" height="5" rx="2" fill="#6B6A55"></rect>
    <rect class="sl-bulb" x="101" y="94" width="18" height="5" rx="2" fill="#FFE27A"></rect>
  </g>
</g>
```
Then the character (`<g class="ci-jump">…`). Sunglasses are placed **inside the face's `ci-look` group** (last child, after the tear path) so they follow eye movement:
```html
<g class="sl-glasses" style="display: {{fx.glasses}}">
  <path d="M33 47 L22 44" stroke="#1C1B19" stroke-width="3" stroke-linecap="round"></path>
  <path d="M87 47 L98 44" stroke="#1C1B19" stroke-width="3" stroke-linecap="round"></path>
  <rect x="33" y="40" width="26" height="23" rx="9" fill="#1C1B19"></rect>
  <rect x="61" y="40" width="26" height="23" rx="9" fill="#1C1B19"></rect>
  <path d="M57 47 Q60 44 63 47" fill="none" stroke="#1C1B19" stroke-width="3.5"></path>
  <path d="M38 46 L45 44" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.75"></path>
  <path d="M66 46 L73 44" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.75"></path>
</g>
```
(Use `inner(v, jump=True, extra_face=...)` in circle_face.py for the character; the glasses are the `extra_face`.) Note the gradient id `sl-beam-fill` must be unique per page.

## Motion CSS (verbatim, Main-specific; ci-* character CSS is shared, see below)

```css
/* 가끔 나오는 동작: 라이트는 선글라스, 다크는 손전등 */
.sl-arm-l{transform-box:fill-box;transform-origin:100% 100%;animation:sl-sway 3.2s ease-in-out infinite}
.sl-arm-r{transform-box:fill-box;transform-origin:0% 0%;animation:sl-wave 2.4s ease-in-out infinite}
.sl-glasses{animation:sl-glasses 12s ease-in-out infinite}
.sl-flash{animation:sl-flash 8s ease-in-out infinite}
.sl-beam{animation:sl-beam 8s linear infinite}
.sl-bulb{animation:sl-beam 8s linear infinite}
@keyframes sl-sway{0%,100%{transform:rotate(0deg)}50%{transform:rotate(10deg)}}
@keyframes sl-wave{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-22deg)}50%{transform:rotate(6deg)}75%{transform:rotate(-16deg)}}
@keyframes sl-glasses{0%,58%{opacity:0;transform:translateY(-16px)}64%,86%{opacity:1;transform:translateY(0)}92%,100%{opacity:0;transform:translateY(-16px)}}
@keyframes sl-flash{0%,36%{opacity:0}40%,90%{opacity:1}94%,100%{opacity:0}}
@keyframes sl-beam{0%,42%{opacity:0}44%{opacity:0.85}45%{opacity:0.1}46%{opacity:0.85}47%{opacity:0.2}49%,63%{opacity:0.85}64%{opacity:0.15}65%,74%{opacity:0.85}75%{opacity:0.1}76%{opacity:0.6}77%{opacity:0.15}78%,86%{opacity:0.85}89%,100%{opacity:0}}
@media (prefers-reduced-motion: reduce){.sl-breathe,.sl-arm-l,.sl-arm-r,.sl-eyes,.sl-pupils,.sl-glasses,.sl-flash,.sl-beam,.sl-bulb{animation:none}.sl-glasses,.sl-flash,.sl-beam,.sl-bulb{opacity:0}}

/* 오늘 할 일 카드의 짧은 길: 오늘 칸 물결 */
.mp-pulse{animation:mp-pulse 2s ease-out infinite}
@keyframes mp-pulse{0%{transform:scale(1);opacity:0.55}100%{transform:scale(1.55);opacity:0}}
@media (prefers-reduced-motion: reduce){.mp-pulse{animation:none;opacity:0}}
```
(Main.dc.html's reduced-motion rule omits `.sl-bulb`; Dark.dc.html includes it — use the Dark version above.) Main also carries unused legacy `.sl-breathe/.sl-eyes/.sl-pupils` rules from an older slime character; skip them.

Shared character CSS (same in all screens):
```css
.ci-breathe{transform-box:fill-box;transform-origin:50% 100%;animation:ci-breathe 3.4s ease-in-out infinite}
.ci-blink{transform-box:fill-box;transform-origin:50% 50%;animation:ci-blink 4.8s infinite}
.ci-look{animation:ci-look 7s ease-in-out infinite}
.ci-hop{animation:ci-hop 1.4s ease-in-out infinite}
.ci-dots{animation:ci-dots 1.4s ease-in-out infinite}
.ci-jump{transform-box:fill-box;transform-origin:50% 100%;animation:ci-jump 8s infinite}
@keyframes ci-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.035,0.965)}}
@keyframes ci-blink{0%,45%,49%,100%{transform:scaleY(1)}47%{transform:scaleY(0.12)}}
@keyframes ci-look{0%,12%,100%{transform:translate(0,0)}22%,38%{transform:translate(-3.5px,0)}50%,66%{transform:translate(3.5px,-1px)}78%,90%{transform:translate(0,1px)}}
@keyframes ci-hop{0%,100%{transform:translateY(0)}35%{transform:translateY(-9px)}55%{transform:translateY(0)}}
@keyframes ci-dots{0%,100%{opacity:0.3}50%{opacity:1}}
@keyframes ci-jump{0%,84%{transform:translateY(0) scale(1,1);animation-timing-function:ease-out}85.4%{transform:translateY(0) scale(1.08,0.9);animation-timing-function:ease-out}89.5%{transform:translateY(-14px) scale(0.95,1.06);animation-timing-function:ease-in}93.8%{transform:translateY(0) scale(1.07,0.92);animation-timing-function:ease-out}98.4%,100%{transform:translateY(0) scale(1,1)}}
@media (prefers-reduced-motion: reduce){.ci-breathe,.ci-blink,.ci-look,.ci-hop,.ci-dots,.ci-jump{animation:none}}
```

## Character placements

| Where | Size | State | Jump |
|---|---|---|---|
| Greeting row | 48x44 | base | yes |
| Peeking over 오늘 할 일 card (top -66, right 18) | 96x88 | base | yes (+ arms, glasses/flashlight) |
