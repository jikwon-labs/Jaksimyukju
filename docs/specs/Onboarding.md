# Onboarding (선생님 고르기, 1/3)

Source: `mockup/Onboarding.dc.html`. Dark variant = wrapper with `theme="다크"`.

- Frame: 390 x 844, bg `p.bg`, color `p.ink`, Noto Sans KR. Root `flex column; padding: 20px 20px 24px 20px; gap: 16px`.
- Props: `teacher` (initial pick, default 온), `theme`.
- Accent `a` is computed from the **currently picked** teacher (live: changes as the user taps a card).

## State & logic

- `picked` = `state.picked || props.teacher || '온'`. Comment in source: "처음에는 성향 질문으로 추천된 선생님(온)이 선택된 상태" — i.e. the initial value should be the Personality recommendation.
- `pickOn/pickGyeol/pickSae` -> `setState({picked})`.
- `recoName` is hardcoded `'온'` and `reco = accent(온)` in the mockup; real impl: use Personality result. The `추천` badge is also hard-placed on the 온 card (should follow the recommended teacher).
- `accent(x)`: dark ? `{text: x.body, tint: rgba(x.body,.16), btnBg: x.body, btnInk:'#111114'}` : `{text: x.deep, tint: x.tint, btnBg: x.deep, btnInk:'#FFFFFF'}`.
- Per-card style `option(key)` (`on = key === picked`, `ax = accent(that teacher)`):
  - border: on ? `2px solid ax.text` : `2px solid transparent`
  - bg: on ? `ax.tint` : `p.surface`
  - name color: `ax.text` (always teacher-colored)
  - radio ring: on ? `none` : `2px solid p.line`
  - radio dot bg: on ? `ax.btnBg` : transparent
  - check stroke: on ? `ax.btnInk` : transparent

## Layout (top to bottom)

1. **Header** (height 44, space-between, align center)
   - Back link -> Personality (`aria-label="성향 질문으로 돌아가기"`): 44x44, radius 22, border `p.cardBorder`, bg `p.surface`, chevron 20x20 stroke `p.ink` width 2.
   - Step dots (`aria-label="3단계 중 1단계"`, gap 6px): [24x6 `a.text`] [6x6 `p.line`] [6x6 `p.line`], radius 3.
   - `1 / 3` — width 44, 13px, `p.sub`, right aligned.
2. **Stage** (height 176, flex, `align-items: flex-end`, center, relative)
   - Floor shadow: absolute, bottom 4px, 150 x 18, `border-radius: 50%`, bg `a.tint`.
   - Big character of the picked teacher: 168 x 154, state base, **jump=true**, class `sl-arrive` (re-mounts on each pick so the arrive animation replays). aria-labels: `파란 동그라미 온`, `빨간 동그라미 결`, `초록 동그라미 새`.
3. **Title block** (column, gap 6px, centered)
   - `<h1>` 24px / 32px, 700, -0.5px: `함께할 선생님을 데려오세요`
   - `<p>` 14px / 20px, `p.sub`: `답변을 보니 ` + `<strong color=reco.text 700>{recoName}</strong>` + ` 선생님이 잘 맞아요. 언제든 바꿀 수 있고, 진도는 그대로예요.`
4. **Teacher cards** (`role="radiogroup"` aria-label `선생님`, column gap 10px). Each `<button role="radio" aria-checked>`:
   - flex, align center, gap 12px, left text, min-height 80, padding `10px 16px 10px 10px`, radius 20, border/bg per `option()`, color `p.ink`.
   - Mini character 60 x 55, state base, no jump (aria-hidden).
   - Text column (flex 1, gap 2px):
     - Row (gap 6px): name in Jua 20px colored `o.x.name`; title 14px 700; (온 only) badge `추천` — 11px, 700, color `#FFFFFF`, bg `#2F62D9` (hardcoded, not tokenized), radius 999, padding 2px 7px.
     - Description 13px / 18px, `p.sub`.
   - Radio: 24x24, radius 12, border-box, ring/dot per `option()`, check icon 14x14 stroke width 3.
   - Copy (verbatim):
     | Teacher | Title | Description |
     |---|---|---|
     | 온 | `다정한 페이스메이커` | `지친 날엔 5분 버전부터 권해 줘요` |
     | 결 | `단호하고 성격 급한 코치` | `목표까지 남은 분량을 숫자로 짚어 줘요` |
     | 새 | `호기심 많은 탐험가` | `다른 분야와 엮은 질문으로 흥미를 붙여 줘요` |
5. Spacer `flex: 1`.
6. **CTA** link `{t.name} 선생님과 시작하기` (e.g. `온 선생님과 시작하기`) -> Topic. Height 56, radius 18, bg `a.btnBg`, color `a.btnInk`, 17px 700. Picked teacher must be persisted (Topic/Schedule/Preview read `teacher`).

## Motion (screen-specific, verbatim)

Used: `.sl-arrive` on the big character.

```css
.sl-arrive{animation:sl-arrive 0.6s cubic-bezier(.3,1.6,.5,1) both}
@keyframes sl-arrive{0%{transform:translateY(24px) scale(0.8,1.2);opacity:0}60%{transform:translateY(-6px) scale(1.08,0.92);opacity:1}100%{transform:translateY(0) scale(1,1)}}
@media (prefers-reduced-motion: reduce){.sl-breathe,.sl-eyes,.sl-pupils,.sl-sprout,.sl-arrive{animation:none}}
```

Also defined but unused by markup: `sl-breathe` (3.2s), `sl-blink` (4.6s), `sl-look` (7s), `sl-sprout` (`0%,100%{rotate(-8deg)}50%{rotate(8deg)}`, 2.8s). Plus the shared `ci-*` character CSS.

## Characters

| Where | Who | Size | State | Jump |
|---|---|---|---|---|
| stage | picked teacher | 168x154 | base | yes (+ sl-arrive) |
| card 1/2/3 | 온/결/새 | 60x55 | base | no |
