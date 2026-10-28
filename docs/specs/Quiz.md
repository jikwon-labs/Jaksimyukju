# Quiz (2주차 퀴즈)

Source: `mockup/Quiz.dc.html` (+ `QuizDark.dc.html` wrapper with theme 다크).
Frame 390 x 844, bg `p.bg`, ink `p.ink`, Noto Sans KR. Frame itself is a flex column: `padding: 20px 20px 28px 20px; gap: 18px` (no scroll container, no tab bar).
Jua is used only for the score number on the result view.

## Colors local to this screen
"정답은 초록, 오답은 주황 (빨강은 결 선생님 색이라 쓰지 않는다)"
```js
var good = p.dark ? { bg: 'rgba(76,195,138,0.16)', line: '#7FD9AC', ink: '#7FD9AC', mark: '#7FD9AC', markInk: '#111114' } : { bg: '#E2F5EA', line: '#1F7A4A', ink: '#1F6B42', mark: '#1F7A4A', markInk: '#FFFFFF' };
var bad = p.dark ? { bg: 'rgba(255,181,71,0.14)', line: '#FFB547', ink: '#FFC56B', mark: '#FFB547', markInk: '#111114' } : { bg: '#FFF1DC', line: '#B45309', ink: '#8A3F06', mark: '#B45309', markInk: '#FFFFFF' };
```
(These differ slightly from common.py `p.good/p.warn`; use these values.)

## 1. Layout (top to bottom)

1. **Header** (height 44, flex, space-between, center)
   - Close button `<a href="Curriculum.dc.html" aria-label="커리큘럼으로 돌아가기">` 44 x 44, radius 22, bg `p.surface`, border `p.cardBorder`; X icon 20px stroke `p.ink` width 2 (`M18 6L6 18`, `M6 6l12 12`).
   - Center title "2주차 퀴즈" 15px/700.
   - Right counter: width 44, right aligned, 13px `p.sub`, text `{counter}`.
2. **Progress segments** `role=progressbar` (max 3, now `doneCount`, label "퀴즈 진행"): 3-col grid gap 6; each bar height 6 radius 3, bg = `p.line` if unanswered, `good.line` if correct, `bad.line` if wrong.
3. **Question view** (while not finished), column gap 16:
   - `h1` question 22px / line-height 31px / 700 / -0.4px.
   - Options `role=radiogroup`, column gap 10. Each button: flex center gap 12, min-height 58, padding 12px 16px, radius 18, border `o.border`, bg `o.bg`, ink `p.ink`, 15px, left aligned.
     - Mark circle 28 x 28 radius 14, 13px/700, letters A/B/C/D, bg `o.markBg`, ink `o.markInk`.
     - Label flex 1.
     - Before answering: border `2px solid transparent`, bg `p.surface`, mark bg `p.future` ink `p.sub`.
     - After answering: the correct option uses `good` (border `2px solid good.line`, bg good.bg, mark good.mark/good.markInk); the picked wrong option uses `bad`; others unchanged.
   - Feedback (after answering, `aria-live=polite`): radius 18, padding 14px 16px, bg `fb.bg`, column gap 6; title 14px/700 ink `fb.ink`; explanation `p` 14px / 22px (ink `p.ink`).
4. **Result view** (finished), column center gap 14, padding-top 24, centered text:
   - Character 140 x 128 (joy), aria-label "기뻐서 통통 튀는 {t.name} 선생님".
   - "2주차 퀴즈 결과" 14px `p.sub`.
   - `{score} / 3` — **Jua** 48px / 52px, ink `a.text`.
   - Teacher result line 15px / 23px.
   - "점수는 내 정보의 실력 변화 그래프에 반영돼요." 13px / 20px `p.sub`.
   - "다시 풀기" button: height 44, padding 0 16px, radius 14, `1.5px solid p.line`, transparent, ink `p.ink`, 14px.
5. Spacer `flex: 1`.
6. **Bottom CTA**
   - When answered (and not finished): button height 56, radius 18, no border, bg `a.btnBg`, ink `a.btnInk`, 17px/700, label `nextLabel`.
   - When finished: `<a href="Milestone.dc.html">` same style: "마일스톤 제출하러 가기".

## 2. Copy (verbatim)

Questions (answer index is 0-based):

1. "감가상각비는 현금흐름표를 만들 때 어디에서 다시 더해질까요?"
   - A 영업활동 (정답) · B 투자활동 · C 재무활동 · D 더하지 않는다
   - why: "감가상각은 돈이 나가지 않는 비용이라, 영업활동 현금흐름을 구할 때 순이익에 다시 더해요."
2. "공장 설비를 사는 데 쓴 돈은 어느 활동에 들어갈까요?"
   - A 영업활동 · B 투자활동 (정답) · C 재무활동 · D 어디에도 안 들어간다
   - why: "오래 쓸 자산을 사고파는 돈은 투자활동이에요. 비용은 몇 년에 나눠 잡지만 현금은 산 해에 나가요."
3. "은행에서 빌린 돈을 갚으면 어느 활동에 적힐까요?"
   - A 영업활동 · B 투자활동 · C 재무활동 (정답) · D 손익계산서에만 적힌다
   - why: "돈을 빌리고 갚는 일, 주주에게 배당하는 일은 재무활동이에요."

Feedback titles: correct "정답이에요"; wrong "아쉬워요. 정답은 {A|B|C|D}예요".
Counter: "{idx+1} / 3" while playing, "완료" when finished.
Next button: "다음 문제" (questions 1-2), "결과 보기" (question 3).

Per-teacher result line (`t.result`):
- 온: "이번 주도 끝까지 왔어요. 틀린 문제는 다음 주 첫 레슨에서 한 번 더 볼게요."
- 결: "틀린 건 다음 주 첫 레슨에서 다시 나옵니다. 그때는 맞혀야 합니다."
- 새: "틀린 문제가 제일 재밌는 문제예요. 다음 주에 다른 각도로 또 만나요."

## 3. State & logic

State: `idx` (current question, default 0; `idx >= 3` → finished), `picks` (array of chosen option indexes).
- Picking an option is allowed only once per question (no change after answering).
- `next` → `idx + 1`. `retry` → `{ idx: 0, picks: [] }`.
- `score` = count of picks equal to answer.
- `doneCount = min(idx + (answered ? 1 : 0), 3)`.

```js
    var s = this.state || {};
    var idx = s.idx || 0, picks = s.picks || [];
    var finished = idx >= qs.length;
    var self = this;
    var picked = finished ? null : (picks[idx] === undefined ? null : picks[idx]);
    var answered = picked !== null;
    var score = picks.reduce(function (n, v, i) { return n + (v === qs[i].answer ? 1 : 0); }, 0);
    var marks = ['A', 'B', 'C', 'D'];
    var q = finished ? { text: '', options: [], why: '' } : {
      text: qs[idx].text, why: qs[idx].why,
      options: qs[idx].options.map(function (label, i) {
        var isAns = i === qs[idx].answer, isPick = i === picked;
        var st = !answered ? null : (isAns ? good : (isPick ? bad : null));
        return {
          label: label, mark: marks[i], checked: isPick,
          border: st ? '2px solid ' + st.line : '2px solid transparent',
          bg: st ? st.bg : p.surface,
          markBg: st ? st.mark : p.future, markInk: st ? st.markInk : p.sub,
          pick: function () {
            if (answered) return;
            var next = picks.slice(); next[idx] = i;
            self.setState({ picks: next });
          }
        };
      })
    };
    var right = answered && picked === qs[idx].answer;
    return { fjoy: face(t.name, 'joy'),
      t: t, p: p, a: a, q: q,
      playing: !finished, finished: finished, answered: answered && !finished,
      counter: finished ? '완료' : (idx + 1) + ' / 3',
      doneCount: Math.min(idx + (answered ? 1 : 0), 3),
      bars: qs.map(function (x, i) {
        var v = picks[i];
        return { bg: v === undefined ? p.line : (v === x.answer ? good.line : bad.line) };
      }),
      fb: right ? { bg: good.bg, ink: good.ink, title: '정답이에요' } : { bg: bad.bg, ink: bad.ink, title: '아쉬워요. 정답은 ' + (finished ? '' : marks[qs[idx].answer]) + '예요' },
      nextLabel: idx === qs.length - 1 ? '결과 보기' : '다음 문제',
      next: function () { self.setState({ idx: idx + 1 }); },
      retry: function () { self.setState({ idx: 0, picks: [] }); },
      score: score
    };
```

Navigation: close → `Curriculum.dc.html`; finished CTA → `Milestone.dc.html`.

## 4. Animation CSS

No screen-specific animation in use. The file still contains leftover, unused CSS (`.sl-hop`, `.sl-eyes`, keyframes `sl-hop`, `sl-blink`) from an older character; safe to drop. Shared `ci-*` character CSS applies (see Pause.md).

## 5. Character

| where | size | state | jump |
|---|---|---|---|
| Result view, top center | 140 x 128 | joy (hops via `ci-hop`) | no |
