# Finish (목적지 도착)

Source: `mockup/Finish.dc.html` (+ `FinishDark.dc.html`); generator `tools/screens/s2.py` (`fin_body`, `fin_js`, `fin_css`).
Frame 390 x 844, bg `p.bg`, ink `p.ink`, Noto Sans KR (no Jua). Reached from the Curriculum destination flag.

## 1. Layout

**Scroll area** (shared `SCROLL_OPEN`): absolute inset 0, overflow-y auto, padding 20px 20px 32px 20px, column gap 14.

1. **Header** (shared `back()`): height 44, flex center gap 8.
   - Back `<a href="Curriculum.dc.html" aria-label="뒤로">` 44 x 44 radius 22, bg `p.surface`, border `p.cardBorder`, chevron-left 20px stroke `p.ink` width 2.
   - `h1` "목적지 도착" 18px/700/-0.3px, flex 1.
2. **Hero card** `section.fn-rise aria-label="과정 완료"`: relative, bg `a.btnBg`, ink `a.btnInk`, radius 28, padding 22px 20px 20px 20px, column center gap 8, centered text, overflow hidden.
   - Flag icon 44px, stroke `a.btnInk` width 2 (`M6 21V4`, `M6 4h11l-2 4 2 4H6`).
   - Character 110 x 101 (joy).
   - "6주 과정 완주" 13px/700 opacity .85
   - `h1` "재무제표 읽기" 26px / 34px / 700 / -0.6px
   - Teacher line 14px/21px opacity .9
3. **Stats grid** `aria-label="6주 기록"`: 2 columns, gap 8. Each tile: bg `p.surface`, border `p.cardBorder`, radius 18, padding 14, column gap 2; label 12px `p.sub`; value 20px/700.
4. **Before/after card** `aria-label="처음과 지금"`: bg `p.surface`, border `p.cardBorder`, radius 20, padding 16, column gap 12.
   - Block (gap 3): "처음 (1주차 진단)" 12px `p.sub`; quote 14px/21px.
   - Divider 1px `p.line`.
   - Block: "지금 (최종 마일스톤)" 12px/700 `a.text`; text 14px/21px.
   - Link `<a href="Milestone.dc.html">` "최종 결과물 다시 보기", align-self flex-start, 13px/700, `a.text` (underlined default).
5. **Save button**: height 52, radius 16, `1.5px solid p.line`, bg `saveBg`, ink `saveInk`, 15px/700.
   - Unsaved: transparent / `p.ink`. Saved: `p.goodBg` / `p.good`.
6. **Next course section** `aria-label="다음 과정"`, column gap 8:
   - `h2` "{t.name} 선생님이 추천하는 다음 길" 15px/700, margin 6px 0 0 4px.
   - 2 cards `<a href="Topic.dc.html">`: flex center gap 12, padding 14, radius 18, bg `p.surface`, border `p.cardBorder`, ink `p.ink`; title 15px/700, desc 12px/18px `p.sub` (gap 3); chevron-right 16px stroke `p.sub`.
   - Primary `<a href="Topic.dc.html">` "새 주제 직접 정하기": height 52, radius 16, `a.btnBg`/`a.btnInk`, 15px/700.

## 2. Copy (verbatim)

Teacher line (`line`):
- 온: "6주 동안 한 번도 포기하지 않았어요. 정말 자랑스러워요."
- 결: "목표 달성. 처음 세운 계획대로 끝냈습니다."
- 새: "처음엔 낯선 숫자였는데, 이제 회사 이야기가 읽히죠?"

Stats: 채운 칸 "29 / 30" · 최장 연속 "19일" · 퀴즈 평균 "84점" · 함께한 사람 "3명".

Before: "영업이익이랑 순이익이 뭐가 다른지 모르겠어요" (rendered with straight double quotes around it).
Now: "관심 회사 두 곳의 재무제표를 한 장으로 요약하고, 현금흐름 위험 신호 3가지를 찾았어요."

Save label: unsaved "수료 카드 저장하기"; saved "수료 카드를 사진첩에 저장했어요".

Next courses:
- "재무제표 주석 읽기" — "숫자 뒤의 설명까지. 4주 · 지금 실력에서 바로 이어져요"
- "가치평가 맛보기" — "읽은 재무제표로 회사 값 매겨 보기. 6주"

Other: "6주 과정 완주", "재무제표 읽기", "처음 (1주차 진단)", "지금 (최종 마일스톤)", "최종 결과물 다시 보기", "새 주제 직접 정하기".

## 3. State & logic

```js
    var line = { '온': '6주 동안 한 번도 포기하지 않았어요. 정말 자랑스러워요.', '결': '목표 달성. 처음 세운 계획대로 끝냈습니다.', '새': '처음엔 낯선 숫자였는데, 이제 회사 이야기가 읽히죠?' }[t.name];
    var saved = !!st.saved;
    var out = {
      fj: face(t.name, 'joy'), line: line,
      stats: [{ label: '채운 칸', value: '29 / 30' }, { label: '최장 연속', value: '19일' }, { label: '퀴즈 평균', value: '84점' }, { label: '함께한 사람', value: '3명' }],
      saveLabel: saved ? '수료 카드를 사진첩에 저장했어요' : '수료 카드 저장하기', saveBg: saved ? p.goodBg : 'transparent', saveInk: saved ? p.good : p.ink,
      save: function () { self.setState({ saved: true }); },
      next: [
        { title: '재무제표 주석 읽기', desc: '숫자 뒤의 설명까지. 4주 · 지금 실력에서 바로 이어져요' },
        { title: '가치평가 맛보기', desc: '읽은 재무제표로 회사 값 매겨 보기. 6주' }
      ]
    };
```
- `saved` is one-way (no unsave). Real impl: generate a completion-card image and save/share.
- Navigation: back → Curriculum; "최종 결과물 다시 보기" → Milestone; course cards and "새 주제 직접 정하기" → Topic.

## 4. Animation CSS

```css
.fn-rise{animation:fn-rise 0.8s cubic-bezier(.3,1.3,.5,1) both}
@keyframes fn-rise{0%{transform:translateY(30px) scale(0.9);opacity:0}100%{transform:none;opacity:1}}
@media (prefers-reduced-motion: reduce){.fn-rise{animation:none}}
```
Applied to the hero card on mount. Shared `ci-*` CSS for the character (see Pause.md).

## 5. Character

| where | size | state | jump |
|---|---|---|---|
| Hero card, under the flag icon | 110 x 101 | joy (hops) | no |
