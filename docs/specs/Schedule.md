# Schedule (학습 시간 정하기, 3/3)

Source: `mockup/Schedule.dc.html`. Dark variant = wrapper with `theme="다크"`.

- Frame: 390 x 844, bg `p.bg`, color `p.ink`, Noto Sans KR.
- Props: `teacher` (default 온), `theme`. Accent `a` from teacher.
- **No character on this screen.** No screen-specific motion (no keyframes, not even the ci-* set).

## State & defaults

- `days: boolean[7]` for `월 화 수 목 금 토 일`; default `[true,true,true,true,true,false,false]` (월-금).
- `minutes`: options `5, 10, 20, 30` (labels `5분` ...), default `10`.
- `weeks`: options `2, 4, 6, 8, 12` (labels `2주` ...), default `6`. Teacher recommendation label says 6주 (static).
- Day button toggles (multi-select, `aria-pressed`); minutes/weeks are single-select radios.
- Alarm time `오후 9:30` is a static button (no handler in mockup; implies a time picker).
- Derived:
  - `perWeek = count(days true)`
  - `lessons = perWeek * weeks`
  - `ready = perWeek > 0`
  - `summary.main` = `주 {perWeek}일 × {minutes}분, {weeks}주 동안 레슨 {lessons}개` (uses `×` U+00D7)
  - `summary.sub` = `한 주에 {perWeek*minutes}분이에요. 바쁜 날에는 5분 버전으로 대신할 수 있어요.`
  - Default: `주 5일 × 10분, 6주 동안 레슨 30개` / `한 주에 50분이에요. 바쁜 날에는 5분 버전으로 대신할 수 있어요.`
- Chip look `look(on)`:
  - on: border `2px solid a.text`, bg `a.tint`, ink `a.text`
  - off: border `2px solid transparent`, bg `p.surface`, ink `p.sub`
- Output to persist: days, minutes, weeks, alarm time (Preview shows them).

## Layout

Scroll area: `position: absolute; top 0; left 0; right 0; bottom: 96px; overflow-y: auto; padding: 20px 20px 24px 20px; column; gap: 20px`.

1. **Header** (height 44, space-between)
   - Back link -> Topic, `aria-label="주제 정하기로 돌아가기"`: 44x44, radius 22, border `p.cardBorder`, bg `p.surface`, chevron stroke `p.ink` 2.
   - Step dots (`aria-label="3단계 중 3단계"`, gap 6): [6x6 `a.text`] [6x6 `a.text`] [24x6 `a.text`], radius 3.
   - `3 / 3` — width 44, 13px, `p.sub`, right.
2. **Title** (column gap 6)
   - `<h1>` 24px / 33px, 700, -0.5px: `언제, 얼마나 공부할까요?`
   - `<p>` 14px / 20px, `p.sub`: `지친 날에도 할 수 있는 만큼으로 정해요. 나중에 내 정보에서 바꿀 수 있어요.`
3. **학습 요일** section (column gap 10)
   - Row (baseline, space-between): `<h2>` `학습 요일` 15px 700; right note 12px `p.sub`: `고르지 않은 날은 쉬어도 연속이 이어져요`
   - Grid 7 equal cols, gap 6. Button: height 48, radius 14, border/bg/ink per `look`, 14px 700. Labels `월 화 수 목 금 토 일`.
4. **하루 분량** section (column gap 10)
   - `<h2>` `하루 분량` 15px 700.
   - Radiogroup (aria-label `하루 분량`), grid 4 cols gap 6, same button style. Labels `5분 10분 20분 30분`.
5. **과정 길이** section (column gap 10)
   - Row: `<h2>` `과정 길이` 15px 700; right `선생님 추천 6주` 12px 700 `a.text`.
   - Radiogroup (aria-label `과정 길이`), grid 5 cols gap 6. Labels `2주 4주 6주 8주 12주`.
6. **알림 시각** row (`aria-label="알림 시각"`): flex, space-between, align center, min-height 56, padding 0 16, radius 16, bg `p.surface`, border `p.cardBorder`.
   - Label `학습 알림` 15px 700.
   - Button `오후 9:30`: height 40, padding 0 12, radius 12, border `1.5px solid p.line`, transparent, `p.ink`, 14px.
7. **Summary** (`aria-label="요약"`): radius 18, padding 16, bg `a.tint`, column gap 4.
   - Eyebrow `이렇게 진행돼요` 12px 700 `a.text`.
   - `{summary.main}` 16px / 24px 700.
   - `{summary.sub}` 13px / 20px `p.sub`.

**Fixed footer**: absolute bottom 0, height 96, padding `12px 20px 28px 20px`, bg `p.bg`, border-top `1px solid p.line`.

- ready: link `커리큘럼 만들기` -> Preview. Height 56, radius 18, bg `a.btnBg`, color `a.btnInk`, 17px 700.
- not ready (0 days): `<div aria-disabled="true">` `학습 요일을 하루 이상 골라 주세요` — height 56, radius 18, bg `p.surface`, color `p.sub`, 15px 700.

## Notes

- Copy `고르지 않은 날은 쉬어도 연속이 이어져요`: streak logic must count only selected weekdays.
- `5분 버전` (5-minute fallback lesson) is a product concept referenced here, in Onboarding (온), and Personality.
