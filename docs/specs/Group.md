# Group (그룹) — `mockup/Group.dc.html`

Frame 390x844, `p.bg`, Noto Sans KR, `p.ink`. Tab screen (bottom nav, "그룹" active).
No generator in tools/screens — this spec is from the HTML directly.

**Palette note:** Group defines its own local palettes (not `common.py`). Same values as common for bg/surface/ink/sub/line/future/tab/cardBorder, plus an extra token:
- `track`: 화이트 `rgba(17,17,19,0.1)` · 다크 `rgba(255,255,255,0.12)`
- Theme comes only from `props.theme` (+ `기기 설정` → sysDark). It ignores `st.themeSel`.
- Accent `a` = `{text, tint, btnBg, btnInk}` (no `glow`), computed by `accentOf(teacher)` so it can be computed for any member's teacher.
- Hardcoded chips: `doneChip` 화이트 `{bg:#E2F5EA, ink:#1F6B42}` / 다크 `{bg:rgba(76,195,138,0.18), ink:#7FD9AC}` (= p.goodBg/p.good). `waitChip` = `{bg:p.future, ink:p.sub}`.

## 1. Layout

Scroll area: `position:absolute; top:0; left:0; right:0; bottom:76px; overflow-y:auto; padding:20px 20px 24px; flex column; gap:14px`.

1. **Header** (h 44, flex space-between, align center)
   - h1 `그룹` 22px/700, letter-spacing -0.4px.
   - Right: link to `Invite.dc.html`, h 40, padding 0 14px, radius 20, border `p.cardBorder`, bg `p.surface`, ink `p.ink`, 13px/500, gap 6. Link icon 16x16 (stroke currentColor, width 2; paths `M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1` + `M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1`). Label `초대 링크`.
2. **Group summary card** (`aria-label="그룹 요약"`): bg `a.tint`, radius 24, padding 18, flex column gap 10.
   - Row (baseline, space-between): `퇴근 후 공부방` 18px/700 · `멤버 4명` 12px `p.sub`.
   - Row (center, gap 10): `2 / 4` in **Jua** 34px / lh 38px, `a.text` · `오늘 학습을 마쳤어요` 14px/lh 20.
   - Progress: grid 4 cols gap 6; each bar h 8, radius 4. First 2 = `a.btnBg`, last 2 = `p.track` (hardcoded 2 of 4).
3. **h2** `멤버` 15px/700, margin-top 4.
4. **Member list**: flex column gap 10. Each `article` (aria-label = name): bg `p.surface`, border `p.cardBorder`, radius 20, padding `14px 14px 14px 12px`, flex column gap 10.
   - Top row (center, gap 10):
     - Character SVG 44x40 (viewBox 0 0 120 110), `aria-hidden`, face = member's own teacher; **no jump**, not small variant.
     - Middle column (flex 1, gap 1): line 1 (gap 6) name 15px/700 + topic 12px `p.sub`; line 2 streak 12px colored `m.streakInk`.
     - Status chip: 11px/700, radius 999, padding 4px 9px, bg `m.chipBg`, ink `m.chipInk`.
   - Bottom row (center, gap 10):
     - Grass: `role="img"` aria-label `{name}의 최근 2주 학습 기록`, grid 14 cols, gap 3; each cell h 12, radius 3, box-sizing border-box, bg/border per cell.
     - Poke button (only if `m.canPoke`): h 40, padding 0 12, no border, radius 12, 13px/700, nowrap, bg `m.pokeBg`, ink `m.pokeInk`, `aria-disabled={m.poked}`.
5. **Privacy footnote** `p`: flex gap 8, 12px / lh 18, `p.sub`. Lock icon 16x16 (stroke 1.8; `<rect x="5" y="11" width="14" height="9" rx="2">` + `M8 11V8a4 4 0 0 1 8 0v3`), margin-top 1.

**Bottom tab nav** (shared with Main/Curriculum/Profile): absolute bottom, h 76, padding `8px 12px 16px`, bg `p.tab`, border-top `1px solid p.line`, grid 4 cols. Each item: flex column center, gap 4, 11.5px, `p.sub`; icon 24x24 stroke 1.8. Active item: `a.text`, 700, icon stroke 2, `aria-current="page"`.
| label | href | icon paths |
|---|---|---|
| 오늘 | Main.dc.html | `M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z` |
| 커리큘럼 | Curriculum.dc.html | `M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z` + `M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z` |
| 그룹 | Group.dc.html | `<circle cx="9" cy="8" r="3.5">` + `M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6` + `<circle cx="17" cy="9" r="2.5">` + `M16 14.2c2.8.3 5 2.6 5 5.8` |
| 내 정보 | Profile.dc.html | `<circle cx="12" cy="8" r="4">` + `M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8` |

## 2. Copy (verbatim)

- `그룹`, `초대 링크`, `퇴근 후 공부방`, `멤버 4명`, `2 / 4`, `오늘 학습을 마쳤어요`, `멤버`
- Footnote: `그룹에는 주제와 진도만 보여요. 튜터 대화와 결과물은 나만 볼 수 있어요. 콕 찌르기는 한 사람에게 하루 한 번만 보낼 수 있어요.`
- Status chip: `오늘 완료` (done) · `오늘 아직` (me, not done) · `아직` (others, not done)
- Poke: `콕 찌르기` → after tap `찔렀어요`
- Hidden topic: `주제 비공개`
- Tabs: `오늘` `커리큘럼` `그룹` `내 정보`

No per-teacher copy variants on this screen.

## 3. Data & logic

Sample members (grass = 14 days, Mon–Sun x 2 weeks; numbers = intensity level 1–4, `'r'` rest day, `'x'` missed, `'t'` today-not-yet):

| id | name | teacher | topic | shareTopic | streak | done | days |
|---|---|---|---|---|---|---|---|
| me | 나 | (props.teacher) | 재무제표 읽기 | (always shown) | 8일째 연속 | false | 3,2,4,2,3,r,r, 2,3,1,t,x,r,r |
| min | 민 | 온 | 디자인 기초 | true | 12일째 연속 | true | 2,3,3,2,4,2,r, 3,2,4,3,x,r,r |
| seo | 서 | 새 | 사진 보정 | **false** | 5일째 연속 | true | x,2,x,x,3,r,r, 1,2,3,2,x,r,r |
| jun | 준 | 결 | 영어 회화 | true | 이틀째 쉬는 중 | false | 2,2,3,1,2,r,r, 3,x,x,x,x,r,r |

Derived per member (`x` = member's teacher colors):
- `resting = !done && !isMe` (only 준 in sample).
- **Visibility scope:** `topic = (isMe || shareTopic) ? topic : '주제 비공개'`. `shareTopic` corresponds to the scope chosen in Invite (`잔디만` → false → topic hidden as `주제 비공개`; `잔디와 주제` → true → topic shown). Grass and streak are always visible regardless of scope.
- `f = face(m.teacher, resting ? 'sad' : 'base')`.
- `streakInk = resting ? (dark ? '#FF9A90' : '#B3261E') : p.sub`.
- Chip: done → doneChip; else waitChip.
- Grass cell (`lv` 화이트 `[0,0.35,0.6,0.9]`, 다크 `[0,0.3,0.55,0.8]`):
  - `'r'` → bg transparent, border `1px dashed p.line`
  - `'x'` → bg `p.future`, no border
  - `'t'` → bg transparent, border `1.5px solid accentOf(x).text`
  - `4` → bg `dark ? x.body : x.deep`
  - `1–3` → bg `rgba(x.body, lv[v])`
  - Colors use **the member's teacher**, not the viewer's.
- **Nudge (콕 찌르기):** `canPoke = resting`. State `st.poked` = `{[memberId]: true}`. On click: if already poked, no-op; else set `poked[id]=true`. Poked → label `찔렀어요`, bg `p.future`, ink `p.sub`, `aria-disabled=true`. Not poked → `콕 찌르기`, bg `a.tint`, ink `a.text`. Once-per-day is a product rule stated in the footnote; the mock only keeps it in component state (no date reset). Real impl: limit 1 poke per sender→recipient per day; recipient side shows Notifications item `준님이 콕 찔렀어요`-style.
- Unused computed field: `mouth` (legacy; not referenced in markup).

Navigation: `초대 링크` → Invite; tabs as above.

## 4. Animation

Only the shared `CI_CSS` from circle_face.py (breathe/blink/look/hop/dots/jump + reduced-motion). Member avatars have no `ci-jump`. Sad face uses `pose` squash transform and `ci-breathe` move.

## 5. Characters

- 4 avatars, 44x40, one per member, colored by member's teacher (나 = my teacher). State `sad` when resting (준), else `base`. No jump.
