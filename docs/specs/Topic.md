# Topic (주제 정하기 채팅, 2/3)

Source: `mockup/Topic.dc.html`. Dark variant = wrapper with `theme="다크"`.

- Frame: 390 x 844, bg `p.bg`, color `p.ink`, Noto Sans KR. Root `flex column` (no root padding; sections pad themselves).
- Props: `teacher` (default 온), `theme`. Accent `a` from teacher (common rule).
- A 3-step chat: teacher asks -> user answers (topic, goal via text/chips; level via buttons) -> summary card.

## Teacher copy (verbatim), `t.q[0..3]`

| # | 온 | 결 | 새 |
|---|---|---|---|
| 0 주제 | `반가워요! 어떤 걸 배워 보고 싶어요? 편하게 적어 주세요.` | `무엇을 배울지부터 정합니다. 주제를 적으세요.` | `어디로 탐험을 떠나 볼까요? 궁금한 주제를 알려 주세요!` |
| 1 목적지 | `좋아요. 다 배우고 나면 무엇을 할 수 있으면 좋겠어요?` | `끝났을 때 무엇을 할 수 있어야 합니까? 구체적으로.` | `그 탐험이 끝나면 어떤 걸 해내고 싶어요?` |
| 2 수준 | `마지막으로, 지금은 어느 정도 알고 있어요?` | `지금 수준은 어디입니까?` | `지금은 지도를 얼마나 갖고 있어요?` |
| 3 끝 | `고마워요. 이걸로 나만의 과정을 짜 볼게요.` | `됐습니다. 이걸로 과정을 짭니다.` | `좋아요! 이제 탐험 지도를 그려 볼게요.` |

(Source teachers object also has unused legacy `brows`/`mouth` fields; ignore.)

## Data

- Chip suggestions:
  - step 0: `재무제표 읽기`, `영어 회화`, `디자인 기초`, `파이썬 기초`, `사진 보정`
  - step 1: `재무제표를 혼자 읽고 한 장으로 요약하기`, `회사 숫자로 투자 판단 근거 세우기`, `회의에서 재무 숫자를 설명하기`
  - (step 1 chips are finance-specific in the mockup; real impl should generate them from the step-0 topic.)
- Level options (step 2):
  | label | hint |
  |---|---|
  | `처음이에요` | `용어부터 차근차근` |
  | `조금 알아요` | `들어 본 적은 있지만 혼자는 어려워요` |
  | `꽤 알아요` | `기본은 되고, 깊이를 더하고 싶어요` |
- Input placeholder: step 0 `예: 재무제표 읽기`, else `예: 회사 숫자를 혼자 읽기`.
- Input (visually hidden) label: step 0 `배우고 싶은 주제`, else `배우고 나서 하고 싶은 것`.

## State & logic

- `ans: string[]` (0 topic, 1 goal, 2 level), `draft: string`. `step = ans.length`.
- Flags: `typing = step < 2`, `askLevel = step === 2`, `finished = step >= 3`.
- `push(text)`: trim; ignore empty; `ans.concat([v])`, `draft = ''`. Used by chip tap, level tap, and form submit (`preventDefault`).
- Chat log: for i = 0..min(step,3): teacher bubble `q[i]`; if i < step, user bubble `ans[i]`. So after finishing, the closing line `q[3]` appears.
- Bubble style:
  - teacher: left (`flex-start`), radius `4px 18px 18px 18px`, bg `p.surface`, ink `p.ink`, border `p.cardBorder`, with avatar.
  - user: right (`flex-end`), radius `18px 4px 18px 18px`, bg `a.btnBg`, ink `a.btnInk`, border none.
- `restart()` -> `ans = [], draft = ''`.
- Output to persist: `{topic: ans[0], goal: ans[1], level: ans[2]}` (used by Preview).

## Layout

1. **Header** (height 44, `padding: 20px 20px 0 20px`, space-between)
   - Back link -> Onboarding, `aria-label="선생님 고르기로 돌아가기"`: 44x44, radius 22, border `p.cardBorder`, bg `p.surface`, chevron stroke `p.ink`.
   - Step dots (`aria-label="3단계 중 2단계"`, gap 6): [6x6 `a.text`] [24x6 `a.text`] [6x6 `p.line`], radius 3.
   - `2 / 3` — width 44, 13px, `p.sub`, right.
2. **Chat area** (`aria-live="polite"`; `flex: 1; overflow-y: auto; padding: 16px 20px; column; gap: 12px`)
   - Row: flex, justify `m.align`, `align-items: flex-start`, gap 8.
   - Teacher avatar: 36 x 33, state base, no jump, `flex: none` (only on teacher rows).
   - Bubble `<p>`: max-width 78%, padding 10px 14px, 15px / 22px, radius/bg/ink/border per above.
   - **Level picker** (when `askLevel`): `role="radiogroup"` aria-label `지금 수준`, column gap 8, `padding-left: 44px` (aligns with bubbles). Buttons: min-height 52, padding 10px 16px, radius 16, border `p.cardBorder`, bg `p.surface`, column gap 2; label 15px 700; hint 12px `p.sub`.
   - **Summary card** (when `finished`; `aria-label="정리"`): margin-top 4, border `1.5px solid p.line`, radius 18, padding 14px 16px, column gap 8.
     - Eyebrow `선생님이 정리한 내용` — 12px 700 `a.text`.
     - `<dl>` grid `64px 1fr`, row-gap 6, 14px / 21px. dt color `p.sub`:
       - `주제` -> `{topic}` (700)
       - `목적지` -> `{goal}`
       - `지금 수준` -> `{level}`
3. **Composer** (when `typing`)
   - Chips row: padding `0 20px 8px 20px`, flex gap 8, `overflow-x: auto`. Chip: `flex: none`, height 36, padding 0 12, radius 18, border `1.5px solid p.line`, transparent, `p.ink`, 13px.
   - Form: flex, align center, gap 8, padding `8px 16px 28px 16px`, border-top `1px solid p.line`.
     - Input `#topic-input`: flex 1, height 48, padding 0 16, radius 24, border `1.5px solid p.line`, bg `p.surface`, `p.ink`, 15px, `outline-color: a.text`, autocomplete off.
     - Send button (`aria-label="보내기"`, submit): 48x48, radius 24, bg `a.btnBg`, color `a.btnInk`; up-arrow icon 20x20 (`M12 19V5`, `M6 11l6-6 6 6`), stroke currentColor 2.2.
   - Note: no composer at step 2 (level uses buttons only).
4. **Finished footer** (when `finished`; padding `8px 20px 28px 20px`, flex gap 8)
   - `다시 답하기` button: width 104, height 56, border `1.5px solid p.line`, radius 18, transparent, `p.ink`, 15px. onClick `restart`.
   - Link `학습 시간 정하기` -> Schedule: flex 1, height 56, radius 18, bg `a.btnBg`, color `a.btnInk`, 17px 700.

## Motion

Shared `ci-*` character CSS only. Legacy unused: `.sl-breathe` (3.2s), `.sl-eyes`/`sl-blink` (4.6s). No typing indicator or message-enter animation in the mockup.

## Characters

| Where | Who | Size | State | Jump |
|---|---|---|---|---|
| each teacher bubble | current teacher | 36x33 | base | no |
