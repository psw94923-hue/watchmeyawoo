"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function MathLabClient() {
  const [showExperiment, setShowExperiment] = useState(false);
  
  // State for side lengths (in units, where 1 unit = 12 pixels in SVG)
  const [a, setA] = useState<number>(9); // height
  const [b, setB] = useState<number>(12); // base
  const [dragging, setDragging] = useState<'a' | 'b' | null>(null);

  // Calculated values
  const aSquared = a * a;
  const bSquared = b * b;
  const cSquared = aSquared + bSquared;
  const c = Math.sqrt(cSquared);

  // SVG parameters
  const scale = 12; // 1 unit = 12px
  const cx = 180;   // Right angle corner X
  const cy = 380;   // Right angle corner Y

  // Coordinates of triangle
  const xC = cx;
  const yC = cy;
  const xA = cx + b * scale;
  const yA = cy;
  const xB = cx;
  const yB = cy - a * scale;

  // Hypotenuse square points
  // Vector B -> A is (b * scale, a * scale)
  // Perpendicular vector going outward-up is (a * scale, -b * scale)
  const dx = b * scale;
  const dy = a * scale;
  const px = dy; // perpendicular vector x
  const py = -dx; // perpendicular vector y

  const xP1 = xA + px;
  const yP1 = yA + py;
  const xP2 = xB + px;
  const yP2 = yB + py;

  // Midpoints for labels
  const centerA = { x: cx - (a * scale) / 2, y: cy - (a * scale) / 2 };
  const centerB = { x: cx + (b * scale) / 2, y: cy + (b * scale) / 2 };
  const centerC = {
    x: (xB + xA + xP1 + xP2) / 4,
    y: (yB + yA + yP1 + yP2) / 4
  };

  // Dragging handlers
  const handlePointerDown = (handle: 'a' | 'b') => (e: React.PointerEvent<SVGCircleElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(handle);
  };

  const handlePointerMove = (handle: 'a' | 'b') => (e: React.PointerEvent<SVGCircleElement>) => {
    if (dragging !== handle) return;
    const svg = document.getElementById("pythagoras-svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 600;
    const y = ((e.clientY - rect.top) / rect.height) * 600;

    if (handle === 'a') {
      const val = (cy - y) / scale;
      // Allow values between 3 and 15, round to 1 decimal place
      const rounded = Math.max(3, Math.min(15, Math.round(val * 10) / 10));
      setA(rounded);
    } else {
      const val = (x - cx) / scale;
      const rounded = Math.max(3, Math.min(15, Math.round(val * 10) / 10));
      setB(rounded);
    }
  };

  const handlePointerUp = (handle: 'a' | 'b') => (e: React.PointerEvent<SVGCircleElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(null);
  };

  // Preset setter
  const applyPreset = (presetA: number, presetB: number) => {
    setA(presetA);
    setB(presetB);
  };

  // Clean values helper to display without unnecessary trailing decimals
  const formatNum = (num: number, digits = 1) => {
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(digits);
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFBFD] text-slate-800 flex flex-col font-sans select-none overflow-x-hidden relative">
      {/* Background Subtle Math Pattern Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none"></div>

      {/* Decorative Pastel Background Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] rounded-full bg-gradient-to-br from-pink-200/30 to-purple-200/30 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] rounded-full bg-gradient-to-tr from-blue-200/30 to-emerald-200/30 blur-[120px] pointer-events-none"></div>

      {/* Header / Navigation */}
      <header className="relative z-20 w-full px-6 py-5 flex items-center justify-between">
        <Link 
          href="/previous" 
          id="btn-previous-page"
          className="group flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200/80 bg-white/70 backdrop-blur-md text-xs sm:text-sm text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] active:scale-95 shadow-sm"
        >
          <span className="inline-block transition-transform duration-300 group-hover:-translate-x-1">←</span>
          <span>이전 페이지 살펴보기</span>
        </Link>

        {showExperiment && (
          <button
            onClick={() => setShowExperiment(false)}
            className="px-5 py-2.5 rounded-full border border-slate-200/80 bg-white/80 text-xs sm:text-sm text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] shadow-sm font-medium"
          >
            실험실 나가기 🏠
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pb-12 flex flex-col justify-center items-center relative z-10">
        {!showExperiment ? (
          /* Landing Screen */
          <div className="text-center max-w-2xl py-12 flex flex-col items-center animate-fade-in-up">
            {/* Subject Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 font-semibold text-xs sm:text-sm mb-8 shadow-sm">
              <span className="animate-pulse">🧪</span> 수학 실험실 #1
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-800 mb-6 leading-tight">
              세원쌤의 <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">수학 실험실</span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-500 text-base sm:text-lg mb-12 max-w-lg leading-relaxed font-normal">
              어려운 수학 공식도 직접 만지고 조작하며 재미있게 깨달을 수 있어요. 첫 번째 주제로 신비로운 <span className="font-semibold text-slate-700">피타고라스 정리</span>를 함께 관찰해볼까요?
            </p>

            {/* Center Call-to-action Button */}
            <div className="relative group">
              {/* Soft decorative shadow behind button */}
              <div className="absolute inset-0 bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 rounded-full blur-xl opacity-40 group-hover:opacity-75 transition-opacity duration-300"></div>
              
              <button
                onClick={() => setShowExperiment(true)}
                className="relative px-10 py-5 text-lg sm:text-xl font-bold text-purple-950 rounded-full bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 hover:from-pink-200 hover:via-purple-200 hover:to-blue-200 border border-purple-200/50 shadow-md shadow-purple-100/50 hover:shadow-lg hover:shadow-purple-200/30 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                &lt;피타고라스 측정하기&gt;
              </button>
            </div>

            {/* Decorative Floating Elements (Pure CSS) */}
            <div className="hidden md:block">
              {/* Triangle */}
              <div className="absolute top-1/4 left-0 w-16 h-16 opacity-35 animate-float pointer-events-none" style={{ animationDelay: '0s' }}>
                <svg viewBox="0 0 100 100" className="w-full h-full text-pink-300 fill-current">
                  <polygon points="10,90 90,90 10,10" />
                </svg>
              </div>
              {/* Plus Sign */}
              <div className="absolute top-1/3 right-4 w-12 h-12 opacity-35 animate-float pointer-events-none" style={{ animationDelay: '2.5s' }}>
                <svg viewBox="0 0 100 100" className="w-full h-full text-blue-300 stroke-current stroke-[15] fill-none">
                  <line x1="50" y1="15" x2="50" y2="85" />
                  <line x1="15" y1="50" x2="85" y2="50" />
                </svg>
              </div>
              {/* Square */}
              <div className="absolute bottom-1/4 left-10 w-14 h-14 opacity-30 animate-float pointer-events-none" style={{ animationDelay: '1.2s' }}>
                <svg viewBox="0 0 100 100" className="w-full h-full text-purple-300 fill-current">
                  <rect x="15" y="15" width="70" height="70" rx="10" />
                </svg>
              </div>
              {/* Root symbol */}
              <div className="absolute bottom-1/3 right-12 text-slate-300 text-4xl font-serif font-bold italic opacity-40 animate-float pointer-events-none" style={{ animationDelay: '3.8s' }}>
                &radic;x
              </div>
            </div>
          </div>
        ) : (
          /* Pythagoras Simulation Lab Screen */
          <div className="w-full animate-fade-in flex flex-col items-center">
            {/* Title Section */}
            <div className="text-center mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-500 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                실시간 기하학 실험실
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2">
                피타고라스 정리 측정기
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                주황색 손잡이를 잡고 마우스나 손가락으로 드래그하여 삼각형의 크기를 조절해보세요.
              </p>
            </div>

            {/* Split Grid Layout */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Interactive SVG Canvas */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full max-w-[600px] aspect-square bg-white rounded-3xl border border-slate-100 shadow-xl shadow-purple-100/30 overflow-hidden relative p-4 touch-none">
                  {/* Grid background inside SVG */}
                  <svg
                    id="pythagoras-svg"
                    viewBox="0 0 600 600"
                    className="w-full h-full select-none"
                  >
                    <defs>
                      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Area Square a (Pastel Pink) */}
                    <path
                      d={`M ${xC} ${yC} L ${xC} ${yB} L ${xC - a * scale} ${yB} L ${xC - a * scale} ${yC} Z`}
                      fill="url(#pink-grad)"
                      className="fill-rose-100/50 stroke-rose-300 stroke-2"
                      style={{ transition: dragging ? 'none' : 'all 0.15s ease-out' }}
                    />
                    <linearGradient id="pink-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffe4e6" />
                      <stop offset="100%" stopColor="#fecdd3" />
                    </linearGradient>

                    {/* Area Square b (Pastel Blue) */}
                    <path
                      d={`M ${xC} ${yC} L ${xA} ${yC} L ${xA} ${yC + b * scale} L ${xC} ${yC + b * scale} Z`}
                      fill="url(#blue-grad)"
                      className="fill-blue-100/50 stroke-blue-300 stroke-2"
                      style={{ transition: dragging ? 'none' : 'all 0.15s ease-out' }}
                    />
                    <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#e0f2fe" />
                      <stop offset="100%" stopColor="#bae6fd" />
                    </linearGradient>

                    {/* Area Square c (Pastel Purple) */}
                    <path
                      d={`M ${xB} ${yB} L ${xA} ${yA} L ${xP1} ${yP1} L ${xP2} ${yP2} Z`}
                      fill="url(#purple-grad)"
                      className="fill-purple-100/50 stroke-purple-300 stroke-2"
                      style={{ transition: dragging ? 'none' : 'all 0.15s ease-out' }}
                    />
                    <linearGradient id="purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f3e8ff" />
                      <stop offset="100%" stopColor="#e9d5ff" />
                    </linearGradient>

                    {/* Right-angled triangle ABC */}
                    <polygon
                      points={`${xC},${yC} ${xA},${yA} ${xB},${yB}`}
                      className="fill-amber-100/70 stroke-amber-500 stroke-[3] stroke-linejoin-round"
                      style={{ transition: dragging ? 'none' : 'all 0.15s ease-out' }}
                    />

                    {/* Right angle symbol at C */}
                    <path
                      d={`M ${xC} ${yC - 15} L ${xC + 15} ${yC - 15} L ${xC + 15} ${yC}`}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />

                    {/* Text Label: Area a^2 (Pink square) */}
                    <g
                      transform={`translate(${centerA.x}, ${centerA.y})`}
                      style={{ transition: dragging ? 'none' : 'all 0.15s ease-out' }}
                    >
                      <rect x="-35" y="-12" width="70" height="24" rx="6" className="fill-white/95 stroke-rose-200 stroke shadow-sm" />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-rose-700 font-bold text-xs"
                      >
                        a² = {formatNum(aSquared)}
                      </text>
                    </g>

                    {/* Text Label: Area b^2 (Blue square) */}
                    <g
                      transform={`translate(${centerB.x}, ${centerB.y})`}
                      style={{ transition: dragging ? 'none' : 'all 0.15s ease-out' }}
                    >
                      <rect x="-35" y="-12" width="70" height="24" rx="6" className="fill-white/95 stroke-blue-200 stroke shadow-sm" />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-blue-700 font-bold text-xs"
                      >
                        b² = {formatNum(bSquared)}
                      </text>
                    </g>

                    {/* Text Label: Area c^2 (Purple square) */}
                    <g
                      transform={`translate(${centerC.x}, ${centerC.y})`}
                      style={{ transition: dragging ? 'none' : 'all 0.15s ease-out' }}
                    >
                      <rect x="-35" y="-12" width="70" height="24" rx="6" className="fill-white/95 stroke-purple-200 stroke shadow-sm" />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-purple-700 font-bold text-xs"
                      >
                        c² = {formatNum(cSquared)}
                      </text>
                    </g>

                    {/* Side labels a, b, c */}
                    <text
                      x={xC + 10}
                      y={cy - (a * scale) / 2}
                      className="fill-rose-600 font-extrabold text-sm"
                      textAnchor="start"
                      dominantBaseline="middle"
                      style={{ transition: dragging ? 'none' : 'all 0.15s ease-out' }}
                    >
                      a = {formatNum(a)}
                    </text>

                    <text
                      x={cx + (b * scale) / 2}
                      y={yC - 10}
                      className="fill-blue-600 font-extrabold text-sm"
                      textAnchor="middle"
                      dominantBaseline="auto"
                      style={{ transition: dragging ? 'none' : 'all 0.15s ease-out' }}
                    >
                      b = {formatNum(b)}
                    </text>

                    <text
                      x={(xB + xA) / 2 - 15}
                      y={(yB + yA) / 2 + 15}
                      className="fill-purple-600 font-extrabold text-sm"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ transition: dragging ? 'none' : 'all 0.15s ease-out' }}
                    >
                      c &approx; {formatNum(c, 2)}
                    </text>

                    {/* Drag Handle for height (B point) */}
                    <circle
                      cx={xB}
                      cy={yB}
                      r="10"
                      className="fill-amber-500 stroke-white stroke-2 hover:fill-amber-600 active:scale-125 cursor-ns-resize transition-transform duration-100"
                      style={{ transition: dragging ? 'none' : 'cx 0.15s ease-out, cy 0.15s ease-out' }}
                      onPointerDown={handlePointerDown('a')}
                      onPointerMove={handlePointerMove('a')}
                      onPointerUp={handlePointerUp('a')}
                    />
                    {/* Ring animation on handle B */}
                    <circle
                      cx={xB}
                      cy={yB}
                      r="16"
                      className="fill-none stroke-amber-400 stroke-1 opacity-60 pointer-events-none animate-ping"
                      style={{ 
                        transformOrigin: `${xB}px ${yB}px`,
                        display: dragging === 'a' ? 'none' : 'block',
                        transition: 'cx 0.15s ease-out, cy 0.15s ease-out'
                      }}
                    />

                    {/* Drag Handle for base (A point) */}
                    <circle
                      cx={xA}
                      cy={yA}
                      r="10"
                      className="fill-amber-500 stroke-white stroke-2 hover:fill-amber-600 active:scale-125 cursor-ew-resize transition-transform duration-100"
                      style={{ transition: dragging ? 'none' : 'cx 0.15s ease-out, cy 0.15s ease-out' }}
                      onPointerDown={handlePointerDown('b')}
                      onPointerMove={handlePointerMove('b')}
                      onPointerUp={handlePointerUp('b')}
                    />
                    {/* Ring animation on handle A */}
                    <circle
                      cx={xA}
                      cy={yA}
                      r="16"
                      className="fill-none stroke-amber-400 stroke-1 opacity-60 pointer-events-none animate-ping"
                      style={{ 
                        transformOrigin: `${xA}px ${yA}px`,
                        display: dragging === 'b' ? 'none' : 'block',
                        transition: 'cx 0.15s ease-out, cy 0.15s ease-out'
                      }}
                    />

                    {/* C corner indicator */}
                    <circle
                      cx={xC}
                      cy={yC}
                      r="5"
                      className="fill-slate-700 pointer-events-none"
                    />
                  </svg>
                </div>
              </div>

              {/* Right Column: Controls, Formulas & Educational Info */}
              <div className="lg:col-span-5 flex flex-col gap-6 w-full">
                {/* 1. Live Formula Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-lg shadow-purple-50/50 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    실시간 수학 수식
                  </h3>
                  
                  {/* Big Formula Display */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/50 text-center mb-5 font-mono">
                    <div className="text-xl sm:text-2xl font-black flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="text-rose-600">a²</span>
                      <span className="text-slate-400 font-light">+</span>
                      <span className="text-blue-600">b²</span>
                      <span className="text-slate-400 font-light">=</span>
                      <span className="text-purple-600">c²</span>
                    </div>
                    
                    <div className="text-base sm:text-lg font-bold text-slate-700 mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="text-rose-600">{formatNum(aSquared)}</span>
                      <span className="text-slate-400 font-light">+</span>
                      <span className="text-blue-600">{formatNum(bSquared)}</span>
                      <span className="text-slate-400 font-light">=</span>
                      <span className="text-purple-600">{formatNum(cSquared)}</span>
                    </div>
                  </div>

                  {/* Calculations Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                      <span className="font-medium text-slate-500 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                        높이 (a)
                      </span>
                      <span className="font-bold text-slate-800">{formatNum(a)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                      <span className="font-medium text-slate-500 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                        밑변 (b)
                      </span>
                      <span className="font-bold text-slate-800">{formatNum(b)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                        빗변 (c)
                      </span>
                      <span className="font-bold text-slate-800">
                        &radic;({formatNum(aSquared)} + {formatNum(bSquared)}) &approx; {formatNum(c, 2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Manual Range Sliders */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-lg shadow-purple-50/50">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    길이 미세 조절
                  </h3>

                  <div className="space-y-5">
                    {/* Slider a */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                        <span className="text-rose-600">높이 a</span>
                        <span>{formatNum(a)}</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="15"
                        step="0.1"
                        value={a}
                        onChange={(e) => setA(parseFloat(e.target.value))}
                        className="w-full accent-rose-400 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Slider b */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                        <span className="text-blue-600">밑변 b</span>
                        <span>{formatNum(b)}</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="15"
                        step="0.1"
                        value={b}
                        onChange={(e) => setB(parseFloat(e.target.value))}
                        className="w-full accent-blue-400 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Preset Pythagorean Triples */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-lg shadow-purple-50/50">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                    추천 피타고라스 정수비 (a : b : c)
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => applyPreset(3, 4)}
                      className="px-4 py-2.5 rounded-xl border border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50/40 text-xs sm:text-sm text-slate-700 font-semibold transition-all duration-200 flex flex-col items-center cursor-pointer"
                    >
                      <span className="text-purple-600 text-[10px] font-bold">기본 삼조</span>
                      <span>3 : 4 : 5</span>
                    </button>
                    <button
                      onClick={() => applyPreset(5, 12)}
                      className="px-4 py-2.5 rounded-xl border border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50/40 text-xs sm:text-sm text-slate-700 font-semibold transition-all duration-200 flex flex-col items-center cursor-pointer"
                    >
                      <span className="text-purple-600 text-[10px] font-bold">인기 비율</span>
                      <span>5 : 12 : 13</span>
                    </button>
                    <button
                      onClick={() => applyPreset(8, 15)}
                      className="px-4 py-2.5 rounded-xl border border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50/40 text-xs sm:text-sm text-slate-700 font-semibold transition-all duration-200 flex flex-col items-center cursor-pointer"
                    >
                      <span className="text-purple-600 text-[10px] font-bold">긴 밑변 비율</span>
                      <span>8 : 15 : 17</span>
                    </button>
                    <button
                      onClick={() => applyPreset(10, 10)}
                      className="px-4 py-2.5 rounded-xl border border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50/40 text-xs sm:text-sm text-slate-700 font-semibold transition-all duration-200 flex flex-col items-center cursor-pointer"
                    >
                      <span className="text-purple-600 text-[10px] font-bold">직각이등변삼각형</span>
                      <span>1 : 1 : &radic;2</span>
                    </button>
                  </div>
                </div>

                {/* 4. Educational summary card */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100/50 rounded-3xl p-6">
                  <h4 className="text-sm font-bold text-indigo-950 mb-2 flex items-center gap-1.5">
                    💡 수학 원리 들여다보기
                  </h4>
                  <p className="text-xs sm:text-sm text-indigo-900/80 leading-relaxed font-light">
                    직각삼각형의 두 짧은 변(a, b)에 만들어지는 분홍색과 파란색 정사각형 면적을 더하면, 가장 긴 빗변(c) 위에 만들어지는 보라색 정사각형의 면적과 항상 완벽하게 일치합니다. 이것이 바로 <strong>피타고라스의 정리(Pythagorean Theorem)</strong>입니다!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-[10px] text-slate-400 tracking-[0.1em] border-t border-slate-100/50 relative z-20">
        &copy; {new Date().getFullYear()} SEWON MATH LAB. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
