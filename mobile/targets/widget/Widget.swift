// 작심육주 홈 화면 위젯(WidgetKit). 앱 껍데기가 App Group UserDefaults에 넣은 요약 JSON을 읽어 그린다.
// 요약 모양: lib/domain/widget.ts WidgetSummary, 키·색: mobile/widget-data.ts (색은 lib/design/tokens.ts와 같다).
// 안드로이드 위젯(mobile/widget/TodayWidget.tsx)과 같은 내용을 보여 준다.
import SwiftUI
import WidgetKit

private let appGroup = "group.com.jaksim6.app"
private let storeKey = "widget-summary"
private let widgetKind = "JaksimToday"

// MARK: - 요약

struct WidgetToday: Codable {
  let state: String
  let label: String
  let title: String
  let href: String
}

struct WidgetSummary: Codable {
  let v: Int
  let day: String
  let teacher: String
  let streak: Int
  let grass: [String]
  let todayRow: Int
  let today: WidgetToday
  let line: String
}

func loadSummary() -> WidgetSummary? {
  guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: storeKey),
        let data = raw.data(using: .utf8),
        let s = try? JSONDecoder().decode(WidgetSummary.self, from: data),
        s.v == 1
  else { return nil }
  return s
}

/// 요약의 day는 서버가 한국 시간(Asia/Seoul)으로 정한다. 기기 시간대가 달라도(해외) 같은 기준으로 날짜를 본다.
/// mobile/widget-data.ts WIDGET_TIME_ZONE, widgetDayKey와 같다
private let seoul = TimeZone(identifier: "Asia/Seoul") ?? TimeZone(secondsFromGMT: 9 * 3600)!

/// 한국 시간 달력. 날짜 비교와 자정 계산에 쓴다
func seoulCalendar() -> Calendar {
  var cal = Calendar(identifier: .gregorian)
  cal.timeZone = seoul
  return cal
}

/// 한국 시간 기준 그 순간의 날짜(YYYY-MM-DD)
func dayKey(_ date: Date) -> String {
  let f = DateFormatter()
  f.calendar = seoulCalendar()
  f.locale = Locale(identifier: "en_US_POSIX")
  f.timeZone = seoul
  f.dateFormat = "yyyy-MM-dd"
  return f.string(from: date)
}

/// 위젯을 누르면 여는 주소. mobile/widget-data.ts widgetLink와 같다
func widgetLink(_ path: String) -> URL {
  var c = URLComponents()
  c.scheme = "jaksim6"
  c.host = "open"
  c.queryItems = [URLQueryItem(name: "to", value: path.hasPrefix("/") && !path.hasPrefix("//") ? path : "/home")]
  return c.url ?? URL(string: "jaksim6://open?to=%2Fhome")!
}

// MARK: - 색 (lib/design/tokens.ts TEACHERS, PALETTES, grassColors)

func hex(_ v: UInt32, _ alpha: Double = 1) -> Color {
  Color(.sRGB,
        red: Double((v >> 16) & 0xFF) / 255,
        green: Double((v >> 8) & 0xFF) / 255,
        blue: Double(v & 0xFF) / 255,
        opacity: alpha)
}

struct TeacherColors {
  let body: UInt32
  let deep: UInt32
  let tint: UInt32
  let text: UInt32
}

let TEACHERS: [String: TeacherColors] = [
  "온": TeacherColors(body: 0x5B8CFF, deep: 0x2F62D9, tint: 0xE6EEFF, text: 0x2F62D9),
  "결": TeacherColors(body: 0xFF6B5E, deep: 0xD63A30, tint: 0xFFE9E5, text: 0xB42E25),
  "새": TeacherColors(body: 0x4CC38A, deep: 0x1F7A4A, tint: 0xE2F5EA, text: 0x1F7A4A),
]

struct Palette {
  let bg: UInt32
  let surface: UInt32
  let ink: UInt32
  let sub: UInt32
  let line: UInt32
  let future: UInt32

  static let light = Palette(bg: 0xFFFFFF, surface: 0xF5F5F7, ink: 0x111113, sub: 0x63636B, line: 0xE2E2E6, future: 0xE9E9EE)
  static let dark = Palette(bg: 0x111114, surface: 0x1C1C21, ink: 0xF2F1EE, sub: 0xA3A1A8, line: 0x34343C, future: 0x2A2A31)
}

struct Theme {
  let p: Palette
  let t: TeacherColors
  let dark: Bool

  init(teacher: String?, scheme: ColorScheme) {
    dark = scheme == .dark
    p = dark ? .dark : .light
    t = TEACHERS[teacher ?? "온"] ?? TEACHERS["온"]!
  }

  var accent: Color { hex(dark ? t.body : t.text) }
  var tint: Color { dark ? hex(t.body, 0.12) : hex(t.tint) }
  var btnInk: Color { dark ? hex(0x111114) : .white }

  /// 잔디 한 칸. 글자 뜻은 lib/domain/widget.ts WidgetSummary.grass
  func cell(_ ch: Character) -> (fill: Color?, border: Color?) {
    let alpha: [Double] = dark ? [0, 0.3, 0.55, 0.8] : [0, 0.35, 0.6, 0.9]
    switch ch {
    case "1", "2", "3": return (hex(t.body, alpha[Int(String(ch))!]), nil)
    case "4": return (hex(dark ? t.body : t.deep), nil)
    case "0": return (nil, hex(p.line))
    case "r": return (hex(p.line, 0.6), nil)
    case "x": return (nil, hex(p.line, 0.6))
    case ".": return (hex(p.future), nil)
    default: return (nil, nil)
    }
  }
}

// MARK: - 타임라인

struct Entry: TimelineEntry {
  let date: Date
  let summary: WidgetSummary?
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry {
    Entry(date: Date(), summary: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
    completion(Entry(date: Date(), summary: loadSummary()))
  }

  /// 지금 한 장과 다음 자정(한국 시간) 한 장. 자정이 지나면 같은 요약이 "새로고침"으로 보이고, 앱을 열면 새 요약으로 바뀐다
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    let now = Date()
    let s = loadSummary()
    let cal = seoulCalendar()
    let midnight = cal.nextDate(after: now, matching: DateComponents(hour: 0, minute: 0, second: 5), matchingPolicy: .nextTime) ?? now.addingTimeInterval(3600)
    let entries = [Entry(date: now, summary: s), Entry(date: midnight, summary: s)]
    completion(Timeline(entries: entries, policy: .after(midnight.addingTimeInterval(86400))))
  }
}

// MARK: - 화면

struct GrassView: View {
  let s: WidgetSummary
  let theme: Theme
  let weeks: Int
  var cellSize: CGFloat = 10
  var gap: CGFloat = 3

  var body: some View {
    let cols = Array(s.grass.suffix(weeks))
    HStack(spacing: gap) {
      ForEach(0..<cols.count, id: \.self) { ci in
        let col = Array(cols[ci])
        VStack(spacing: gap) {
          ForEach(0..<col.count, id: \.self) { ri in
            let c = theme.cell(col[ri])
            let isToday = ci == cols.count - 1 && ri == s.todayRow
            RoundedRectangle(cornerRadius: 2.5)
              .fill(c.fill ?? .clear)
              .overlay(
                RoundedRectangle(cornerRadius: 2.5)
                  .strokeBorder(isToday ? theme.accent : (c.border ?? .clear), lineWidth: isToday ? 1.5 : 1)
              )
              .frame(width: cellSize, height: cellSize)
          }
        }
      }
    }
    .accessibilityHidden(true)
  }
}

struct StateChip: View {
  let label: String
  let done: Bool
  let theme: Theme

  var body: some View {
    Text(label)
      .font(.system(size: 11, weight: .bold))
      .foregroundStyle(done ? theme.btnInk : theme.accent)
      .padding(.horizontal, 8)
      .padding(.vertical, 3)
      .background(Capsule().fill(done ? theme.accent : theme.tint))
      .lineLimit(1)
  }
}

struct EmptyWidgetView: View {
  let theme: Theme

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("작심육주")
        .font(.system(size: 15, weight: .bold, design: .rounded))
        .foregroundStyle(theme.accent)
      Text("작심육주를 열어 오늘 할 일을 확인해요")
        .font(.system(size: 13))
        .foregroundStyle(hex(theme.p.sub))
        .lineLimit(3)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct TodayView: View {
  let entry: Entry
  @Environment(\.colorScheme) var scheme
  @Environment(\.widgetFamily) var family

  var body: some View {
    let theme = Theme(teacher: entry.summary?.teacher, scheme: scheme)
    Group {
      if let s = entry.summary {
        let stale = s.day != dayKey(entry.date)
        let label = stale ? "새로고침" : s.today.label
        let title = stale ? "앱을 열면 오늘 칸을 불러와요" : s.today.title
        let href = stale ? "/home" : s.today.href
        let done = !stale && s.today.state == "done"
        if family == .systemSmall {
          small(s, theme: theme, label: label, title: title, done: done)
            .widgetURL(widgetLink(href))
        } else {
          medium(s, theme: theme, label: label, title: title, href: href, done: done)
            .widgetURL(widgetLink("/home"))
        }
      } else {
        EmptyWidgetView(theme: theme).widgetURL(widgetLink("/home"))
      }
    }
    .containerBackground(hex(theme.p.bg), for: .widget)
  }

  func streakBlock(_ s: WidgetSummary, theme: Theme, size: CGFloat) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text("연속 학습")
        .font(.system(size: 11))
        .foregroundStyle(hex(theme.p.sub))
      Text("\(s.streak)일째")
        .font(.system(size: size, weight: .bold, design: .rounded))
        .foregroundStyle(theme.accent)
        .minimumScaleFactor(0.6)
        .lineLimit(1)
    }
    .accessibilityElement(children: .combine)
  }

  // 작은 위젯 안쪽 높이는 기기마다 약 116~126pt(위젯 148~158pt에서 위아래 여백 16pt씩).
  // 위 줄(연속 일수 약 40 + 옆 잔디 7칸 7*7+6*2 = 61) + 6 + 상태 칩 약 17 + 3 + 제목 두 줄 약 29 = 약 116pt
  func small(_ s: WidgetSummary, theme: Theme, label: String, title: String, done: Bool) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top, spacing: 0) {
        streakBlock(s, theme: theme, size: 22)
        Spacer(minLength: 4)
        if !s.grass.isEmpty {
          GrassView(s: s, theme: theme, weeks: 3, cellSize: 7, gap: 2)
        }
      }
      Spacer(minLength: 6)
      VStack(alignment: .leading, spacing: 3) {
        StateChip(label: label, done: done, theme: theme)
        Text(title)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(hex(theme.p.ink))
          .lineLimit(2)
          .minimumScaleFactor(0.85)
      }
      .layoutPriority(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  // 중간 위젯 안쪽 높이도 약 116~126pt. 잔디(7*9+6*2 = 75) + 8 + 오늘 줄(글자 약 16 + 위아래 6씩 = 28) = 약 111pt
  func medium(_ s: WidgetSummary, theme: Theme, label: String, title: String, href: String, done: Bool) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 2) {
          streakBlock(s, theme: theme, size: 28)
          Text(s.line)
            .font(.system(size: 11))
            .foregroundStyle(hex(theme.p.sub))
            .lineLimit(1)
        }
        Spacer(minLength: 8)
        if !s.grass.isEmpty {
          GrassView(s: s, theme: theme, weeks: 5, cellSize: 9, gap: 2)
        }
      }
      Spacer(minLength: 8)
      Link(destination: widgetLink(href)) {
        HStack(spacing: 8) {
          StateChip(label: label, done: done, theme: theme)
          Text(title)
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(hex(theme.p.ink))
            .lineLimit(1)
          Spacer(minLength: 0)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(RoundedRectangle(cornerRadius: 14).fill(hex(theme.p.surface)))
      }
      .accessibilityLabel("오늘 \(label): \(title)")
      .layoutPriority(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

struct JaksimWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: widgetKind, provider: Provider()) { entry in
      TodayView(entry: entry)
    }
    .configurationDisplayName("작심육주 오늘")
    .description("연속 학습, 최근 잔디, 오늘 할 일을 보여 줘요.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct JaksimWidgetBundle: WidgetBundle {
  var body: some Widget {
    JaksimWidget()
  }
}
