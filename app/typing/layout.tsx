import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "체육대회 모바일 타자 속도전",
  description: "5단계 모바일 타자 빨리치기 경기 웹앱입니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

export default function TypingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white text-black min-h-[100dvh] h-[100dvh] w-full overflow-hidden select-none touch-manipulation">
      {children}
    </div>
  );
}
