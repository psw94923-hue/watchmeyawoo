"use client";

import React from "react";
import Link from "next/link";
import { MathApp } from "../data/apps";

interface AppCardProps {
  app: MathApp;
  onOpenApp?: (internalAppId: 'cheese' | 'circumcenter' | 'exterior' | 'pythagoras') => void;
}

export default function AppCard({ app, onOpenApp }: AppCardProps) {
  // Theme color maps for pastel aurora accents
  const themeStyles = {
    pink: {
      badgeBg: "bg-rose-50 text-rose-700 border-rose-200/70",
      iconBg: "bg-gradient-to-tr from-rose-100 to-pink-50 border-rose-200/60",
      btnBg: "bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 shadow-rose-500/20",
      glowBg: "bg-rose-100/50",
      accentBorder: "hover:border-rose-300",
      tagBg: "bg-rose-50/80 text-rose-600",
    },
    lavender: {
      badgeBg: "bg-purple-50 text-purple-700 border-purple-200/70",
      iconBg: "bg-gradient-to-tr from-purple-100 to-indigo-50 border-purple-200/60",
      btnBg: "bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-500 hover:from-purple-600 hover:to-sky-600 shadow-purple-500/20",
      glowBg: "bg-purple-100/50",
      accentBorder: "hover:border-purple-300",
      tagBg: "bg-purple-50/80 text-purple-600",
    },
    sky: {
      badgeBg: "bg-sky-50 text-sky-700 border-sky-200/70",
      iconBg: "bg-gradient-to-tr from-sky-100 to-blue-50 border-sky-200/60",
      btnBg: "bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 shadow-sky-500/20",
      glowBg: "bg-sky-100/50",
      accentBorder: "hover:border-sky-300",
      tagBg: "bg-sky-50/80 text-sky-600",
    },
    mint: {
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
      iconBg: "bg-gradient-to-tr from-emerald-100 to-teal-50 border-emerald-200/60",
      btnBg: "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-emerald-500/20",
      glowBg: "bg-emerald-100/50",
      accentBorder: "hover:border-emerald-300",
      tagBg: "bg-emerald-50/80 text-emerald-600",
    },
    peach: {
      badgeBg: "bg-amber-50 text-amber-700 border-amber-200/70",
      iconBg: "bg-gradient-to-tr from-amber-100 to-orange-50 border-amber-200/60",
      btnBg: "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 shadow-amber-500/20",
      glowBg: "bg-amber-100/50",
      accentBorder: "hover:border-amber-300",
      tagBg: "bg-amber-50/80 text-amber-700",
    },
    violet: {
      badgeBg: "bg-violet-50 text-violet-700 border-violet-200/70",
      iconBg: "bg-gradient-to-tr from-violet-100 to-fuchsia-50 border-violet-200/60",
      btnBg: "bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 shadow-violet-500/20",
      glowBg: "bg-violet-100/50",
      accentBorder: "hover:border-violet-300",
      tagBg: "bg-violet-50/80 text-violet-600",
    },
  }[app.auroraTheme || "sky"];

  const handleClick = (e: React.MouseEvent) => {
    if (app.isComingSoon) return;
    if (app.internalAppId && onOpenApp) {
      e.preventDefault();
      onOpenApp(app.internalAppId);
    }
  };

  // Coming Soon Card
  if (app.isComingSoon) {
    return (
      <div className="bg-white/70 backdrop-blur-xs rounded-3xl p-6 sm:p-7 border-2 border-dashed border-slate-200 flex flex-col justify-between relative overflow-hidden select-none opacity-85">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-2xl">
              {app.emoji}
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-xs">
              공개 예정
            </span>
          </div>
          <span className="inline-block text-xs font-semibold text-slate-400 mb-1">
            {app.unitText}
          </span>
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            {app.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
            {app.description}
          </p>
        </div>
        <div className="w-full py-3 rounded-2xl bg-slate-100 text-slate-400 font-bold text-xs text-center border border-slate-200/50">
          ✨ 새로운 챌린지 개발 중
        </div>
      </div>
    );
  }

  // Card Content
  const CardInner = (
    <div
      onClick={handleClick}
      className={`group cursor-pointer bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] ${themeStyles.accentBorder} transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden h-full`}
    >
      {/* Aurora Ambient Glow in Background */}
      <div
        className={`absolute -top-12 -right-12 w-40 h-40 ${themeStyles.glowBg} rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500`}
      />

      <div className="relative z-10">
        {/* Top Header inside Card */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div
            className={`w-14 h-14 rounded-2xl ${themeStyles.iconBg} border flex items-center justify-center text-3xl shadow-xs group-hover:scale-110 transition-transform duration-300`}
          >
            {app.emoji}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {app.isNew && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
                NEW
              </span>
            )}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${themeStyles.badgeBg}`}
            >
              {app.gradeText}
            </span>
          </div>
        </div>

        {/* Unit & Title */}
        <div className="mb-2">
          <span className="text-xs font-semibold text-slate-400 tracking-tight">
            {app.unitText}
          </span>
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors mt-0.5">
            {app.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5 font-normal">
          {app.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {app.tags.map((tag, idx) => (
            <span
              key={idx}
              className={`text-[11px] font-medium px-2.5 py-0.8 rounded-lg ${themeStyles.tagBg}`}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="relative z-10 pt-2">
        <button
          type="button"
          className={`w-full py-3.5 rounded-2xl ${themeStyles.btnBg} text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer`}
        >
          <span>{app.category === 'challenge' ? '챌린지 도전하기' : '탐구 시작하기'}</span>
          <span className="text-base group-hover:translate-x-1 transition-transform">➔</span>
        </button>
      </div>
    </div>
  );

  // Link vs Internal action
  if (app.href && !app.internalAppId) {
    return (
      <Link href={app.href} className="block h-full">
        {CardInner}
      </Link>
    );
  }

  return CardInner;
}
