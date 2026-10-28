import type { Metadata, Viewport } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import { cookies } from "next/headers";
import { themeCss } from "@/lib/design/tokens";
import { parseTeacher, parseTheme, TEACHER_COOKIE, THEME_COOKIE } from "@/lib/theme";
import ui from "@/components/ui/ui.module.css";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";
import "./motion.css";

const jua = Jua({ weight: "400", subsets: ["latin"], variable: "--font-title", preload: false });
const noto = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  preload: false,
});

export const metadata: Metadata = {
  title: "작심육주",
  description: "작심삼일, 이번엔 끝까지.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#111114" },
  ],
};

const TOKENS = themeCss();

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  const teacher = parseTeacher(jar.get(TEACHER_COOKIE)?.value);
  return (
    <html
      lang="ko"
      data-theme={theme}
      data-teacher={teacher}
      className={`${jua.variable} ${noto.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style id="j6-tokens" dangerouslySetInnerHTML={{ __html: TOKENS }} />
      </head>
      <body>
        <div className={ui.shell}>
          <div className={ui.frame}>{children}</div>
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
