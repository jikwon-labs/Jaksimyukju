# Roommate (주간 회고) — `mockup/Roommate.dc.html`

Generator: `tools/screens/s2.py` (section "룸메이트 주간 회고"); matches HTML. Frame 390x844, `p.bg`, Noto Sans KR. Palette/accent/`sw()`/`switch()` from `common.py`.

A 3-question chat with the teacher ("룸메이트"), answered by tapping chips, ending in a pledge card.

## 1. Layout

**Scroll area**: absolute `top:0; left:0; right:0; bottom:{bottomPad}`, overflow-y auto, padding 20, column gap 12.

1. **Header** (flex center gap 10, h 48):
   - Back link → `Main.dc.html`: 44x44, radius 22, border `p.cardBorder`, bg `p.surface`, chevron 20x20 stroke `p.ink` 2 (`M15 5l-7 7 7 7`). (Hand-written, not `back()`.)
   - Character 44x40 (jump).
   - Column (flex 1): `2주차 돌아보기` 16px/700; sub 12px `p.sub`.
2. **Week summary** (`aria-label="이번 주 요약"`): grid 4 cols gap 6. Tile: bg `p.surface`, border `p.cardBorder`, radius 16, padding 10, column gap 2; label 11px `p.sub`; value 16px/700.
3. **Chat** (`aria-live="polite"`, column gap 8). Each bubble row flex `justify-content: msg.align`; bubble `p`: max-width 82%, padding `10px 14px`, radius `msg.radius`, bg `msg.bg`, ink `msg.ink`, 14px / lh 21.
   - Teacher bubble: align flex-start, bg `p.surface`, ink `p.ink`, radius `16px 16px 16px 4px`.
   - User bubble: align flex-end, bg `a.btnBg`, ink `a.btnInk`, radius `16px 16px 4px 16px`.
   - Typing indicator (if `typing`): `.rm-dots`, align-self flex-start, padding `12px 14px`, radius 16, bg `p.surface`; three 6x6 dots bg `p.sub`. aria-label `{t.name} 선생님이 입력 중`.
4. **When finished**:
   - Pledge card (`aria-label="다음 주 다짐"`): bg `a.btnBg`, ink `a.btnInk`, radius 22, padding 18, column gap 8. Eyebrow 12px/700 opacity .85; pledge 18px / lh 26 / 700; milestone 13px / lh 19 opacity .85.
   - Card (bg `p.surface`, border `p.cardBorder`, radius 20) containing `switch('share','toggleShare', ...)`.

**Bottom bar (asking)**: absolute bottom, padding `12px 20px 28px`, bg `p.bg`, border-top `1px solid p.line`, column gap 8. Chip buttons: min-h 48, padding `10px 16px`, radius 16, border `1.5px solid a.text`, bg `p.bg`, ink `a.text`, 14px/700, left-aligned.

**Bottom bar (finished)**: absolute bottom, padding `12px 20px 28px`, bg `p.bg`. Link → `Main.dc.html`: h 56, radius 18, `a.btnBg`/`a.btnInk`, 16px/700.

## 2. Copy (verbatim)

- Header: `2주차 돌아보기` / `룸메이트 {t.name} · 일요일 밤 3분`
- Summary: `레슨` `4/5` · `잔디` `4칸` · `연속` `9일` · `시간` `42분`

**Teacher lines** (index 0 = Q1, 1 = Q2, 2 = Q3, 3 = closing):

온
0. `한 주 고생 많았어요. 이번 주에 제일 기억에 남는 건 뭐였어요?`
1. `그거 정말 어려운 부분인데 잘 잡았어요. 그럼 제일 하기 싫었던 날은 언제였어요?`
2. `수요일에 5분 버전으로라도 이어 간 덕에 연속이 끊기지 않았어요. 다음 주 수요일은 처음부터 5분 버전으로 잡아 둘까요?`
3. `좋아요. 다음 주도 같이 가요.`

결
0. `2주차 정리합니다. 이번 주에 확실히 남은 건 뭡니까?`
1. `좋습니다. 다음. 제일 하기 싫었던 날은 언제였습니까?`
2. `수요일은 5분으로 버텼습니다. 그게 연속을 지켰습니다. 다음 주 수요일은 아예 5분으로 고정하죠.`
3. `확정합니다. 금요일 마일스톤까지 이대로 갑니다.`

새
0. `이번 주 탐험 일지 써 볼까요? 제일 기억에 남는 발견은 뭐였어요?`
1. `오, 그거 저도 처음엔 신기했어요. 그럼 제일 귀찮았던 날은요?`
2. `수요일에 5분만 한 게 신의 한 수였어요. 다음 주 수요일은 처음부터 5분 모험으로 해 볼까요?`
3. `좋아요! 다음 주엔 재무상태표라는 새 지도를 펼쳐 봐요.`

**Answer chips** (same for all teachers):
- Q1: `감가상각은 현금이 안 나간다는 것` · `영업·투자·재무로 나누는 법` · `솔직히 잘 모르겠어요`
- Q2: `화요일, 야근해서` · `수요일, 피곤해서 5분만 했어요` · `딱히 없었어요`
- Q3: `좋아요, 그렇게 해요` · `아니요, 10분 해 볼게요`

**Pledge card**:
- Eyebrow `3주차 다짐 카드`
- Pledge: `월·화·목·금은 10분, 수요일은 5분 버전` (default) or `월–금 매일 10분, 수요일도 전체 버전` (if Q3 = `아니요, 10분 해 볼게요`)
- `금요일 마일스톤: 재무상태표 한 장 요약`
- Switch `그룹에 다짐 공유하기` — sub `다짐 한 줄만 보여요. 대화 내용은 나만 봐요`
- Button `다짐 저장하고 마치기`

## 3. State & logic

```js
answers = st.answers || [];  step = answers.length;   // 0..3
msgs: for i in 0..min(step,3):
  if i > 0: push user bubble answers[i-1]
  if (i < step || !st.typing): push teacher bubble tone[i]
// -> teacher reply to the latest answer is withheld while typing
finished = step >= 3 && !st.typing
asking   = step < 3 && !st.typing
bottomPad = step < 3 ? (step === 2 ? '150px' : '210px') : '96px'   // 3 chips 210, 2 chips 150
chip.pick(c): setState({answers: answers.concat([c]), typing: true});
              clearTimeout(timer); timer = setTimeout(() => setState({typing:false}), 900)
five   = answers[2] !== '아니요, 10분 해 볼게요'
pledge = five ? '월·화·목·금은 10분, 수요일은 5분 버전' : '월–금 매일 10분, 수요일도 전체 버전'
share  = st.share === undefined ? true : st.share;  toggleShare flips
```
- While typing: no chips (asking=false), dots shown, bottomPad still from step.
- Timer cleared on unmount (common `componentWillUnmount`).
- Navigation: back → Main; finish → Main. Entry from Notifications item `2주차 돌아보기가 도착했어요`.
- Real impl: Q1/Q2 chips are canned in mock; teacher replies are per-tone static lines (AI could personalize). Answer chips content is lesson-specific (재무제표 course).

## 4. Animation (screen CSS, verbatim)

```css
.rm-dots span{display:inline-block;width:6px;height:6px;border-radius:3px;margin:0 2px;animation:ci-dots 1.2s ease-in-out infinite}
.rm-dots span:nth-child(2){animation-delay:0.2s}.rm-dots span:nth-child(3){animation-delay:0.4s}
```
Uses `@keyframes ci-dots{0%,100%{opacity:0.3}50%{opacity:1}}` from shared `CI_CSS`.

## 5. Characters

- Header: my teacher, 44x40, `base`, jump on, aria-label `{t.name} 선생님`.
