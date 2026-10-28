# Resource (자료 상세) — `mockup/Resource.dc.html`

Generator: `tools/screens/s2.py` (section "자료 상세"); matches HTML. Frame 390x844, `p.bg`, Noto Sans KR. Palette/accent from `common.py`.

Detail of one web resource found and verified for today's lesson. Bracketed `[...]` strings are placeholders in the mockup, to be filled by real search results.

## 1. Layout

`SCROLL_OPEN` (absolute inset 0, overflow-y auto, padding `20px 20px 32px`, column gap 14).

1. `back('Lesson.dc.html', '오늘 레슨 자료')`.
2. **Meta section** (column gap 10):
   - Tags row (flex wrap gap 6). Tag pill: 12px/700, radius 999, padding `4px 10px`.
     - `글 · 약 6분` — bg `a.tint`, ink `a.text`
     - `링크 확인함` — bg `p.goodBg`, ink `p.good`
   - h2 title 21px / lh 29 / 700 / ls -0.4px.
   - Source line 13px `p.sub`.
3. **Teacher "why" bubble** (flex align-start gap 10): character 44x40 + `p` (flex 1, bg `p.surface`, border `p.cardBorder`, radius `4px 16px 16px 16px`, padding `10px 14px`, 14px / lh 21).
4. **Summary card** (`aria-label="핵심 요약"`): bg `p.surface`, border `p.cardBorder`, radius 20, padding 16, column gap 10.
   - Row (baseline, space-between): h3 15px/700 · disclaimer 11.5px `p.sub`.
   - `ol` padding-left 20, column gap 8, 14px / lh 21.
   - Footnote 12px / lh 18 `p.sub`.
5. **Linked lesson sentences** (`aria-label="레슨과 연결된 부분"`, column gap 8):
   - h3 15px/700, margin `4px 0 0 4px`.
   - Each: card bg `p.surface`, border `p.cardBorder`, radius 18, padding 14, column gap 8. Quote 14px / lh 21 / 500 wrapped in `"…"`. Evidence line: flex center gap 6, 12px/700 `a.text`, link icon 14x14 stroke currentColor 2.4.
6. Disclaimer `p` 12px / lh 18 `p.sub`.
7. **Button row** (flex gap 8):
   - Read toggle (flex 1): h 52, radius 16, border `1.5px solid p.line`, bg `readBg`, ink `readInk`, 14px/700, `aria-pressed={read}`.
   - `원문 열기` (flex 1.3): h 52, no border, radius 16, `a.btnBg`/`a.btnInk`, 15px/700.
8. Report link-button (align center): h 40, transparent, `p.sub`, 13px, underline.

## 2. Copy (verbatim)

- Header: `오늘 레슨 자료`
- Tags: `글 · 약 6분` · `링크 확인함`
- Title: `[웹 검색으로 찾은 글 제목]`
- Source: `[출처 사이트] · [글쓴이] · [발행일]`
- Why (per teacher):
  - 온: `오늘 레슨의 영업활동 현금흐름을 다른 예시로 한 번 더 보여 줘요. 천천히 읽어도 6분이면 돼요.`
  - 결: `레슨 2번 문장의 근거입니다. 6분. 읽고 튜터 질문으로 넘어가세요.`
  - 새: `이 글엔 동네 빵집 예시가 나와요. 레슨이랑 같이 보면 훨씬 재밌어요.`
- Summary card: `핵심 세 줄` · `AI 요약 · 원문과 다를 수 있어요`
  1. `[원문 요약 1: 영업활동 현금흐름이 무엇인지]`
  2. `[원문 요약 2: 순이익과 현금이 달라지는 이유]`
  3. `[원문 요약 3: 실제 회사 예시]`
  - Footnote: `요약은 세 줄까지만 보여 드려요. 전체 내용은 원문에서 읽어요.`
- `이 자료가 받쳐 주는 레슨 문장`
  - `"순이익이 나도 현금은 줄어들 수 있다"` — `근거 1 · 원문 2번째 문단`
  - `"감가상각비는 비용이지만 현금이 나가지 않는다"` — `근거 2 · 원문 표 1`
- Disclaimer: `검색으로 찾은 뒤 링크가 열리는지, 레슨 내용과 맞는지 확인한 자료만 보여 줘요. 광고성 글과 로그인해야 보이는 글은 뺐어요.`
- Buttons: `읽음 표시` → `다 읽었어요` · `원문 열기` · `자료가 이상해요`

## 3. State & logic

```js
read = !!st.read
readLabel = read ? '다 읽었어요' : '읽음 표시'
readBg    = read ? p.goodBg : 'transparent'
readInk   = read ? p.good   : p.ink
toggleRead -> setState({read: !read})
links = [
  { n: 1, lesson: '순이익이 나도 현금은 줄어들 수 있다', where: '원문 2번째 문단' },
  { n: 2, lesson: '감가상각비는 비용이지만 현금이 나가지 않는다', where: '원문 표 1' }
]
```
- `원문 열기` and `자료가 이상해요` have no handlers in mock. Real impl: open source URL externally; report → flag resource.
- Product rules: summary capped at 3 lines; only verified (link opens + matches lesson) resources shown; exclude ads and login-walled pages.
- Navigation: back → Lesson. Entry from Notifications (`오늘 레슨 자료 3개를 찾아 뒀어요`) and States (`다시 찾아보기`).

Link icon paths: `M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1` + `M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1`.

## 4. Animation

Shared `CI_CSS` only.

## 5. Characters

- Why bubble: my teacher, 44x40, `base`, jump on, aria-label `{t.name} 선생님`.
