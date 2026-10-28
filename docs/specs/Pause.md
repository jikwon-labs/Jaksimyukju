# Pause (쉬어 가기)

Source: `mockup/Pause.dc.html` (+ `PauseDark.dc.html`); generator `tools/screens/s3.py` (identical to the mockup, verified).
Frame 390 x 844, bg `p.bg`, ink `p.ink`, Noto Sans KR (no Jua). Pre-schedule rest days so the streak is not broken. Linked from Settings ("쉬어 가기 예약 · 남은 10일") and Comeback.

Mock "today": 10월 29일 목요일 (이번 주 월-수 already past).

## 1. Layout

**Scroll area**: absolute inset 0, overflow-y auto, padding 20px 20px 32px 20px, column gap 14.

1. **Header** (shared `back()`): height 44, flex center gap 8. Back `<a href="Settings.dc.html" aria-label="뒤로">` 44 x 44 radius 22, bg `p.surface`, border `p.cardBorder`, chevron-left 20px stroke `p.ink` width 2. `h1` "쉬어 가기" 18px/700/-0.3px.
2. **Teacher row**: flex, align flex-end, gap 10. Character 72 x 66 (listen, jump). Bubble `p`: margin 0 0 8px 0, flex 1, bg `p.surface`, border `p.cardBorder`, radius `18px 18px 18px 4px`, padding 12px 14px, 14px/21px.
3. **Days section** `aria-label="쉴 날"`, column gap 8:
   - `h2` "언제 쉴까요?" 15px/700, margin 4px 0 0 4px.
   - Presets `role=radiogroup aria-label="빠른 선택"`: 3-col grid gap 6; buttons (`role=radio`) height 44, radius 14, 13px/700, border/bg/ink from `seg()`.
   - Calendar card: bg `p.surface`, border `p.cardBorder`, radius 20, padding 14, column gap 10.
     - Per week (gap 6): label 12px `p.sub`; 5-col grid gap 6 of day buttons: height 52, radius 14, padding 0, column centered gap 1; weekday 11px opacity .85; date 15px/700. `aria-pressed=on`, `aria-disabled=past`.
       - on: bg `a.btnBg`, ink `a.btnInk`, border none.
       - off: bg transparent, ink `p.ink`, border `1.5px solid p.line`.
       - past: ink `p.line` (clicks ignored).
     - Footnote 12px `p.sub`.
4. **Reason section** `aria-label="이유"`, column gap 8:
   - `h2` "이유 " 15px/700 + inline span "선택 · 그룹에는 보이지 않아요" 12px/400 `p.sub`.
   - Chips (flex wrap gap 6): height 40, padding 0 14px, radius 20, 13px/500, `aria-pressed`, style from `seg()`.
5. **Effects box** `aria-label="쉬면 이렇게 돼요"`: bg `a.tint`, radius 20, padding 16, column gap 10.
   - Kicker "쉬면 이렇게 돼요" 12px/700 `a.text`.
   - Each effect: flex gap 10, 14px/21px; check icon 18px stroke `a.text` width 2.4, margin-top 2.
6. **Limit note** `p` 12px/18px `p.sub`.
7. **CTA** `<a href="Main.dc.html">`: height 56, radius 18, 16px/700, bg/ink from `cta`.

`seg(on)`: on → bg `a.tint`, ink `a.text`, border `2px solid a.text`; off → transparent, ink `p.ink`, `1.5px solid p.line`.

## 2. Copy (verbatim)

Teacher line:
- 온: "미리 말해 줘서 고마워요. 쉬는 동안엔 알림도 쉬게 할게요."
- 결: "좋습니다. 미리 빼 두면 계획이 무너지지 않습니다."
- 새: "어디 가요? 돌아오면 이어서 탐험해요."

Presets: "이번 주 남은 날" · "다음 주" · "직접 고르기".
Week labels: "이번 주" (월 26, 화 27, 수 28 past; 목 29, 금 30) · "다음 주" (월 2, 화 3, 수 4, 목 5, 금 6).
Day aria-label: `(past ? '지난 날 ' : '') + {요일}요일 {date}일 + (on ? ', 쉬는 날' : '')`.
Calendar footnote: "학습일만 골라요. 원래 쉬는 주말은 빠져 있어요."
Reasons: "야근 주간" · "출장" · "휴가" · "그냥 좀 쉬고 싶어요".

Effects:
- n = 0: "쉴 날을 골라 주세요"
- n > 0:
  - "연속 기록 8일은 그대로 이어져요"
  - "과정이 {n}일 늘어나요. 6주 과정이 6주 {n}일이 돼요"
  - "쉬는 날엔 알림과 콕 찌르기가 멈춰요"
  - "그룹에는 "쉬어 가는 중"으로만 보여요"

Limit note: "한 과정에서 최대 10일까지 미리 쉬어 갈 수 있어요. 남은 날 {left}일. 쉬는 중에도 언제든 돌아와 바로 이어 할 수 있어요."

CTA: n = 0 → "쉴 날을 골라 주세요" (bg `p.future`, ink `p.sub`); else "{n}일 쉬어 가기" (bg `a.btnBg`, ink `a.btnInk`).

## 3. State & logic

State: `preset` ('next' default | 'rest' | 'custom'), `picked` (array of date strings, defaults to preset's days), `reason` ('' default; tapping the selected chip clears it).
- Selecting a preset sets `picked` to its dates (custom keeps current picks).
- Toggling any day switches `preset` to 'custom'. Past days ignore clicks.
- `left = max(0, 10 - n)`. The 10-day cap is not enforced in the mock (only displayed).
- CTA is always a link to Main (even in the n = 0 "disabled" look) — implement as disabled.

```js
    var line = { '온': '미리 말해 줘서 고마워요. 쉬는 동안엔 알림도 쉬게 할게요.', '결': '좋습니다. 미리 빼 두면 계획이 무너지지 않습니다.', '새': '어디 가요? 돌아오면 이어서 탐험해요.' }[t.name];
    // 오늘은 10월 29일 목요일. 이번 주 월~수는 이미 지난 날
    var cal = [
      { label: '이번 주', days: [['월', '26', true], ['화', '27', true], ['수', '28', true], ['목', '29', false], ['금', '30', false]] },
      { label: '다음 주', days: [['월', '2', false], ['화', '3', false], ['수', '4', false], ['목', '5', false], ['금', '6', false]] }
    ];
    var presetDays = { rest: ['29', '30'], next: ['2', '3', '4', '5', '6'], none: [] };
    var preset = st.preset || 'next';
    var picked = st.picked || presetDays[preset] || [];
    var weeks = cal.map(function (w) {
      return { label: w.label, days: w.days.map(function (d) {
        var on = picked.indexOf(d[1]) >= 0, past = d[2];
        return {
          wd: d[0], date: d[1], on: on, past: past,
          aria: (past ? '지난 날 ' : '') + d[0] + '요일 ' + d[1] + '일' + (on ? ', 쉬는 날' : ''),
          bg: on ? a.btnBg : 'transparent', ink: past ? p.line : (on ? a.btnInk : p.ink),
          border: on ? 'none' : '1.5px solid ' + p.line,
          toggle: function () {
            if (past) return;
            var n = on ? picked.filter(function (x) { return x !== d[1]; }) : picked.concat([d[1]]);
            self.setState({ picked: n, preset: 'custom' });
          }
        };
      }) };
    });
    var seg = function (on, label, pick) {
      return { label: label, on: on, bg: on ? a.tint : 'transparent', ink: on ? a.text : p.ink, border: on ? '2px solid ' + a.text : '1.5px solid ' + p.line, pick: pick };
    };
    var presets = [['rest', '이번 주 남은 날'], ['next', '다음 주'], ['custom', '직접 고르기']].map(function (o) {
      return seg(preset === o[0], o[1], function () { self.setState({ preset: o[0], picked: o[0] === 'custom' ? picked : presetDays[o[0]] }); });
    });
    var reason = st.reason || '';
    var reasons = ['야근 주간', '출장', '휴가', '그냥 좀 쉬고 싶어요'].map(function (r) {
      return seg(reason === r, r, function () { self.setState({ reason: reason === r ? '' : r }); });
    });
    var n = picked.length;
    var effects = n === 0 ? [{ text: '쉴 날을 골라 주세요' }] : [
      { text: '연속 기록 8일은 그대로 이어져요' },
      { text: '과정이 ' + n + '일 늘어나요. 6주 과정이 6주 ' + n + '일이 돼요' },
      { text: '쉬는 날엔 알림과 콕 찌르기가 멈춰요' },
      { text: '그룹에는 "쉬어 가는 중"으로만 보여요' }
    ];
    var out = {
      fl: face(t.name, 'listen'), line: line, weeks: weeks, presets: presets, reasons: reasons, effects: effects,
      left: Math.max(0, 10 - n),
      cta: n === 0 ? { label: '쉴 날을 골라 주세요', bg: p.future, ink: p.sub } : { label: n + '일 쉬어 가기', bg: a.btnBg, ink: a.btnInk }
    };
```

## 4. Animation CSS

No screen-specific CSS. Shared character motion CSS (from `tools/circle_face.py`, included in every screen in this set):

```css
/* 동그라미 선생님 모션: 숨쉬기, 두리번, 깜빡임, 8초마다 점프(봇 아바타 타이밍) */
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

## 5. Character

| where | size | state | jump |
|---|---|---|---|
| Left of teacher bubble under header | 72 x 66 | listen (tilted) | yes |
