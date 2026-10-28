# Welcome (시작하기)

Source: `mockup/Welcome.dc.html` (generator: `tools/screens/s1.py` `welcome_body`/`welcome_js`). Dark variant `WelcomeDark.dc.html` is just a wrapper that imports Welcome with `theme="다크"`.

- Frame: 390 x 844, `position: relative; overflow: hidden`, background `p.bg`, text `p.ink`, font `'Noto Sans KR', system-ui, sans-serif`.
- Fonts loaded: Jua + Noto Sans KR (400/500/700).
- Props: `step` enum `소개` | `로그인` (default `소개`), `teacher` 온/결/새 (default 온), `theme` 기기 설정/화이트/다크 (default 화이트).
- Accent `a` derived from the `teacher` prop (see common.py). Uses shared palette from common.py.

## States

- `step` state: `'intro'` | `'login'`. Initial = `props.step === '로그인' ? 'login' : 'intro'`; state overrides prop.
- `goLogin()` -> `setState({step:'login'})`; `goIntro()` -> `setState({step:'intro'})`.
- No routing between the two steps; it is in-component state (both absolute `inset: 0` layers).

## Step A: intro

Container: `position: absolute; inset: 0; padding: 64px 24px 32px 24px; flex column; gap: 12px`.

1. **Hero block** (`flex: 1; flex column; align-items center; justify-content center; gap 18px; text-align center`)
   1. **Character trio** (`aria-hidden`, `flex; align-items: flex-end; gap: 2px; height: 120px`):
      - 온: 92 x 85, state base, jump=true (aria-label `온`)
      - 결: 112 x 103, state base, jump=true, `margin-bottom: 8px` (center, larger, raised)
      - 새: 92 x 85, state base, jump=true
      - All `overflow: visible; flex: none`.
   2. **Wordmark**: `작심육주` — Jua, 48px / line-height 54px, letter-spacing -1px, color `p.ink`.
   3. **Tagline** `<p>`: 16px / 25px, color `p.sub`, margin 0. Two lines:
      - `작심삼일, 이번엔 끝까지.`
      - `AI 선생님이 길을 짜고, 동료가 같이 걸어요.`
   4. **Point list** `<ul>`: no bullets, `margin-top: 8px`, flex column, gap 10px, `text-align: left`, `width: 100%; max-width: 300px`.
      Each `<li>`: flex, align center, gap 12px, 15px / 21px.
      - Check bubble: 32x32, radius 16, bg `a.tint`; inner check icon 16x16 (`M5 12.5l4.5 4.5L19 7.5`), stroke `a.text`, width 2.6, round caps/joins.
      - Items (verbatim):
        1. `배우고 싶은 걸 말하면 몇 주짜리 길을 짜 줘요`
        2. `하루 10분, 한 칸씩 채우면 잔디가 자라요`
        3. `쉬는 날엔 동료가 콕 찔러 줘요`
2. **Primary CTA** link `시작하기` -> `Personality` (href `Personality.dc.html`). Height 56, radius 18, bg `a.btnBg`, color `a.btnInk`, 17px bold (700), centered, no underline.
3. **Caption**: `가입 없이 바로 시작해요. 계정은 첫 레슨을 마친 뒤에 연결해요.` — 12px, `p.sub`, centered.
4. **Text button** `이미 계정이 있어요` — height 44, no border, transparent bg, color `p.sub`, 14px. onClick `goLogin`.

## Step B: login

Container: `position: absolute; inset: 0; padding: 20px 24px 32px 24px; flex column; gap: 12px`.

1. **Back button** (`aria-label="뒤로"`): 44x44, radius 22, border `p.cardBorder`, bg `p.surface`; chevron icon 20x20 (`M15 5l-7 7 7 7`), stroke `p.ink` width 2. onClick `goIntro`.
2. **Middle block** (`flex: 1; flex column; justify-content: center; gap: 14px`):
   - Character: current teacher (`t.name`), 88 x 81, state base, jump=true, `align-self: flex-start`, aria-label `{t.name} 선생님`.
   - `<h1>` 26px / 36px, 700, letter-spacing -0.6px: `계정으로` + `<br>` + `이어서 하기`
   - `<p>` 15px / 23px, `p.sub`: `전에 쓰던 휴대폰의 잔디, 선생님, 그룹을 그대로 불러와요.`
3. **Sign-in buttons** (all links -> `Main.dc.html`, height 54, radius 16, 16px bold, centered):
   - `Apple로 계속하기` — bg `p.ink`, color `p.bg` (inverted).
   - `Google로 계속하기` — bg `p.surface`, border `1.5px solid p.line`, `box-sizing: border-box`, color `p.ink`.
   - `이메일로 계속하기` — same style as Google.
4. Footnote `<p>`: `margin: 4px 0 0 0`, 12px / 18px, `p.sub`, centered: `처음이라면 뒤로 가서 시작하기를 눌러 주세요.`

## Navigation

| Element | Target |
|---|---|
| 시작하기 | Personality |
| 이미 계정이 있어요 | in-place -> login step |
| 뒤로 (login) | in-place -> intro step |
| Apple/Google/이메일로 계속하기 | Main |

## Motion

Only the shared character CSS from `tools/circle_face.py` (`.ci-breathe`, `.ci-blink`, `.ci-look`, `.ci-hop`, `.ci-dots`, `.ci-jump` and their keyframes, with `prefers-reduced-motion` disabling all). No screen-specific keyframes. `ci-jump` = 8s loop, jump happens at 84%-98.4% of the cycle.

## Characters summary

| Where | Who | Size | State | Jump |
|---|---|---|---|---|
| intro trio left | 온 | 92x85 | base | yes |
| intro trio center | 결 | 112x103 (+8px raised) | base | yes |
| intro trio right | 새 | 92x85 | base | yes |
| login | selected teacher | 88x81 | base | yes |

## Notes

- Copy claims "no signup to start; account linked after first lesson" — the flow needs an anonymous/guest session until after the first lesson.
- Login targets jump straight to Main (restores 잔디/선생님/그룹).
