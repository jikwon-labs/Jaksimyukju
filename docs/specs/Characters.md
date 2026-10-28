# Characters (동그라미 선생님) — `Teachers.dc.html`, `CharacterCircle.dc.html`, `tools/circle_face.py`

All three teachers share the same round body (circle r=38 in viewBox `0 0 120 110`); only color and face (eyes, brows, mouth, cheeks) differ. SVG paths per state live in `circle_face.py` `FACES` and are rendered by `inner()`; implement as one `<Character teacher state jump small size />` component.

## Teachers (verbatim copy from Teachers.dc.html)

Board title `선생님 3인`; intro: `처음 앱을 열 때 한 명을 데려온다. 가르치는 내용은 같고, 몸은 같은 동그라미이고 색과 표정, 말투, 챙기는 방식이 다르다.`

| | 온 | 결 | 새 |
|---|---|---|---|
| role | `다정한 페이스메이커` | `단호하고 성격 급한 코치` | `호기심 많은 탐험가` |
| body | #5B8CFF | #FF6B5E | #4CC38A |
| deep | #2F62D9 | #D63A30 | #1F7A4A |
| tint | #E6EEFF | #FFE9E5 | #E2F5EA |
| card bg (board) | #F0F4FF | #FFF3F1 | #EEF8F2 |
| sample line | `"오늘도 와 줬네요. 10분만 같이 해요"` | `"이번 주 목표까지 레슨 2개 남았습니다"` | `"오늘 건 요리랑 닮았어요. 왜인지 볼래요?"` |
| 생김새 | `크고 둥근 눈, 볼 터치, 위로 휜 입` | `V자 눈썹, 위가 일자로 잘린 반쯤 감은 눈, 처진 입` | `크기가 다른 짝짝이 눈, 한쪽만 올라간 눈썹, 동그란 입` |
| 빠진 날 | `"5분 버전"을 먼저 권한다. 죄책감을 주지 않는다` | `목표와 남은 분량을 숫자로 짚는다` | `새로운 질문 하나로 호기심을 건드린다` |
| 잘 맞는 사람 | `쉽게 지치고 자책하는 사람` | `분명한 목표와 압박이 있어야 움직이는 사람` | `재미없으면 금방 질리는 사람` |
| aria-label (hero) | `파란 동그라미 온, 둥근 눈과 볼 터치, 웃는 입` | `빨간 동그라미 결, V자 눈썹과 반쯤 감은 눈, 처진 입` | `초록 동그라미 새, 짝짝이 큰 눈과 한쪽만 올라간 눈썹, 동그란 입` |

Teacher card layout (board, 1350 wide): bg = card bg, radius 28, padding 28, gap 16; character 180x165 (jump); name Jua 40px in `deep`; role 16px/700; three 18px color swatches w/ hex 12px #63636B; sample line bubble bg #FFFFFF radius `16px 16px 16px 4px` padding `12px 16px` 15px/lh 22; `dl` grid `76px 1fr`, 13px/lh 20, dt #63636B.

CharacterCircle one-liner captions:
- 온 `크고 둥근 눈에 하이라이트 · 볼 터치 · 위로 휜 입`
- 결 `V자 눈썹 · 위가 일자로 잘린 반쯤 감은 눈 · 아래로 처진 입`
- 새 `짝짝이 큰 눈에 반짝임 두 개 · 한쪽만 올라간 눈썹 · 동그란 입`

## States (5, same for all teachers)

From Teachers.dc.html section `상태별 표정` (`· 세 선생님 모두 같은 다섯 상태를 가진다 (예시: 결)`), 96x88 each, no jump:

| state | label | caption (verbatim) | motion/pose |
|---|---|---|---|
| base | `기본` | `천천히 숨 쉬고 가끔 깜빡인다` | `ci-breathe` |
| listen | `듣기` | `입력창 쪽으로 몸을 기울인다` | pose `rotate(-8 60 96)`, breathe |
| think | `생각` | `위를 보며 출렁인다. AI가 답을 만드는 중` | breathe + `ci-dots` thought dots (3 circles in `deep` at (96,24) r3.2, (104,16) r2.4, (110,9) r1.7; svg needs `overflow: visible`) |
| joy | `기쁨` | `통통 튄다. 레슨 완료, 잔디가 찰 때` | move `ci-hop`, closed-arc lids |
| sad | `서운함` | `축 처졌다가, 다시 오면 바로 펴진다` | pose `translate(60 96) scale(1.06 0.9) translate(-60 -96)`, sad brows `M42 47 L53 44.5 M78 47 L67 44.5`; 온 also has a tear (#BFD7FF) |

Personality rules (CharacterCircle footnote, verbatim):
`몸이 같아서 선생님을 바꾸면 색과 표정만 바뀐다. 성격은 표정에 남긴다: 결은 기뻐도 입만 살짝 웃고, 생각할 때 한쪽 눈썹을 치켜든다. 새는 언제나 눈 크기가 짝짝이다. 작은 크기(40px 이하)에서는 하이라이트와 볼 터치를 빼고 눈과 눈썹만 굵게 쓴다. 동작은 슬라임 동작 시안의 규칙(두리번, 8초 점프, 작업 중, 자는 중)을 그대로 쓴다.`

Board header (verbatim): `세 선생님 모두 같은 동그라미. 소품 없이 눈, 눈썹, 입, 볼만으로 성격을 나눈다. 외곽선 없음 · 얼굴 색 #1E1B2E · 아래 그림자 22% · 위 하이라이트 30%`

## Anatomy & variants

Layer order (from `inner()`): `[g.ci-jump?] > g[transform=pose] > g.{move}` containing
1. body `<circle cx="60" cy="58" r="38" fill=body>`
2. bottom shade `<path d="M23.3 68 A38 38 0 0 0 96.7 68 A44 22 0 0 1 23.3 68 Z" fill=deep opacity="0.22">`
3. highlight `<ellipse cx="45" cy="36" rx="9" ry="5.5" fill="#FFFFFF" opacity="0.3" transform="rotate(-25 45 36)">` (omitted when small)
4. `g.ci-look`: cheeks (#FF9FB8 op .75, omitted when small), brow (stroke #1E1B2E, 2.7 / small 3.4), `g.ci-blink` eyes (#1E1B2E) + shine (#FFFFFF, omitted when small), lid (2.4 / small 3), mouth (2.2 / small 2.8, fill #1E1B2E when `fill` flag else none), tear (#BFD7FF), then optional `extra_face` slot.
5. thought dots group (outside pose/move).

- **Small variant (<=40px)**: `small=True` → drop highlight, cheeks, eye shine; thicker strokes as above. Note: no mockup screen actually passes `small=True` (the 44x40 avatars use the full variant).
- **Jump flag**: wraps in `g.ci-jump` (8 s cycle, one hop near the end). `char()` in common.py defaults `jump=True`.
- Face color always #1E1B2E; no outline.
- CharacterCircle board uses viewBox `0 0 120 112` with a ground shadow `<ellipse cx="60" cy="103" rx="24" ry="3.5" fill="#000000" opacity="0.08">` (0.35 on dark) and an extra sparkle `<circle cx="56" cy="29" r="2" fill="#FFFFFF" opacity="0.35">`; these are board-only, the app component (`inner()`) has neither. That board also uses 결 deep **#C7362C** vs **#D63A30** everywhere else — use #D63A30.
- 새 on the board has two extra tiny eye sparkles (`<circle cx="45.8" cy="56.6" r="0.8">`, `<circle cx="71.6" cy="55.6" r="0.9">`, #FFFFFF) not present in `circle_face.py`.

Sizes used in screens: 180x165 (Teachers board), 120x110 (States), 96x88 (Profile, Main), 64x59 (Invite), 44x40 (Group, Roommate, Resource headers/bubbles). Height ≈ width x 110/120.

## Motion CSS (verbatim, shared `CI_CSS`)

```css
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
CharacterCircle board also staggers with `.ci-d1{animation-delay:-1.2s}` `.ci-d2{animation-delay:-2.4s}`.

## Extra face elements: sunglasses (light) / flashlight (dark)

Not in CharacterCircle/Teachers; found only in `Main.dc.html` (Main hero character, 96x88, `position:absolute; top:-66px; right:18px; overflow:visible; pointer-events:none`). PRD: `가끔 라이트에서는 선글라스를 끼고 다크에서는 깜빡이는 손전등으로 아래를 비춘다`. Logic: `fx = { glasses: p.dark ? 'none' : 'inline', flash: p.dark ? 'inline' : 'none' }`.

Sunglasses — inserted in the `extra_face` slot (inside `g.ci-look`, after tear):
```html
<g class="sl-glasses" style="display: {{fx.glasses}}">
  <path d="M33 47 L22 44" stroke="#1C1B19" stroke-width="3" stroke-linecap="round"></path>
  <path d="M87 47 L98 44" stroke="#1C1B19" stroke-width="3" stroke-linecap="round"></path>
  <rect x="33" y="40" width="26" height="23" rx="9" fill="#1C1B19"></rect>
  <rect x="61" y="40" width="26" height="23" rx="9" fill="#1C1B19"></rect>
  <path d="M57 47 Q60 44 63 47" fill="none" stroke="#1C1B19" stroke-width="3.5"></path>
  <path d="M38 46 L45 44" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.75"></path>
  <path d="M66 46 L73 44" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.75"></path>
</g>
```

Flashlight — siblings placed **before** the character group (behind the body), with arms:
```html
<defs>
  <linearGradient id="sl-beam-fill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFF4C2" stop-opacity="0.95"></stop>
    <stop offset="1" stop-color="#FFF4C2" stop-opacity="0"></stop>
  </linearGradient>
</defs>
<polygon class="sl-beam" points="104,96 118,96 150,250 50,250" fill="url(#sl-beam-fill)" style="display: {{fx.flash}}"></polygon>
<path class="sl-arm-l" d="M22 62 C10 56 8 44 14 38" fill="none" stroke="{{p.ink}}" stroke-width="2.5" stroke-linecap="round"></path>
<g class="sl-arm-r">
  <path d="M98 64 C110 66 114 74 110 82" fill="none" stroke="{{p.ink}}" stroke-width="2.5" stroke-linecap="round"></path>
  <g class="sl-flash" style="display: {{fx.flash}}">
    <rect x="103" y="80" width="14" height="18" rx="3" fill="#3A3A42" stroke="{{p.ink}}" stroke-width="1.5"></rect>
    <rect x="101" y="94" width="18" height="5" rx="2" fill="#6B6A55"></rect>
    <rect class="sl-bulb" x="101" y="94" width="18" height="5" rx="2" fill="#FFE27A"></rect>
  </g>
</g>
```
Note: the arms (`sl-arm-l`/`sl-arm-r`) are always shown in Main (both themes), not only with the flashlight.

CSS (verbatim from Main.dc.html):
```css
.sl-arm-l{transform-box:fill-box;transform-origin:100% 100%;animation:sl-sway 3.2s ease-in-out infinite}
.sl-arm-r{transform-box:fill-box;transform-origin:0% 0%;animation:sl-wave 2.4s ease-in-out infinite}
.sl-glasses{animation:sl-glasses 12s ease-in-out infinite}
.sl-flash{animation:sl-flash 8s ease-in-out infinite}
.sl-beam{animation:sl-beam 8s linear infinite}
.sl-bulb{animation:sl-beam 8s linear infinite}
@keyframes sl-sway{0%,100%{transform:rotate(0deg)}50%{transform:rotate(10deg)}}
@keyframes sl-wave{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-22deg)}50%{transform:rotate(6deg)}75%{transform:rotate(-16deg)}}
@keyframes sl-glasses{0%,58%{opacity:0;transform:translateY(-16px)}64%,86%{opacity:1;transform:translateY(0)}92%,100%{opacity:0;transform:translateY(-16px)}}
@keyframes sl-flash{0%,36%{opacity:0}40%,90%{opacity:1}94%,100%{opacity:0}}
@keyframes sl-beam{0%,42%{opacity:0}44%{opacity:0.85}45%{opacity:0.1}46%{opacity:0.85}47%{opacity:0.2}49%,63%{opacity:0.85}64%{opacity:0.15}65%,74%{opacity:0.85}75%{opacity:0.1}76%{opacity:0.6}77%{opacity:0.15}78%,86%{opacity:0.85}89%,100%{opacity:0}}
@media (prefers-reduced-motion: reduce){.sl-breathe,.sl-arm-l,.sl-arm-r,.sl-eyes,.sl-pupils,.sl-glasses,.sl-flash,.sl-beam{animation:none}.sl-glasses,.sl-flash,.sl-beam{opacity:0}}
```
