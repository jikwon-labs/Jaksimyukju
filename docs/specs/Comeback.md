# Comeback (다시 왔어요)

Source: `mockup/Comeback.dc.html` (+ `ComebackDark.dc.html`); generator `tools/screens/s1.py` (`comeback_body`, `comeback_js`).
Frame 390 x 844, bg `p.bg`, ink `p.ink`, Noto Sans KR (no Jua). Shown when the learner returns after missing days (linked from the notification "3일 쉬었어요. 계획을 다시 짜 뒀어요" in Notifications).

## 1. Layout

**Scroll area**: absolute inset 0, overflow-y auto, padding 20px 20px 32px 20px, column gap 14.

1. **Header**: height 44, flex, justify flex-end. Close `<a href="Main.dc.html" aria-label="닫기">` 44 x 44 radius 22, bg `p.surface`, border `p.cardBorder`, X icon 20px stroke `p.ink` width 2.
2. **Greeting row**: flex, align flex-end, gap 10.
   - Character 76 x 70 (listen, jump), overflow visible, flex none.
   - Speech bubble `p`: margin 0 0 10px 0, flex 1, bg `p.surface`, border `p.cardBorder`, radius `18px 18px 18px 4px`, padding 12px 14px, 15px/23px, text `greet`.
3. **Last-week card** `aria-label="쉬었던 기간"`: bg `p.surface`, border `p.cardBorder`, radius 22, padding 16, column gap 12.
   - Row (baseline, space-between): `h2` "지난 일주일" 15px/700; "3일 쉬었어요" 12px `p.sub`.
   - 7-column grid gap 6 (`role=img aria-label="월화 학습, 수목금 쉼, 오늘 토요일"`). Each cell column center gap 4: square (width 100%, aspect-ratio 1, radius 10, bg `c.bg`, border `c.border`) + day label 11px ink `c.ink`.
   - Note 13px/20px `p.sub`, with bold `<b style="color: p.ink">최장 기록 8일</b>`.
4. **Plan section** `aria-label="밀린 진도 다시 짜기"`, column gap 8:
   - `h2` "밀린 레슨 3개, 어떻게 할까요?" 15px/700, margin 4px 0 0 4px.
   - `role=radiogroup aria-label="다시 짜는 방법"`, column gap 8. Each option button: flex, align flex-start, gap 12, padding 14, radius 18, border `o.border`, bg `o.bg`, ink `p.ink`, left aligned.
     - Radio ring 22 x 22 radius 11, margin-top 1, border `o.ring`; inner dot 10 x 10 radius 5 bg `o.dot`.
     - Title row (gap 6): title 15px/700 + recommend pill (only on the teacher's pick) 11px/700 radius 999 padding 2px 8px, bg `a.btnBg`, ink `a.btnInk`, text "{t.name} 추천".
     - Description 13px/19px `p.sub`.
     - Selected: border `2px solid a.text`, bg `a.tint`, ring `2px solid a.text`, dot `a.text`. Unselected: border `2px solid transparent`, bg `p.surface`, ring `2px solid p.line`, dot transparent.
5. **Privacy note** `p` 12px/18px `p.sub`, contains link `<a href="Pause.dc.html">` "쉬어 가기" (ink `a.text`, 700).
6. **Actions** (column gap 8):
   - Primary `<a href="Lesson.dc.html">`: height 56, radius 18, `a.btnBg`/`a.btnInk`, 16px/700.
   - Secondary `<a href="Curriculum.dc.html">`: height 48, radius 16, ink `p.ink`, 14px, no bg/border.

## 2. Copy (verbatim)

Greeting (`greet`):
- 온: "3일 만이에요. 와 줘서 정말 반가워요. 오늘은 가볍게 5분만 해요."
- 결: "3일 비었습니다. 괜찮습니다. 지금 다시 맞추면 금요일 마일스톤은 지킬 수 있습니다."
- 새: "3일 동안 어디 다녀왔어요? 그동안 재밌는 예시를 하나 찾아 뒀어요."

Week card: "지난 일주일", "3일 쉬었어요", note:
"연속 8일은 여기서 끝났지만 **최장 기록 8일**은 그대로 남아요. 오늘 하면 다시 1일째예요."

Section title: "밀린 레슨 3개, 어떻게 할까요?"

Rescheduling options:
| id | title | description |
|---|---|---|
| delay | 뒤로 미루기 | 과정이 3일 늘어나요. 6주가 6주 3일이 되고, 하루 분량은 그대로예요. |
| squeeze | 압축하기 | 기간은 그대로. 다음 주 레슨 3개에 밀린 내용을 5분씩 붙여요. |
| skip | 요약으로 넘기기 | 밀린 3개는 3분짜리 요약 카드로 대신하고 바로 오늘 칸으로 가요. |

Teacher recommendation (pill "{t.name} 추천", also the default selection): 온 → delay (뒤로 미루기), 결 → squeeze (압축하기), 새 → skip (요약으로 넘기기).

Privacy note: "그룹에는 "돌아왔어요"만 알려요. 왜 쉬었는지는 묻지 않아요. 야근 주간이나 휴가처럼 미리 알면 [쉬어 가기]를 걸어 두세요. 연속 기록이 끊기지 않아요."

Buttons: "이대로 다시 짜고 오늘 5분만 하기" (→ Lesson), "바뀐 길 먼저 보기" (→ Curriculum).

## 3. State & logic

State `plan` (default = teacher's recommended id). Primary CTA label does not change with the plan.

Week strip data: `[['일','r'],['월',3],['화',2],['수','x'],['목','x'],['금','x'],['토','today']]`
- `'r'` = regular rest day (weekend): transparent, `1px dashed p.line`, label `p.sub`.
- number = studied, intensity level → bg `rgba(t.body, lv[n])`, `lv = dark ? [0,0.3,0.55,0.8] : [0,0.35,0.6,0.9]`, no border, label `p.sub`.
- `'x'` = missed: bg `p.warnBg`, label `p.warn`.
- `'today'`: transparent, `2px solid a.text`, label `a.text`.

```js
    var greet = { '온': '3일 만이에요. 와 줘서 정말 반가워요. 오늘은 가볍게 5분만 해요.', '결': '3일 비었습니다. 괜찮습니다. 지금 다시 맞추면 금요일 마일스톤은 지킬 수 있습니다.', '새': '3일 동안 어디 다녀왔어요? 그동안 재밌는 예시를 하나 찾아 뒀어요.' }[t.name];
    var reco = { '온': 'delay', '결': 'squeeze', '새': 'skip' }[t.name];
    var pick = st.plan || reco;
    var opts = [
      ['delay', '뒤로 미루기', '과정이 3일 늘어나요. 6주가 6주 3일이 되고, 하루 분량은 그대로예요.'],
      ['squeeze', '압축하기', '기간은 그대로. 다음 주 레슨 3개에 밀린 내용을 5분씩 붙여요.'],
      ['skip', '요약으로 넘기기', '밀린 3개는 3분짜리 요약 카드로 대신하고 바로 오늘 칸으로 가요.']
    ];
    var plans = opts.map(function (o) {
      var on = pick === o[0];
      return {
        title: o[1], desc: o[2], on: on, reco: reco === o[0] ? 'inline-block' : 'none',
        border: on ? '2px solid ' + a.text : '2px solid transparent', bg: on ? a.tint : p.surface,
        ring: on ? '2px solid ' + a.text : '2px solid ' + p.line, dot: on ? a.text : 'transparent',
        pick: function () { self.setState({ plan: o[0] }); }
      };
    });
    var lv = p.dark ? [0, 0.3, 0.55, 0.8] : [0, 0.35, 0.6, 0.9];
    var days = [['일', 'r'], ['월', 3], ['화', 2], ['수', 'x'], ['목', 'x'], ['금', 'x'], ['토', 'today']];
    var week = days.map(function (d) {
      var v = d[1];
      return {
        day: d[0], ink: v === 'today' ? a.text : (v === 'x' ? p.warn : p.sub),
        bg: v === 'r' || v === 'today' ? 'transparent' : (v === 'x' ? p.warnBg : rgba(t.body, lv[v])),
        border: v === 'r' ? '1px dashed ' + p.line : (v === 'today' ? '2px solid ' + a.text : 'none')
      };
    });
    var out = { fl: face(t.name, 'listen'), greet: greet, plans: plans, week: week };
```

Navigation: close → Main; "쉬어 가기" link → Pause; primary → Lesson; secondary → Curriculum.

## 4. Animation CSS

None screen-specific. Shared `ci-*` character CSS (see Pause.md), including `ci-jump`.

## 5. Character

| where | size | state | jump |
|---|---|---|---|
| Left of greeting bubble | 76 x 70 | listen (tilted) | yes |
