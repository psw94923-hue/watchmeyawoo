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
  title: "세원쌤의 수학 실험실",
  description: "중학교 1학년, 2학년 수학 연계 인터랙티브 탐구 및 챌린지 게임 웹 플랫폼",
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
      <body className="min-h-screen bg-white text-slate-800 font-sans antialiased selection:bg-purple-100 selection:text-purple-900">
        {children}
      </body>
    </html>
  );
}
