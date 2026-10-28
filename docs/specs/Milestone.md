# Milestone (마일스톤 피드백)

Source: `mockup/Milestone.dc.html` (+ `MilestoneDark.dc.html` wrapper).
Frame 390 x 844, bg `p.bg`, ink `p.ink`, Noto Sans KR (no Jua).

Local colors:
```js
var good = p.dark ? { bg: 'rgba(76,195,138,0.16)', ink: '#7FD9AC' } : { bg: '#E2F5EA', ink: '#1F6B42' };
var warn = p.dark ? { bg: 'rgba(255,181,71,0.14)', ink: '#FFC56B' } : { bg: '#FFF1DC', ink: '#8A3F06' };
```

## 1. Layout

**Scroll area**: absolute top 0 / left 0 / right 0 / bottom 96px, overflow-y auto, padding 20px 20px 24px 20px, column gap 14.

1. **Header** (height 44, flex center gap 12)
   - Back `<a href="Curriculum.dc.html" aria-label="커리큘럼으로 돌아가기">` 44 x 44 radius 22, bg `p.surface`, border `p.cardBorder`, chevron-left 20px stroke `p.ink` (`M15 5l-7 7 7 7`).
   - Column: "재무제표 읽기 · 2주차" 12px `p.sub`; "마일스톤 피드백" 17px/700.
2. **Assignment card** `aria-label="과제"`: bg `p.surface`, border `p.cardBorder`, radius 20, padding 16, column gap 8.
   - "이번 주 과제" 12px/700 `a.text`
   - "내 회사 현금흐름 한 장 요약" 17px/700
   - "영업·투자·재무 활동을 나누고, 숫자 근거를 붙이고, 한 줄 결론으로 끝낸다" 13px/20px `p.sub`
3. **Edit section** (stage `edit` only) `aria-label="고쳐 쓰기"`, column gap 8:
   - `label for="ms-text"` "고쳐 쓰기" 14px/700
   - `textarea#ms-text` rows 9, width 100%, padding 14px 16px, radius 16, `1.5px solid p.line`, bg `p.surface`, ink `p.ink`, 14px/22px, resize none, outline-color `a.text`. Value `draft`.
4. **Submitted + feedback** (every stage except `edit`):
   - Submitted card `aria-label="내가 제출한 요약"`: `1.5px solid p.line`, radius 20, padding 14px 16px, column gap 6.
     - "내가 제출한 요약 · {round}차" 12px/700 `p.sub`
     - Body `p` 14px/22px, `white-space: pre-line` (text contains `\n`).
   - Feedback section `aria-label="선생님 피드백"`, column gap 12:
     - Row (flex-start, gap 10): character 44 x 40; speech bubble `p` flex 1, bg `p.surface`, border `p.cardBorder`, radius `4px 16px 16px 16px`, padding 10px 14px, 14px/21px, text `headline`.
     - Criteria card: bg `p.surface`, border `p.cardBorder`, radius 20, padding 6px 16px. Each row: flex center gap 10, min-height 48, `border-top` none for first else `1px solid p.line`; label 14px flex 1; status pill 12px/700 radius 999 padding 4px 10px, `충족` → good.bg/good.ink, else warn.bg/warn.ink.
     - Fixes (stage `feedback` only): `h2` "고칠 점 3개" 15px/700; `ol` padding-left 20, column gap 8, 14px/22px.

**Bottom action bar**: absolute bottom 0, height 96, padding 12px 20px 28px 20px, bg `p.bg`, `border-top: 1px solid p.line`, flex gap 8.
- stage `feedback`: "고쳐서 다시 제출" button flex 1, height 56, radius 18, no border, `a.btnBg`/`a.btnInk`, 17px/700.
- stage `edit`: "취소" width 96, height 56, `1.5px solid p.line`, radius 18, transparent, ink `p.ink`, 15px; + "제출하기" flex 1 (primary style as above).
- stage `review`: bar is empty.
- stage `passed`: `<a href="Curriculum.dc.html">` flex 1, primary style: "3주차로 넘어가기".

## 2. Copy (verbatim)

Initial submitted text (`first`, rendered with line breaks):
```
영업활동: 플러스. 본업으로 돈을 벌고 있다.
투자활동: 마이너스.
재무활동: 대출을 조금 갚았다.
```

Criteria labels: "세 활동을 나눴다", "숫자 근거가 있다", "한 줄 결론이 있다".
States before passing: "충족", "보완 필요", "빠짐". After passing: all "충족".

Fixes list (static):
1. 영업활동이 플러스라고만 썼어요. 얼마인지, 작년보다 늘었는지 숫자 하나를 붙여 주세요.
2. 투자활동이 마이너스인 이유가 빠졌어요. 무엇을 샀는지 한 단어면 충분해요.
3. 마지막에 "그래서 이 회사는 현금이 넉넉하다 또는 빠듯하다"는 한 줄 결론을 넣어 주세요.

Headline (speech bubble):
- stage review (all teachers): "다시 읽어 보는 중이에요..."
- feedback / edit (`t.first`):
  - 온: "세 활동을 잘 나눴어요. 숫자 하나와 한 줄 결론만 더하면 완성이에요."
  - 결: "구분은 됐습니다. 근거 숫자와 결론이 없으면 요약이 아닙니다. 두 가지 채워서 다시 내세요."
  - 새: "오, 구분은 깔끔해요! 숫자 하나랑 결론 한 줄이 붙으면 이야기가 완성될 거예요."
- passed (`t.pass`):
  - 온: "완벽해요. 이번 주도 끝까지 해냈어요. 3주차에서 만나요."
  - 결: "통과입니다. 이 정도면 됐습니다. 3주차 바로 시작합니다."
  - 새: "이제 이 회사 이야기가 한 장에 다 보여요! 3주차엔 체력 검사를 해 볼 거예요."

Buttons: "고쳐서 다시 제출", "취소", "제출하기", "3주차로 넘어가기".

## 3. State & logic

`stage`: `feedback` (default) → `edit` → `review` → (after 1500 ms timeout) `passed`. `cancel` returns to `feedback`.
`submitted` = last submitted text (default `first`); `round` = 2 once something was resubmitted, else 1.
`draft` defaults to `first`. Note: during `review` the criteria still show the pre-pass states; fixes are hidden.

```js
    var first = '영업활동: 플러스. 본업으로 돈을 벌고 있다.\n투자활동: 마이너스.\n재무활동: 대출을 조금 갚았다.';
    var s = this.state || {};
    var stage = s.stage || 'feedback'; // feedback, edit, review, passed
    var self = this;
    var passed = stage === 'passed';
    var states = passed ? ['충족', '충족', '충족'] : ['충족', '보완 필요', '빠짐'];
    var labels = ['세 활동을 나눴다', '숫자 근거가 있다', '한 줄 결론이 있다'];
    var criteria = labels.map(function (l, i) {
      var ok = states[i] === '충족';
      return { label: l, state: states[i], bg: ok ? good.bg : warn.bg, ink: ok ? good.ink : warn.ink, divider: i === 0 ? 'none' : '1px solid ' + p.line };
    });
    var reviewing = stage === 'review';
    return { f: face(t.name, reviewing ? 'think' : 'base'),
      t: t, p: p, a: a, criteria: criteria,
      editing: stage === 'edit', showing: stage !== 'edit', canEdit: stage === 'feedback', passed: passed,
      hasFixes: stage === 'feedback',
      round: s.submitted ? 2 : 1,
      submitted: s.submitted || first,
      draft: s.draft === undefined ? first : s.draft,
      faceClass: reviewing ? 'sl-think' : 'sl-breathe',
      headline: reviewing ? '다시 읽어 보는 중이에요...' : (passed ? t.pass : t.first),
      onDraft: function (e) { self.setState({ draft: e.target.value }); },
      startEdit: function () { self.setState({ stage: 'edit' }); },
      cancel: function () { self.setState({ stage: 'feedback' }); },
      submit: function () {
        var text = (self.state && self.state.draft !== undefined ? self.state.draft : first);
        self.setState({ stage: 'review', submitted: text });
        self.timer = setTimeout(function () { self.setState({ stage: 'passed' }); }, 1500);
      }
    };
```
Clear the timer on unmount. In the real product the review would be an AI call; the mock fakes pass after 1.5 s.

## 4. Animation CSS

None in use. `faceClass` and the `.sl-breathe/.sl-think/.sl-eyes` CSS (keyframes `sl-breathe`, `sl-wobble`, `sl-blink`) are leftovers not referenced by the markup; teacher objects also carry unused `brows`/`mouth` fields. Character motion comes from the shared `ci-*` CSS (see Pause.md); the think face shows the `ci-dots` thinking dots.

## 5. Character

| where | size | state | jump |
|---|---|---|---|
| Left of feedback speech bubble | 44 x 40 | base; think while stage = review | no |
