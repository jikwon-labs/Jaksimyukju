# States (빈 상태와 오류) — `mockup/States.dc.html`

Generator: `tools/screens/s2.py` (section "빈 상태·오류"); matches HTML. Frame 390x844, `p.bg`, Noto Sans KR. Palette/accent from `common.py`.

One template, 4 variants via prop `kind`: `AI 응답 실패` (default) | `자료 검색 실패` | `오프라인` | `빈 그룹`.

## 1. Layout

1. **Offline bar** (`role="status"`, only when `kind === '오프라인'`): absolute top/left/right 0, padding `12px 20px`, bg `p.warnBg`, ink `p.warn`, 13px/700, flex center gap 8. Wifi-off icon 16x16 stroke currentColor 2.2:
   `M2 8.8a15 15 0 0 1 4.2-2.6 M22 8.8A15 15 0 0 0 12 5c-.7 0-1.4 0-2 .1 M5.5 12.4a10 10 0 0 1 3-1.8 M18.5 12.4a10 10 0 0 0-2.4-1.5 M9 15.9a5 5 0 0 1 6 0 M12 20h.01 M3 3l18 18`
2. **Main** container: absolute inset 0, padding `64px 28px 40px`, column gap 12.
   - Center block (flex 1, column, center/center, gap 14, text-center):
     - Character 120x110 (jump), state per kind.
     - Tag pill 12px/700, radius 999, padding `4px 10px`, bg `s.tagBg`, ink `s.tagInk`.
     - h1 title 23px / lh 31 / 700 / ls -0.5px.
     - Body `p` 15px / lh 23 `p.sub`.
     - Note box (hidden when note empty): width 100%, bg `p.surface`, border `p.cardBorder`, radius 16, padding `12px 14px`, 13px / lh 19, `p.ink`, left-aligned.
   - Primary link: h 56, radius 18, `a.btnBg`/`a.btnInk`, 16px/700.
   - Secondary link: h 48, radius 16, `p.ink`, 14px (no bg).

## 2. Copy (verbatim)

Offline bar: `오프라인 · 연결되면 자동으로 올라가요`

### AI 응답 실패
- face `sad` · tag `튜터 응답 실패` · title `선생님이 잠깐 말을 놓쳤어요`
- body
  - 온: `미안해요, 답을 만들다 끊겼어요. 질문은 그대로 저장해 뒀어요.`
  - 결: `응답이 끊겼습니다. 질문은 저장했습니다. 다시 시도하세요.`
  - 새: `어, 생각하다 길을 잃었어요. 질문은 잘 챙겨 뒀어요!`
- note: `저장된 질문: "감가상각이 왜 현금을 안 쓰는 거예요?"`
- primary `다시 물어보기` → Tutor.dc.html · secondary `레슨 먼저 다시 읽기` → Lesson.dc.html

### 자료 검색 실패 (자료 없음)
- face `think` · tag `자료 없음` · title `확인된 자료를 아직 못 찾았어요`
- body
  - 온: `링크가 열리고 내용이 맞는 자료만 보여 드리려고 해요. 오늘은 제 설명만으로도 충분해요.`
  - 결: `검증 안 된 링크는 보여 주지 않습니다. 오늘은 레슨 본문으로 진행합니다.`
  - 새: `쓸 만한 자료가 안 보여요. 대신 제가 예시를 하나 더 만들어 볼게요.`
- note: `내일 아침에 다시 찾아보고, 찾으면 알림으로 알려 드려요.`
- primary `레슨 계속하기` → Lesson.dc.html · secondary `다시 찾아보기` → Resource.dc.html

### 오프라인
- face `listen` · tag `연결 끊김` · title `인터넷이 끊겼어요`
- body
  - 온: `괜찮아요. 오늘 레슨은 미리 받아 둬서 지금 바로 읽을 수 있어요.`
  - 결: `오늘 레슨은 저장돼 있습니다. 읽기는 지금 가능합니다.`
  - 새: `지하철인가요? 오늘 레슨은 가방에 넣어 뒀어요.`
- note: `튜터 질문과 퀴즈는 연결되면 열려요. 오늘 칸은 연결되는 순간 채워져요.`
- primary `저장된 레슨 읽기` → Lesson.dc.html · secondary `홈으로` → Main.dc.html
- plus the top offline bar

### 빈 그룹
- face `base` · tag `그룹 비어 있음` · title `아직 함께하는 사람이 없어요`
- body
  - 온: `혼자서도 잘하고 있지만, 한 명만 있어도 훨씬 덜 지쳐요.`
  - 결: `혼자 하면 포기율이 높습니다. 한 명만 데려오세요.`
  - 새: `같이 탐험할 동료를 데려와 볼까요? 서로 잔디 구경하는 재미가 있어요.`
- note: (none — box hidden)
- primary `초대 링크 만들기` → Invite.dc.html · secondary `나중에 할게요` → Main.dc.html

## 3. State & logic

```js
kind = props.kind || 'AI 응답 실패'
L = lines[kind] || lines['AI 응답 실패']
s.body     = L.body[t.name]
s.noteShow = L.note ? 'block' : 'none'
s.tagBg    = kind === '빈 그룹' ? a.tint : p.warnBg     // only 빈 그룹 uses accent; errors use warn
s.tagInk   = kind === '빈 그룹' ? a.text : p.warn
s.faceLabel = t.name + ' 선생님, ' + L.tag            // character aria-label
fs  = face(t.name, L.face)
bar = { show: kind === '오프라인' ? 'flex' : 'none', bg: p.warnBg, ink: p.warn }
```
No interactive state. In the app, these are components shown inline on the relevant screen (Tutor error, Resource empty, global offline, Group empty) rather than a standalone route.

## 4. Animation

Shared `CI_CSS` only (`sad` uses squash pose; `think` shows `ci-dots` thought bubbles; `listen` uses tilt pose).

## 5. Characters

- One character 120x110, current teacher, jump on. State: AI 응답 실패 `sad` · 자료 검색 실패 `think` · 오프라인 `listen` · 빈 그룹 `base`.
