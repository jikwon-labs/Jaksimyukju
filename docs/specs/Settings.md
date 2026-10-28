# Settings (설정) — `mockup/Settings.dc.html`

Generator: `tools/screens/s2.py` (section "설정"); matches HTML. Frame 390x844, `p.bg`, Noto Sans KR. Palette/accent/`sw()`/`switch()` from `common.py`.

**Theme note:** this is the only screen that writes `st.themeSel`; `common.py` reads `st.themeSel || props.theme`, so picking a theme here re-skins the screen live (`기기 설정` follows `prefers-color-scheme`).

## 1. Layout

`SCROLL_OPEN` (absolute inset 0, overflow-y auto, padding `20px 20px 32px`, column gap 14).

1. `back('Profile.dc.html', '설정')`.
2. Each section: column gap 8; h2 label 13px/700 `p.sub`, margin `4px 0 0 4px`. Cards: bg `p.surface`, border `p.cardBorder`, radius 20.

### Section `학습 일정`
Card padding 16, column gap 14.
- Block (gap 8): label `학습 요일` 14px; `role="group"` grid 7 cols gap 6; day buttons h 40, radius 12, 13px/700, padding 0, `aria-pressed`. Caption 12px `p.sub`.
  - on: bg `a.btnBg`, ink `a.btnInk`, border none
  - off: bg transparent, ink `p.sub`, border `1.5px solid p.line`
- Block (gap 8): label `하루 학습 시간` 14px; `role="radiogroup"` grid 4 cols gap 6; buttons h 40, radius 12, 13px/700 (segment style below).

Segment style `seg()`: on → bg `a.tint`, ink `a.text`, border `2px solid a.text`; off → bg transparent, ink `p.ink`, border `1.5px solid p.line`.

### Section `알림`
Card, column (no padding). Rows separated by divider `h 1px; margin 0 16px; bg p.line`.
1. Time stepper row: flex center gap 12, min-h 60, padding `8px 16px`.
   - Text column (flex 1, gap 2): `선생님 알림 시각` 14px + sub 12px `p.sub`.
   - `-` button (aria-label `30분 앞으로`): 36x36, radius 18, `1.5px solid p.line`, transparent, 18px.
   - Value `aria-live="polite"`, min-w 76, centered, 15px/700.
   - `+` button (aria-label `30분 뒤로`): same as `-`.
2. `switch('swPoke','tPoke', ...)` — common switch row (min-h 56, 48x28 track).
3. `switch('swWeek','tWeek', ...)`
4. `switch('swGroup','tGroup', ...)`

### Section `화면 테마`
`role="radiogroup"` grid 3 cols gap 8 (no card). Buttons h 48, radius 14, 14px/700, `seg()` style.

### Section `과정과 계정`
Card, column. Rows are links: flex center gap 12, min-h 52, padding 0 16, border-top `r.divider` (first none, else `1px solid p.line`), ink `p.ink`, 14px; label flex 1; value 13px `p.sub`; chevron 16x16 stroke `p.sub` `M9 6l6 6-6 6`.

## 2. Copy (verbatim)

- Header `설정`
- `학습 일정` / `학습 요일` / day labels `월` `화` `수` `목` `금` `토` `일`
- `고르지 않은 날은 쉬는 날이에요. 연속 기록이 끊기지 않아요.`
- `하루 학습 시간` / `5분` `10분` `20분` `30분`
- `알림`
  - `선생님 알림 시각` — `이 시각까지 안 했으면 한 번만 알려요`; time label e.g. `오후 9:30`
  - Switch `콕 찌르기 받기` — `하루 최대 1번`
  - Switch `주간 회고` — `일요일 밤 9시`
  - Switch `그룹 소식` — `연속 기록, 완료 소식`
- `화면 테마` / `기기 설정` `화이트` `다크`
- `과정과 계정` rows (label — value → href):
  - `쉬어 가기 예약` — `남은 10일` → Pause.dc.html
  - `선생님 바꾸기` — `{t.name}` (온/결/새) → Onboarding.dc.html
  - `과정 기간과 목표` — `6주` → Curriculum.dc.html
  - `알림 목록` — `` → Notifications.dc.html
  - `학습 기록 내보내기` — `` → Settings.dc.html (placeholder)
  - `로그아웃` — `` → Welcome.dc.html

## 3. State & logic

```js
days: st.days || [true,true,true,true,true,false,false]   // Mon–Fri on
  toggle(i) -> copy array, flip i
mins: st.mins || 10; options [5,10,20,30] -> seg(m, x, x+'분', 'mins')
themeSel: st.themeSel || props.theme || '화이트'; options ['기기 설정','화이트','다크'] -> seg(th, x, x, 'themeSel')
tm: st.tm === undefined ? 21.5 : st.tm      // hours as float, 0.5 = :30
  hh = floor(tm); mm = tm % 1 ? '30' : '00'
  timeLabel = (hh < 12 ? '오전 ' : '오후 ') + (hh % 12 === 0 ? 12 : hh % 12) + ':' + mm
  earlier: tm = max(6, tm - 0.5)    // floor 오전 6:00
  later:   tm = min(23, tm + 0.5)   // ceiling 오후 11:00
flags fPoke / fWeek / fGroup: default true; flip on click
  swPoke = sw(flag('fPoke')) etc.
sw(on) = { on, bg: on ? a.btnBg : p.line, knob: on ? a.btnInk : p.knobOff, x: on ? '20px' : '0px' }
```
Switch track transition `background 0.15s`, knob `transform 0.15s` (from common `switch()`).

## 4. Animation

None besides the switch transitions. No character.

## 5. Characters

None.
