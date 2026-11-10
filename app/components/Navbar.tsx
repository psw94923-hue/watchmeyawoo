"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavbarProps {
  currentCategory?: 'all' | 'grade1' | 'grade2' | 'challenge';
  onSelectCategory?: (category: 'all' | 'grade1' | 'grade2' | 'challenge') => void;
  onResetApp?: () => void;
}

export default function Navbar({
  currentCategory = 'all',
  onSelectCategory,
  onResetApp,
}: NavbarProps) {
  const pathname = usePathname();

  // Active category determination:
  // If pathname matches a dedicated page, use it; otherwise fallback to currentCategory prop.
  let activeTab: string = currentCategory;
  if (pathname === '/bakery') activeTab = 'bakery';
  else if (pathname === '/grade1') activeTab = 'grade1';
  else if (pathname === '/grade2') activeTab = 'grade2';
  else if (pathname === '/challenge') activeTab = 'challenge';
  else if (pathname === '/') activeTab = currentCategory;

  const handleNavClick = (cat: 'all' | 'grade1' | 'grade2' | 'challenge', href: string) => {
    if (onResetApp) onResetApp();
    if (onSelectCategory && pathname === '/' && href === '/') {
      onSelectCategory(cat);
    }
  };

  const navItems = [
    { id: 'bakery', label: '공개수업(베이커리)', href: '/bakery', emoji: '🥐', highlight: true },
    { id: 'all', label: '전체 홈', href: '/', emoji: '🏠' },
    { id: 'grade1', label: '중1 수학', href: '/grade1', emoji: '🌸' },
    { id: 'grade2', label: '중2 수학', href: '/grade2', emoji: '🔮' },
    { id: 'challenge', label: '챌린지 게임', href: '/challenge', emoji: '🏆' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 overflow-x-hidden">
        {/* LOGO */}
        <Link
          href="/"
          onClick={() => {
            if (onResetApp) onResetApp();
            if (onSelectCategory) onSelectCategory('all');
          }}
          className="flex items-center gap-2.5 group cursor-pointer shrink-0 whitespace-nowrap"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-100 via-pink-100 to-sky-100 border border-purple-200/50 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform shrink-0">
            🧪
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
              세원쌤의 <span className="aurora-gradient-text font-black">수학 실험실</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium -mt-0.5 hidden sm:block whitespace-nowrap">
              SEWON INTERACTIVE MATH LAB
            </span>
          </div>
        </Link>

        {/* NAVIGATION LINKS */}
        <nav className="flex items-center gap-1 sm:gap-2 shrink-0 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => handleNavClick(item.id as any, item.href)}
                className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : item.highlight
                    ? "bg-orange-500 hover:bg-orange-600 text-white font-extrabold shadow-xs"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/70"
                }`}
              >
                <span className="shrink-0">{item.emoji}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
