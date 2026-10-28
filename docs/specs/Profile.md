# Profile (내 정보) — `mockup/Profile.dc.html`

Frame 390x844, `p.bg`, Noto Sans KR. Tab screen ("내 정보" active). No generator — spec from HTML.

**Palette note:** local palettes (same values as common.py for bg/surface/ink/sub/line/future/tab/cardBorder) plus:
- `surfaceOnTint`: 화이트 `#FFFFFF` · 다크 `#1C1C21`
- Theme from `props.theme` only (+ `기기 설정` → sysDark); ignores `st.themeSel`.
- Accent `a` = `{text, tint, btnBg, btnInk}` (no glow).
- Teachers here carry a `role` field (see copy).

## 1. Layout

Scroll area: absolute `top:0; left:0; right:0; bottom:76px`, overflow-y auto, padding `20px 20px 24px`, column gap 14.

1. **Header** h 44: h1 `내 정보` 22px/700, ls -0.4px.
2. **My teacher card** (`aria-label="내 선생님"`): bg `a.tint`, radius 24, padding `16px 18px 16px 12px`, flex center gap 12.
   - Character slot 96x88 (flex none, align flex-end, justify center): one of three SVGs shown via `is.on / is.gyeol / is.sae` (96x88, jump on). aria-labels: `파란 동그라미 온` / `빨간 동그라미 결` / `초록 동그라미 새` (새 has `overflow: visible`).
   - Text column (flex 1, gap 4): `내 선생님` 12px `p.sub`; row (baseline gap 6): name in **Jua** 26px `a.text` + role 14px/700; `함께한 지 11일` 12px `p.sub`.
   - Link `바꾸기` → `Onboarding.dc.html`: h 40, padding 0 12, radius 12, bg `p.surfaceOnTint`, ink `p.ink`, 13px/500.
3. **Stats** (`aria-label="학습 기록"`): grid 3 cols gap 8. Each tile: bg `p.surface`, border `p.cardBorder`, radius 18, padding `14px 12px`, column gap 2; label 12px `p.sub`; value **Jua** 28px (first tile `a.text`, others ink).
4. **Skill chart** (`aria-label="실력 변화"`): bg `p.surface`, border `p.cardBorder`, radius 20, padding 16, column gap 12.
   - Row (baseline, space-between): h2 `실력 변화` 15px/700 · `주차별 퀴즈 점수` 12px `p.sub`.
   - Bars: `role="img"`, grid 6 cols gap 10, align end, h 120. Each column flex column justify-end gap 6, h 120: score label 12px/700 (`s.labelInk`) above bar (`width:100%; height:s.h; radius 8; bg s.bg; border s.border`).
   - X-axis: grid 6 cols gap 10, 11.5px `p.sub`, centered.
   - Note 12px / lh 18 `p.sub`.
5. **Settings list** (`aria-label="설정"`): bg `p.surface`, border `p.cardBorder`, radius 20, padding `4px 0`. Rows are links (all → `Settings.dc.html`): flex center gap 12, min-h 52, padding 0 16, border-top `r.divider`, 14px; value 13px `p.sub`; chevron 16x16 stroke `p.sub` width 2, path `M9 6l6 6-6 6`.
6. **Bottom tab nav**: identical to Group.md (h 76), with `내 정보` active (`a.text`, 700, icon stroke 2).

## 2. Copy (verbatim)

- `내 정보`, `내 선생님`, `함께한 지 11일`, `바꾸기`
- Roles: 온 `다정한 페이스메이커` · 결 `단호하고 성격 급한 코치` · 새 `호기심 많은 탐험가`
- Stats: `연속 학습` `8일` · `최장 기록` `8일` · `완료 레슨` `8개`
- Chart: `실력 변화` · `주차별 퀴즈 점수`; aria-label `1주차 퀴즈 80점. 2주차부터는 아직 퀴즈 전`
- X-axis: `1주` `2주` `3주` `4주` `5주` `6주`
- Note: `주차 마지막 날 퀴즈를 풀면 그래프가 채워져요. 2주차 퀴즈는 금요일에 열려요.`
- Settings rows (label — value):
  - `학습 요일` — `월–금` (en dash)
  - `하루 학습 시간` — `10분`
  - `알림 시각` — `오후 9:30`
  - `화면 테마` — `기기 설정`
  - `지난 과정` — `없음`
  - `계정` — (empty)
- Tabs: `오늘` `커리큘럼` `그룹` `내 정보`

## 3. State & logic

```js
var key = this.props.teacher || '결';
var raw = [80, null, null, null, null, null];   // weekly quiz scores, null = not yet
scores = raw.map(v => v === null
  ? { label: '-',      labelInk: p.sub,  h: '24px',                    bg: 'transparent', border: '1.5px dashed ' + p.line }
  : { label: v + '점', labelInk: a.text, h: Math.round(v*0.9) + 'px', bg: a.btnBg,      border: 'none' });
// 80 -> 72px bar
settings[i].divider = i === 0 ? 'none' : '1px solid ' + p.line
is = { on: key==='온', gyeol: key==='결', sae: key==='새' }
```
No interactive state. Navigation: `바꾸기` → Onboarding; every settings row → Settings; tabs.

## 4. Animation

Shared `CI_CSS` only. The file also contains legacy unused slime CSS (`.sl-breathe/.sl-eyes/.sl-pupils/.sl-sprout` + keyframes) — ignore.

## 5. Characters

- One character 96x88 in the teacher card, current teacher, state `base`, **jump on**.
