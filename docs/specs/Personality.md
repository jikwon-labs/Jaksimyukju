# Personality (성향 질문)

Source: `mockup/Personality.dc.html`. Dark variant `PersonalityDark.dc.html` = wrapper with `theme="다크"`.

- Frame: 390 x 844, bg `p.bg`, color `p.ink`, Noto Sans KR. Root is `display: flex; flex-direction: column; padding: 20px 20px 24px 20px; gap: 18px`.
- Props: only `theme` (no `teacher` prop — this screen is teacher-neutral; colors come from the recommended teacher only after finishing).
- Local palette subset: bg, surface, ink, sub, line, future, cardBorder (same values as common.py).

## Data

Questions (verbatim; each option maps to a teacher):

1. `공부를 빼먹은 다음 날, 듣고 싶은 말은?`
   - `괜찮아요, 오늘은 5분만 해요` -> 온
   - `어제 빠졌으니 오늘은 두 개 합니다` -> 결
   - `오늘 건 이런 게 궁금하지 않아요?` -> 새
2. `어떤 선생님이 편한가요?`
   - `칭찬을 많이 해 주는 선생님` -> 온
   - `목표를 분명하게 짚어 주는 선생님` -> 결
   - `엉뚱한 질문을 던지는 선생님` -> 새
3. `혼자 공부를 그만둘 때, 가장 큰 이유는?`
   - `지쳐서` -> 온
   - `느슨해져서` -> 결
   - `지루해져서` -> 새

Option order is always 온, 결, 새.

Teacher "why" lines (shown on result):

- 온: `지친 날에도 부담 없이 돌아올 수 있게, 5분 버전부터 다정하게 권해 줄 거예요.`
- 결: `느슨해질 틈이 없게, 목표와 남은 분량을 숫자로 짚어 줄 거예요.`
- 새: `지루해질 틈이 없게, 다른 분야와 엮은 질문으로 흥미를 붙여 줄 거예요.`

## State & logic

- `answers: string[]` (teacher keys), initial `[]`. `step = answers.length`; `finished = step >= 3`.
- Pick option -> `answers.concat([teacherKey])` (advances immediately, no confirm).
- `back()` (이전 질문) -> drop last answer. On step 0 this is a no-op (button still shown).
- `restart()` (다시 답하기) -> `answers = []`.
- **Recommendation rule**: count votes per teacher. `best = answers[0] || '온'`, then iterate keys in order 온, 결, 새 and replace `best` only if `counts[k] > counts[best]` (strictly greater). Effectively: majority wins; on a 1-1-1 tie the first question's answer wins.
- `reco` colors: `text`/`btnBg` = dark ? teacher.body : teacher.deep; `btnInk` = dark ? `#111114` : `#FFFFFF`.
- `stepLabel`: finished ? `완료` : `질문 {step+1} / 3`.
- Progress bars: bar i (1..3) is "on" when `step >= i` OR (not finished and step === i-1). i.e. the current question's bar is also filled. On color = dark ? `p.ink` : `#111113`; off = `p.line`.
- `dim` opacity per character: when finished, recommended = 1, others = 0.35; while asking, all 1.
- Recommended teacher should be passed to Onboarding (mockup hardcodes 온 there).

## Layout (top to bottom)

1. **Header** (height 44, flex, space-between, align center)
   - Left: `작심육주` — Jua 22px.
   - Right: `{stepLabel}` — 13px, `p.sub`.
2. **Progress bar** (`role="progressbar"`, aria-valuemax 3, aria-valuenow `min(step,3)`, aria-label `성향 질문 진행`): grid 3 equal columns, gap 6px; each bar height 6, radius 3, color as above.
3. **Character trio** (`aria-hidden`, flex, center, `align-items: flex-end`, gap 4px, height 92px):
   - 온 76x70, 결 88x81 (center, larger), 새 76x70 (`overflow: visible`). State base, **no jump**. Each wrapped in a `<g opacity={dim.x}>`.
4. **Asking block** (when `!finished`; flex column, gap 18px)
   - Eyebrow `나에게 맞는 선생님 찾기` — 13px, 700, `p.sub`; then `<h1>` `{q.title}` 24px / 33px, 700, letter-spacing -0.5px. (These two in a column with gap 6px.)
   - Options (`role="radiogroup"`, aria-label = question title; column, gap 10px). Each `<button role="radio">`: min-height 60, padding 14px 18px, radius 18, border `p.cardBorder`, bg `p.surface`, color `p.ink`, 15px / 22px, left-aligned.
   - Footnote: 12px / 18px, `p.sub`: `정답은 없어요. 가장 가까운 걸 골라 주세요. 선생님은 나중에 언제든 바꿀 수 있어요.`
5. **Result block** (when `finished`; column, gap 14px)
   - Eyebrow `답변을 모두 받았어요` — 13px, 700, `p.sub`.
   - `<h1>` 24px / 33px, 700, -0.5px: `<span color=reco.text>{reco.name}</span> 선생님이 잘 맞아요`
   - `<p>` 15px / 23px, `p.sub`: `{reco.why}`.
   - `다시 답하기` button: `align-self: flex-start`, height 44, padding 0 14px, radius 14, border `1.5px solid p.line`, transparent bg, color `p.ink`, 14px.
6. Spacer `flex: 1`.
7. **Bottom**
   - Finished: link `선생님 만나러 가기` -> Onboarding. Height 56, radius 18, bg `reco.btnBg`, color `reco.btnInk`, 17px 700.
   - Asking: button `이전 질문` — height 48, no border, transparent, `p.sub`, 14px; onClick `back`.

## Motion

- Shared character CSS (circle_face.py `CSS`).
- The file also defines legacy `.sl-*` classes that **are not used** by any element (safe to drop): `sl-breathe 3.2s`, `sl-blink 4.6s`, `sl-look 7s`, `.sl-d1 {animation-delay:-1.1s}`, `.sl-d2 {-2.2s}`.
- No transitions on option press; answering is instant.

## Characters

| Where | Who | Size | State | Jump | Note |
|---|---|---|---|---|---|
| trio left | 온 | 76x70 | base | no | opacity dim.on |
| trio center | 결 | 88x81 | base | no | opacity dim.gyeol |
| trio right | 새 | 76x70 | base | no | opacity dim.sae |
