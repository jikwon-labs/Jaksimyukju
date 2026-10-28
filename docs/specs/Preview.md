# Preview (커리큘럼 생성 / 미리보기)

Source: `mockup/Preview.dc.html`. Dark variant = wrapper with `theme="다크"`.

- Frame: 390 x 844, bg `p.bg`, color `p.ink`, Noto Sans KR.
- Props: `teacher` (default 온), `theme`. Accent `a` from teacher. Palette uses `future` too.
- Two phases in one component: **making** (loading animation) -> **ready** (curriculum preview).

## State & lifecycle

- `phase` 0..3. `making = phase < 3`, `ready = phase >= 3`.
- `run()`: clear timers, `phase = 0`, then `setTimeout` to set phase 1, 2, 3 at 1100ms, 2200ms, 3300ms (comment: "만드는 중 단계를 1.1초 간격으로 넘긴다"). Called on mount and by `다시 만들기` (`remake`). Timers cleared on unmount.
- In real impl this is where the curriculum API call happens; the 3-step list is progress UI.
- Step labels (in progress / done, verbatim):
  | i | active/waiting | done |
  |---|---|---|
  | 0 | `목적지를 정리하는 중` | `목적지를 정리했어요` |
  | 1 | `배울 순서를 짜는 중` | `배울 순서를 짰어요` |
  | 2 | `주차별 마일스톤을 정하는 중` | `주차별 마일스톤을 정했어요` |
  - `done = phase > i`, `active = phase === i`, `wait` otherwise.
  - weight: active 700 else 400; ink: done/active `p.ink`, wait `p.sub`.
- Teacher done line `t.done`:
  - 온: `천천히, 하지만 끝까지 갈 수 있게 짰어요.`
  - 결: `빈틈없이 짰습니다. 이대로 갑니다.`
  - 새: `중간중간 재밌는 샛길도 숨겨 뒀어요.`

## Phase A: making

Container: absolute inset 0, padding `120px 32px 40px 32px`, column, align center, gap 24.

1. Character: current teacher, 150 x 138, state **think** (thinking dots visible, `ci-dots` blink), no jump. aria-label `커리큘럼을 짜는 {t.name} 선생님`.
2. Text (center, column gap 6):
   - `<h1>` 22px / 30px 700: `{t.name} 선생님이 과정을 짜고 있어요`
   - `<p>` 14px `p.sub`: `재무제표 읽기 · 6주 · 주 5일 10분` (static in mockup; real = `{topic} · {weeks}주 · 주 {perWeek}일 {minutes}분`)
3. Step list `<ol aria-live="polite">`: no bullets, width 100%, column gap 10. Item: flex, align center, gap 12, min-height 52, padding 0 16, radius 16, bg `p.surface`, border `p.cardBorder`.
   - Icon slot 24x24:
     - done: filled circle r11 `a.btnBg` + check (`M7 12.5l3.2 3.2L17 9`) stroke `a.btnInk` 2.5.
     - active: class `sl-spin`; ring r9 stroke `p.line` 3 + arc `M12 3a9 9 0 0 1 9 9` stroke `a.text` 3 round.
     - wait: ring r9 stroke `p.line` 3.
   - Label 15px, weight/ink per above.

## Phase B: ready

Scroll area: absolute top/left/right 0, bottom 96, overflow-y auto, padding `20px 20px 24px 20px`, column gap 14.

1. **Hero row** (flex, align center, gap 12, padding-top 8)
   - Character 64 x 59, state **joy** (uses `ci-hop` bounce instead of breathe), no jump, `overflow: visible`.
   - `<h1>` 22px / 30px 700, -0.4px: `나만의 과정이 준비됐어요`; under it `{t.done}` 13px `p.sub` (column gap 2).
2. **Summary card** (`aria-label="과정 요약"`): bg `a.tint`, radius 20, padding 16px 18px, column gap 6.
   - `6주 · 주 5일 · 하루 10분 · 레슨 30개` — 12px 700 `a.text`
   - `재무제표 읽기` — 20px 700
   - `목적지: 재무제표를 혼자 읽고 한 장으로 요약하기` — 13px / 20px
   - (All static sample; real values from Topic + Schedule.)
3. **Weekly plan** (`aria-label="주차별 계획"`): bg `p.surface`, border `p.cardBorder`, radius 20, padding 4px 16px.
   - Row: flex, align flex-start, gap 12, padding 12px 0, border-top: first `none`, others `1px solid p.line`.
   - Badge 34x34, radius 11, 12px 700, text `{n}주`; week 1 bg `a.btnBg` / ink `a.btnInk`, others bg `p.future` / ink `p.sub`.
   - Title 15px 700; second line 12px / 18px `p.sub`: `마일스톤: {milestone}`.
   - Data (sample, 6 weeks):
     | n | title | milestone |
     |---|---|---|
     | 1 | `손익계산서 기본` | `관심 회사 손익 한 장 요약` |
     | 2 | `현금흐름표 이해` | `내 회사 현금흐름 한 장 요약` |
     | 3 | `재무상태표로 체력 보기` | `부채와 자본 비율 설명하기` |
     | 4 | `비율로 회사 비교하기` | `같은 업종 두 회사 비교표` |
     | 5 | `현금흐름으로 위험 읽기` | `위험 신호 세 가지 찾기` |
     | 6 | `실제 회사 분석해 보기` | `한 회사 재무제표 한 장 요약` |
4. **Skipped topics** (`aria-label="지금은 건너뛰는 것"`, column gap 8)
   - `<h2>` `지금은 건너뛰어요` 15px 700.
   - Pills (flex wrap gap 6): 13px, padding 6px 12px, radius 999, border `1.5px dashed p.line`, color `p.sub`: `회계 분개 실습`, `세무 신고`, `회계 기준 세부 조항`.
   - Note 12px / 18px `p.sub`: `목적지에 필요 없는 것은 빼 두었어요. 나중에 과정 수정에서 넣을 수 있어요.`

**Fixed footer** (ready only): absolute bottom 0, height 96, padding `12px 20px 28px 20px`, bg `p.bg`, border-top `1px solid p.line`, flex gap 8.

- `다시 만들기` button: width 112, height 56, border `1.5px solid p.line`, radius 18, transparent, `p.ink`, 15px. onClick `remake` (re-runs phase animation).
- Link `이대로 시작하기` -> Main: flex 1, height 56, radius 18, bg `a.btnBg`, color `a.btnInk`, 17px 700.

## Motion (screen-specific, verbatim)

Used: `.sl-spin` on the active step icon.

```css
.sl-spin{transform-box:fill-box;transform-origin:50% 50%;animation:sl-spin 1s linear infinite}
@keyframes sl-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.sl-think,.sl-hop,.sl-eyes,.sl-spin{animation:none}}
```

Defined but unused by markup (legacy): `.sl-think` -> `sl-wobble 0.9s` (`0%,100%{scale(1,1) rotate(0)}25%{scale(1.06,0.94) rotate(-3deg)}75%{scale(0.96,1.04) rotate(3deg)}`), `.sl-hop` -> `sl-hop 1.6s` (`40%{translateY(-10px)}`), `.sl-eyes` -> `sl-blink 4.6s`. Character motion comes from shared ci-* CSS (think = `ci-breathe` + `ci-dots`; joy = `ci-hop` 1.4s, `35%{translateY(-9px)}`).

## Data contract implied

Curriculum generator returns: weeks[] of `{title, milestone}` (count = chosen weeks), a skipped-topics list, plus summary (weeks, days/week, minutes, lessons = days*weeks, topic, goal).

## Characters

| Where | Who | Size | State | Jump |
|---|---|---|---|---|
| making | current teacher | 150x138 | think | no |
| ready hero | current teacher | 64x59 | joy | no |
