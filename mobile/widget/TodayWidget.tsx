"use no memo";
// 안드로이드 홈 화면 위젯(react-native-android-widget). 이 라이브러리는 컴포넌트를 함수로 바로 불러 그림을 만들어서
// React Compiler가 바꾸면 안 된다(맨 위 "use no memo"). 훅도 쓰지 않는다.
// iOS 위젯(targets/widget/Widget.swift)과 같은 내용·색을 쓴다.
import { FlexWidget, TextWidget, type ColorProp, type HexColor } from "react-native-android-widget";
import {
  cellStyle,
  EMPTY_TITLE,
  isStale,
  STALE_LABEL,
  STALE_TITLE,
  WIDGET_PALETTE,
  WIDGET_TEACHERS,
  widgetLink,
  type WidgetSummary,
} from "../widget-data";

const CELL = 9;
const GAP = 2;
const WEEKS = 5;

function Grass({ s, dark }: { s: WidgetSummary; dark: boolean }) {
  const cols = s.grass.slice(-WEEKS);
  return (
    <FlexWidget style={{ flexDirection: "row", flexGap: GAP }}>
      {cols.map((col, ci) => (
        <FlexWidget key={ci} style={{ flexDirection: "column", flexGap: GAP }}>
          {col.split("").map((ch, ri) => {
            const st = cellStyle(ch, s.teacher, dark, ci === cols.length - 1 && ri === s.todayRow);
            return (
              <FlexWidget
                key={ri}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 2,
                  ...(st.fill ? { backgroundColor: st.fill as ColorProp } : {}),
                  ...(st.border ? { borderWidth: 1, borderColor: st.border as ColorProp } : {}),
                }}
              />
            );
          })}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

function Today({ s, dark, now }: { s: WidgetSummary | null; dark: boolean; now: Date }) {
  const p = dark ? WIDGET_PALETTE.dark : WIDGET_PALETTE.light;
  const t = WIDGET_TEACHERS[s?.teacher ?? "온"];
  const accent = (dark ? t.body : t.text) as HexColor;
  const tint = (dark ? `${t.body}1F` : t.tint) as HexColor;
  if (!s) {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: widgetLink("/home") }}
        accessibilityLabel={EMPTY_TITLE}
        style={{
          width: "match_parent",
          height: "match_parent",
          backgroundColor: p.bg,
          borderRadius: 22,
          padding: 16,
          justifyContent: "center",
        }}
      >
        <TextWidget text="작심육주" style={{ fontSize: 15, fontWeight: "700", color: accent }} />
        <TextWidget
          text={EMPTY_TITLE}
          maxLines={2}
          style={{ fontSize: 13, color: p.sub, marginTop: 4 }}
        />
      </FlexWidget>
    );
  }
  const stale = isStale(s, now);
  const label = stale ? STALE_LABEL : s.today.label;
  const title = stale ? STALE_TITLE : s.today.title;
  const href = stale ? "/home" : s.today.href;
  const done = !stale && s.today.state === "done";
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: widgetLink("/home") }}
      accessibilityLabel={`연속 ${s.streak}일째. 오늘 ${label}, ${title}`}
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: p.bg,
        borderRadius: 22,
        padding: 14,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text="연속 학습" style={{ fontSize: 11, color: p.sub }} />
          <TextWidget
            text={`${s.streak}일째`}
            style={{ fontSize: 26, fontWeight: "700", color: accent }}
          />
          <TextWidget
            text={s.line}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 11, color: p.sub }}
          />
        </FlexWidget>
        {s.grass.length > 0 && <Grass s={s} dark={dark} />}
      </FlexWidget>
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: widgetLink(href) }}
        accessibilityLabel={`오늘 ${label}: ${title}`}
        style={{
          width: "match_parent",
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: p.surface,
          borderRadius: 14,
          paddingHorizontal: 10,
          paddingVertical: 8,
        }}
      >
        <TextWidget
          text={label}
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: done ? (dark ? "#111114" : "#FFFFFF") : accent,
            backgroundColor: done ? accent : tint,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        />
        <TextWidget
          text={title}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 13, fontWeight: "500", color: p.ink, marginLeft: 8 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

/** 라이트·다크 두 벌. 안드로이드가 기기 테마에 맞춰 고른다 */
export function renderTodayWidget(s: WidgetSummary | null, now: Date = new Date()) {
  return {
    light: <Today s={s} dark={false} now={now} />,
    dark: <Today s={s} dark={true} now={now} />,
  };
}
