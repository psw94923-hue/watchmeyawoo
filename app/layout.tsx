import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduCraft - 나만의 교육용 웹앱 만들기",
  description: "선생님과 학생을 위한 가장 쉽고 빠른 맞춤형 교육용 웹 애플리케이션 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-retro transition-colors duration-300">
        {/* 상단 헤더 */}
        <header className="w-full border-b-4 border-black bg-yellow-300 text-black">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            {/* 로고 영역 */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight flex items-center gap-1.5 retro-text-shadow-sm">
                👾 MATH WORM (수학 지렁이)
              </span>
            </div>

            {/* 헤더 우측 작업 영역 */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-400 text-black border-2 border-black font-bold text-xs">
                <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                ONLINE RANKING ACTIVE
              </span>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col">{children}</div>

        {/* 하단 푸터 */}
        <footer className="w-full border-t-4 border-black bg-slate-800 text-slate-400 py-6 text-center text-xs">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-retro text-slate-400">
              &copy; {new Date().getFullYear()} MATH WORM ACADEMY. ALL RIGHTS RESERVED.
            </p>
            <div className="flex items-center gap-4">
              <span>SUPABASE CONNECTED</span>
              <span>&middot;</span>
              <span>16-BIT EDUCATION EDITION</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
