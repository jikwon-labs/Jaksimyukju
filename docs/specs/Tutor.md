# Tutor (튜터 채팅) 스펙

Source: `mockup/Tutor.dc.html`; `TutorDark.dc.html` is a plain dark wrapper. Props: `teacher`, `theme`. Palette subset: `bg, surface, ink, sub, line, cardBorder`. Accent `a` = `{text, tint, btnBg, btnInk}`. Font: Noto Sans KR.

## Layout (390 x 844, relative, overflow hidden, bg `p.bg`, `display:flex; flex-direction:column`)

### 1. Header
`display:flex; align-items:center; gap:10px; padding:20px 20px 12px 20px; border-bottom:1px solid p.line`.
- Back `<a href="Lesson.dc.html" aria-label="레슨으로 돌아가기">` 44x44, radius 22, `border: p.cardBorder`, bg `p.surface`, `flex:none`. Icon 20x20 stroke `p.ink` width 2: `<path d="M15 5l-7 7 7 7"/>`.
- Character 44x40, `flex:none`, state **think** while `thinking` else **base**, **no jump**. (think state shows the 3 thought dots via `ci-dots`.)
- Name column (flex 1, gap 1): `{t.name} 선생님` 15px/700; status 12px `p.sub` (= `status`).
- Understanding badge: 11px/700, radius 999, padding `4px 9px`, bg `u.bg`, color `u.ink`, text `u.label`.

### 2. Message list
`aria-live="polite"; flex:1; overflow-y:auto; padding:16px 20px; display:flex; flex-direction:column; gap:10px`.
- Topic chip: `align-self:center`, 12px `p.sub`, bg `p.surface`, radius 999, padding `4px 12px`. Text = lesson title.
- Each message: row `display:flex; justify-content: m.align`; bubble `<p>` max-width 78%, padding `10px 14px`, 15px/22px.
  - Teacher (from `t`): align flex-start, radius `4px 18px 18px 18px`, bg `p.surface`, ink `p.ink`, `border: p.cardBorder`.
  - User (from `u`): align flex-end, radius `18px 4px 18px 18px`, bg `a.btnBg`, ink `a.btnInk`, border none.
- Typing indicator (only when `thinking`): `role="status" aria-label="선생님이 생각하는 중"`, align-self flex-start, flex gap 5, padding `14px 16px`, radius `4px 18px 18px 18px`, bg `p.surface`, `border: p.cardBorder`; three 7x7 dots radius 4 bg `a.text` with classes `sl-dot`, `sl-dot sl-dot2`, `sl-dot sl-dot3`.
- Completion CTA (only when `done`): `<a href="Complete.dc.html">` align-self center, margin-top 6, flex align center, h 48, padding 0 18, radius 16, bg `a.btnBg`, color `a.btnInk`, 15px/700.

### 3. Composer (`<form onSubmit=send>`)
`display:flex; align-items:center; gap:8px; padding:10px 16px 28px 16px; border-top:1px solid p.line; background:p.bg`.
- Visually-hidden `<label for="tutor-input">선생님에게 답하기</label>` (absolute 1x1, overflow hidden, clip rect(0 0 0 0)).
- `<input id="tutor-input" placeholder="내 생각을 적어 보세요" autocomplete="off">`: flex 1, h 48, border-box, padding 0 16, radius 24, `border:1.5px solid p.line`, bg `p.surface`, color `p.ink`, 15px, `outline-color: a.text`. Controlled by `draft`.
- Send `<button type="submit" aria-label="보내기">` 48x48, radius 24, no border, bg `a.btnBg`, color `a.btnInk`. Icon 20x20 stroke currentColor width 2.2 round: `<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>`.

## Copy (verbatim)

Per teacher: `first` (question 1), `follow[0]` (question 2), `follow[1]` (wrap-up).

- 온
  - first: `천천히 해도 돼요. 회사가 이익을 냈는데 현금은 줄어들 수도 있을까요?`
  - follow[0]: `좋은 출발이에요. 그럼 반대로, 이익은 적은데 현금은 늘어나는 경우도 떠올려 볼래요?`
  - follow[1]: `잘했어요. 오늘 배운 걸 한 줄로 정리하면 완벽해요. 오늘 레슨은 여기까지예요.`
- 결
  - first: `질문 하나 합니다. 이익을 냈는데 현금이 줄 수 있습니까? 이유까지 말해 보세요.`
  - follow[0]: `하나는 맞았습니다. 반대로 이익은 적은데 현금이 느는 경우는요? 바로 답하세요.`
  - follow[1]: `됐습니다. 한 줄 정리까지 했으니 오늘 레슨은 통과입니다.`
- 새
  - first: `이상한 질문 하나! 장사가 잘됐는데 지갑이 얇아질 수도 있을까요?`
  - follow[0]: `오, 재밌는 생각이에요. 그럼 장사는 별로인데 지갑이 두꺼워지는 날도 있을까요?`
  - follow[1]: `완벽해요! 오늘 레슨은 여기까지. 내일은 이걸 재무상태표랑 엮어 볼 거예요.`

Seed user answer (all teachers): `외상으로 팔면 매출은 잡히는데 돈은 나중에 들어와서요.`

Status line (`status`):
- thinking: `생각하는 중`
- done: `이해도 확인 끝`
- otherwise: `이해도 확인 · 질문 2 / 2`

Understanding badge (`u`):
- default (not thinking, not done): `부분 이해` — bg light `#FFF4D6` / dark `rgba(255,196,0,0.16)`; ink light `#7A5300` / dark `#FFD666`
- thinking: `거의 이해` — bg `a.tint`, ink `a.text`
- done: `이해함` — bg light `#E2F5EA` / dark `rgba(76,195,138,0.18)`; ink light `#1F6B42` / dark `#7FD9AC`

Fixed: topic chip `현금흐름표는 왜 손익계산서와 다를까` · `{t.name} 선생님` · CTA `레슨 완료하고 잔디 채우기` · placeholder `내 생각을 적어 보세요` · label `선생님에게 답하기` · aria `레슨으로 돌아가기`, `보내기`, `선생님이 생각하는 중`.

## State / logic

State: `history` (array of `{from:'t'|'u', text}`), `round` (default 0), `thinking` (bool), `draft` (string).

- Initial history (no `state.history`): `[{t, first}, {u, seed answer}]`, and while `round===0 && !state.history` the list also appends `{t, follow[0]}`. So the initial screen shows 3 bubbles: Q1, user answer, Q2.
- `done = round >= 1`.
- `onDraft(e)` -> `setState({draft: e.target.value})`.
- `send(e)`: preventDefault; `text = draft.trim()`; ignore if empty, or `thinking`, or `done`. Otherwise:
  1. `history = currentMsgs + {u, text}`, `draft = ''`, `thinking = true` (face -> think, badge -> 거의 이해, status -> 생각하는 중, typing dots shown).
  2. After **1400 ms** (`setTimeout`, cleared on unmount): append `{t, follow[1]}`, `thinking = false`, `round = round + 1` -> done: badge `이해함`, status `이해도 확인 끝`, CTA to Complete appears.
- Mockup is a 2-question scripted flow; real implementation replaces scripted replies with LLM tutor responses and real understanding grading (부분 이해 / 거의 이해 / 이해함).
- Navigation: back -> Lesson; CTA -> Complete.
- Unused leftovers in renderVals: `faceClass` (`sl-think`/`sl-breathe`), `eye` coords — from the old slime character; ignore.

## Motion CSS (screen-specific, verbatim)

```css
.sl-dot{animation:sl-dot 1.2s ease-in-out infinite}
.sl-dot2{animation-delay:0.2s}
.sl-dot3{animation-delay:0.4s}
@keyframes sl-dot{0%,100%{opacity:0.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
@media (prefers-reduced-motion: reduce){.sl-breathe,.sl-eyes,.sl-think,.sl-dot{animation:none}}
```
Unused legacy (defined but not referenced by markup): `.sl-breathe`, `.sl-eyes`, `.sl-think` + `@keyframes sl-wobble{0%,100%{transform:scale(1,1) rotate(0deg)}25%{transform:scale(1.06,0.94) rotate(-3deg)}75%{transform:scale(0.96,1.04) rotate(3deg)}}`.
Plus shared `ci-*` character CSS (see Main.md).

## Character placements

| Where | Size | State | Jump |
|---|---|---|---|
| Header, after back button | 44x40 | `thinking ? think : base` | no |
