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
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200 transition-colors duration-300">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* 로고 영역 */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 tracking-tight flex items-center gap-1.5">
                <svg
                  className="w-6 h-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
                EduCraft
              </span>
            </div>

            {/* 네비게이션 바 */}
            <nav className="hidden md:flex items-center gap-6">
              <a
                href="#features"
                className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              >
                주요 기능
              </a>
              <a
                href="#templates"
                className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              >
                추천 템플릿
              </a>
              <a
                href="#guide"
                className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              >
                활용 가이드
              </a>
            </nav>

            {/* 헤더 우측 작업 영역 */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Vercel 즉시 배포 가능
              </span>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col">{children}</div>

        {/* 하단 푸터 */}
        <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center md:items-start gap-1">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                &copy; {new Date().getFullYear()} EduCraft. All rights reserved.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                코딩 초보 선생님들을 위한 교육용 웹앱 스타터 보일러플레이트
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400 dark:text-slate-500">
              <a
                href="https://nextjs.org"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Next.js
              </a>
              <span>&middot;</span>
              <a
                href="https://tailwindcss.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Tailwind CSS
              </a>
              <span>&middot;</span>
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Vercel
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
