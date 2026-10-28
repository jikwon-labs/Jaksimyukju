# Invite (그룹 초대·합류) — `mockup/Invite.dc.html`

Generator: `tools/screens/s2.py` (section "그룹 초대·합류"); matches HTML. Frame 390x844, `p.bg`, Noto Sans KR. Palette/accent from `common.py` (`p`, `a`).

Prop `view`: `초대하기` (default, send) | `초대받음` (receive). Two mutually exclusive views via `sc-if`.

## 1. Layout

### A. `초대하기` (send)
Scroll container = `SCROLL_OPEN` (absolute inset 0, overflow-y auto, padding `20px 20px 32px`, flex column gap 14).

1. `back('Group.dc.html', '같이 할 사람 데려오기')` (common back header: 44px round button + h1 18px/700).
2. Hero (flex column center, gap 10, text-center, padding 8px 0):
   - Avatar row (align flex-end): my teacher character 64x59 (jump) + dashed placeholder circle 56x56, margin-left -6, radius 28, `2px dashed p.line`, `+` 24px `p.sub` centered.
   - `p` 15px / lh 23: line 1 ink, `<br>`, line 2 `<span>` `p.sub`.
3. **Invite link card** (`aria-label="초대 링크"`): bg `p.surface`, border `p.cardBorder`, radius 22, padding 16, column gap 12.
   - Row (baseline, space-between): `퇴근 후 공부방` 16px/700 · `4 / 6명` 12px `p.sub`.
   - Link field: h 52, padding `0 6px 0 14px`, radius 14, bg `p.bg`, border `1.5px solid p.line`, flex center gap 8.
     - URL text 14px, `ui-monospace, monospace`, ellipsis, nowrap.
     - Copy button h 40, padding 0 14, radius 10, no border, 13px/700, bg `copyBg`, ink `copyInk`.
   - Note 12px `p.sub`.
4. **Scope section** (`aria-label="보여 줄 범위"`), column gap 8:
   - h2 `그룹에 보여 줄 것` 15px/700, margin `4px 0 0 4px`.
   - `role="radiogroup"` grid 2 cols gap 8. Each `role="radio"` button: padding 12, radius 16, border `o.border`, bg `o.bg`, ink `p.ink`, left-aligned, column gap 4: title 14px/700, desc 12px / lh 17 `p.sub`.
5. Primary button: h 56, radius 18, bg `a.btnBg`, ink `a.btnInk`, 16px/700. onClick = `copy` (same as copy button).

### B. `초대받음` (receive)
Container absolute inset 0, padding `56px 24px 32px`, column gap 16.
1. Center block (flex 1, justify center, gap 16):
   - Member avatars row (justify center, align flex-end); each: column center gap 4, margin `0 -2px`; character 64x59 (jump), name label 12px/700 `p.sub`.
   - Text block (center, column gap 6): `서님이 초대했어요` 14px `p.sub`; h1 `퇴근 후 공부방` 26px / lh 34 / 700 / ls -0.6px; `4명 · 이번 주 함께 채운 잔디 21칸` 14px `p.sub`.
   - Rules card (`aria-label="참여하면"`): bg `p.surface`, border `p.cardBorder`, radius 20, padding 16, column gap 10. Each row: flex gap 10, 14px / lh 21; icon 18x18 stroke `r.ink` width 2.4, margin-top 2.
2. Primary link → `Personality.dc.html`: h 56, radius 18, `a.btnBg`/`a.btnInk`, 16px/700.
3. Secondary link → `Main.dc.html`: h 44, `p.sub`, 14px.

## 2. Copy (verbatim)

Send view:
- Header: `같이 할 사람 데려오기`
- Hero: `혼자보다 둘이 덜 포기해요.` / `서로의 잔디가 보이고, 쉬는 날엔 콕 찔러 줄 수 있어요.`
- `퇴근 후 공부방` · `4 / 6명`
- URL: `jaksim6.app/g/7KQ2-MX`
- Copy button: `복사` → `복사됨`
- `링크는 7일 뒤 만료돼요. 새로 만들면 이전 링크는 막혀요.`
- `그룹에 보여 줄 것`
- Scope options:
  - `잔디만` — `날짜별로 했는지만 보여요`
  - `잔디와 주제` — `무엇을 배우는지도 보여요`
- Button: `초대 링크 보내기`

Receive view:
- `서님이 초대했어요` · `퇴근 후 공부방` · `4명 · 이번 주 함께 채운 잔디 21칸`
- Rules:
  - (check, `p.good`) `서로의 학습 잔디와 연속 기록이 보여요`
  - (check, `p.good`) `쉬는 날엔 하루 한 번 콕 찔러 줄 수 있어요`
  - (x, `p.sub`) `튜터 대화, 퀴즈 점수, 마일스톤 내용은 보이지 않아요`
- Buttons: `참여하고 내 선생님 고르기` · `나중에 할게요`
- Member labels: `서` `민` `준` `나?`

No per-teacher copy variants.

## 3. State & logic

```js
var view = this.props.view === '초대받음' ? 'receive' : 'send';
var scope = st.scope || 'grass';          // 'grass' | 'topic'
var copied = !!st.copied;
scopes = [['grass','잔디만','날짜별로 했는지만 보여요'], ['topic','잔디와 주제','무엇을 배우는지도 보여요']]
  on  -> border '2px solid ' + a.text, bg a.tint
  off -> border '2px solid transparent', bg p.surface
  pick -> setState({scope})
copyLabel = copied ? '복사됨' : '복사'
copyBg    = copied ? p.goodBg : a.btnBg
copyInk   = copied ? p.good   : a.btnInk
copy()    -> setState({copied:true})   // both copy button and "초대 링크 보내기"
members = [{name:'서', f:face('새')}, {name:'민', f:face('온')}, {name:'준', f:face('결')}, {name:'나?', f:face(t.name,'listen')}]
```
- Icons: check `M5 12.5l4.5 4.5L19 7.5`; x `M18 6L6 18 M6 6l12 12`.
- Scope semantics: `잔디만` → other members see your grass only, topic shows as `주제 비공개` on Group; `잔디와 주제` → topic visible (see Group.md `shareTopic`).
- Real impl: copy should write URL to clipboard (and share sheet for 보내기). Link expires in 7 days; regenerating revokes the previous one.

Navigation: back → Group; receive primary → Personality (choose teacher); secondary → Main.

## 4. Animation

Only shared `CI_CSS` (circle_face.py). No screen-specific keyframes.

## 5. Characters

- Send hero: my teacher, `base`, 64x59, jump on, aria-label `{t.name} 선생님`.
- Receive: 4 avatars 64x59, all jump on: 서(새 base), 민(온 base), 준(결 base), 나?(my teacher `listen`).
