# Notifications (알림) — `mockup/Notifications.dc.html`

Generator: `tools/screens/s1.py` (section "알림 목록"); matches HTML. Frame 390x844, `p.bg`, Noto Sans KR. Palette/accent from `common.py`.

## 1. Layout

`SCROLL_OPEN` container (absolute inset 0, overflow-y auto, padding `20px 20px 32px`, column gap 14).

1. `back('Main.dc.html', '알림', right)` — common back header. Right side (inside header):
   - Text button `모두 읽음`: h 40, padding 0 12, no border, radius 12, transparent, `a.text`, 13px/700.
   - Settings link → `Settings.dc.html`, aria-label `알림 설정`: 44x44, radius 22, border `p.cardBorder`, bg `p.surface`; gear icon 20x20 stroke `p.ink` width 1.8 (`<circle cx="12" cy="12" r="3">` + standard feather "settings" path).
2. For each group: `section` (aria-label = group label), column gap 8.
   - h2 label 13px/700 `p.sub`, margin `4px 0 0 4px`.
   - Items: `a` link (href per item), position relative, flex gap 12, padding 14, radius 20, bg `it.bg`, border `it.border`, ink `p.ink`.
     - Icon circle 40x40 radius 20, bg `it.iconBg`; icon 20x20 stroke `it.iconInk` width 2.
     - Text column (flex 1, gap 3):
       - Row (baseline, gap 8): title 14px / lh 20, weight `it.weight`; time 11.5px `p.sub` (flex none).
       - Body 13px / lh 19 `p.sub`.
       - Optional action pill: margin-top 6, h 36, padding 0 14, radius 12, `a.btnBg`/`a.btnInk`, 13px/700, `display: it.action` (inline-flex | none).
     - Unread dot: absolute top 14, left 44, 10x10, radius 5, bg `a.text`, border `2px solid it.bg`, `display: it.dot`; aria-label `읽지 않음`.
3. Footer `p` 12px / lh 18 `p.sub`, centered, margin-top 4.

## 2. Copy (verbatim)

- Header `알림`, button `모두 읽음`
- Footer: `알림은 하루 최대 2번. 밤 11시부터 아침 7시까지는 보내지 않아요.`

Group `오늘`:
| icon | hot | unread | title | body | time | href | action |
|---|---|---|---|---|---|---|---|
| poke | yes | yes | `준님이 콕 찔렀어요` | `오늘 아직이죠? 5분 버전도 있어요.` | `오후 8:12` | Lesson.dc.html | `지금 5분 하기` |
| bell | – | yes | `{t.name} 선생님` (e.g. `온 선생님`) | reminder (per teacher, below) | `오후 7:00` | Main.dc.html | – |
| fire | – | – | `민님이 12일 연속을 찍었어요` | `그룹에서 축하 한마디 남겨 볼까요?` | `오후 6:40` | Group.dc.html | – |

Group `이번 주`:
| icon | unread | title | body | time | href |
|---|---|---|---|---|---|
| moon | yes | `2주차 돌아보기가 도착했어요` | `3분이면 끝나요. 다음 주 다짐까지 같이 정해요.` | `일요일` | Roommate.dc.html |
| book | – | `오늘 레슨 자료 3개를 찾아 뒀어요` | `링크가 열리는지, 내용이 맞는지 확인했어요.` | `목요일` | Resource.dc.html |
| users | – | `서님이 퇴근 후 공부방에 초대했어요` | `수락하면 서로의 잔디가 보여요.` | `화요일` | Invite.dc.html |
| route | – | `3일 쉬었어요. 계획을 다시 짜 뒀어요` | `미루기, 압축, 건너뛰기 중에 고르면 돼요.` | `지난주` | Comeback.dc.html |

Teacher reminder body:
- 온: `오늘 10분, 같이 할까요? 어제 하던 데서 바로 이어져요.`
- 결: `오늘 레슨 아직입니다. 9시 30분 전에 끝냅시다.`
- 새: `오늘은 현금이 어디로 새는지 볼 거예요. 궁금하지 않아요?`

## 3. State & logic

```js
var read = !!st.read;                 // set by 모두 읽음
item(o):
  unread = o.unread && !read
  hot    = o.hot && !read
  iconBg  = o.hot ? a.btnBg : a.tint      // icon colors do NOT change after read-all
  iconInk = o.hot ? a.btnInk : a.text
  bg      = hot ? a.tint : p.surface
  border  = hot ? '2px solid ' + a.text : p.cardBorder
  weight  = unread ? 700 : 500
  dot     = unread ? 'block' : 'none'
  action  = o.action ? 'inline-flex' : 'none'   // stays visible after read-all
readAll() -> setState({read:true})
```
Item tap navigates to `href` (whole card is a link; action pill is part of the link).

Icon paths (24x24, stroke):
- poke `M8 13V5.5a1.5 1.5 0 0 1 3 0V12 M11 11.5V4.5a1.5 1.5 0 0 1 3 0v7 M14 11.5v-5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.8-2.4L3.6 14a1.5 1.5 0 0 1 2.4-1.8L8 14`
- bell `M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9 M10 20a2 2 0 0 0 4 0`
- fire `M12 21c-3.9 0-7-2.8-7-6.6 0-3.4 2.5-5.4 3.6-8.4.4 1.8 1.3 3 2.6 3.6C11 6.8 12.6 4.3 15 3c-.4 2.8.8 4.6 2.2 6.3 1.1 1.4 1.8 3 1.8 5.1 0 3.8-3.1 6.6-7 6.6z`
- moon `M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z`
- users `M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M17 11a2.5 2.5 0 1 0 0-5 M16 14.2c2.8.3 5 2.6 5 5.8`
- route `M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7`
- book `M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z`

Product rules from copy: max 2 notifications/day; quiet hours 23:00–07:00.

## 4. Animation

None besides shared `CI_CSS` (no character on screen).

## 5. Characters

None.
