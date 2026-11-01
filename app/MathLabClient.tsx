"use client";

import React, { useState, useEffect, useRef } from "react";
import CheeseCuttingApp from "./components/CheeseCuttingApp";
import CircumcenterApp from "./components/CircumcenterApp";
import ExteriorAngleApp from "./components/ExteriorAngleApp";
import Navbar from "./components/Navbar";
import AppCard from "./components/AppCard";
import { MATH_APPS } from "./data/apps";
import Link from "next/link";

type Step = 'setup' | 'step1' | 'step2' | 'analysis';
type ActiveApp = 'hub' | 'cheese' | 'circumcenter' | 'exterior' | 'pythagoras';

interface MathLabClientProps {
  initialCategory?: 'all' | 'grade1' | 'grade2' | 'challenge';
}

export default function MathLabClient({
  initialCategory = 'all',
}: MathLabClientProps) {
  // Navigation & Sub-App State
  const [activeApp, setActiveApp] = useState<ActiveApp>('hub');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'grade1' | 'grade2' | 'challenge'>(initialCategory);

  // App States for Pythagoras AR App
  const [step, setStep] = useState<Step>('setup');
  const [eyeHeight, setEyeHeight] = useState<number>(1.50); // h
  
  // Real-time Pitch Angle (0° = Horizon Level)
  const [currentPitch, setCurrentPitch] = useState<number>(0);
  const [fixedPitch1, setFixedPitch1] = useState<number | null>(null);
  const [fixedPitch2, setFixedPitch2] = useState<number | null>(null);
  
  const [theta1, setTheta1] = useState<number | null>(null); // looking down angle (>0)
  const [theta2, setTheta2] = useState<number | null>(null); // looking up angle (>0)

  // Calibrated Horizontal Distance d (in meters, auto-calculated & user-adjustable)
  const [calibratedDistance, setCalibratedDistance] = useState<number | null>(null);

  // Camera & Device Orientation Status
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Captured Photo Frame
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Modal State
  const [showSolutionModal, setShowSolutionModal] = useState<boolean>(false);

  // Media references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // -------------------------------------------------------------
  // 1. Device Orientation Listener (Portrait Pitch Mapping)
  // -------------------------------------------------------------
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null) return;

      const b = e.beta;
      const g = e.gamma || 0;

      let pitch = 90 - b;

      if (Math.abs(g) > 45) {
        const radB = (b * Math.PI) / 180;
        const radG = (g * Math.PI) / 180;
        const pitchRad = Math.atan2(-Math.cos(radG) * Math.sin(radB), Math.cos(radB));
        pitch = (pitchRad * 180) / Math.PI - 90;
      }

      pitch = Math.max(-89, Math.min(89, pitch));
      setCurrentPitch(Math.round(pitch * 10) / 10);
    };

    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if ('DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // -------------------------------------------------------------
  // 2. Camera & Permission Start
  // -------------------------------------------------------------
  const requestPermissionsAndStart = async () => {
    setCameraError(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        throw new Error("카메라 미지원 브라우저입니다.");
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("카메라 접근 권한이 없거나 지원되지 않는 환경입니다.");
      setCameraActive(false);
    }

    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        await (DeviceOrientationEvent as any).requestPermission();
      } catch (err) {
        console.warn("Motion permission rejected:", err);
      }
    }

    setStep('step1');
  };

  // Capture video frame to image canvas
  const captureVideoFrame = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL("image/jpeg"));
      }
    }
  };

  // -------------------------------------------------------------
  // 3. Step Actions & Distance Calculation Optimization
  // -------------------------------------------------------------
  const handleStep1Lock = () => {
    const pitch = currentPitch;
    const absAngle = Math.max(1, Math.abs(pitch));
    setFixedPitch1(pitch);
    setTheta1(absAngle);

    // Initial estimation of horizontal distance d
    // Clamp d between 1.0m and 12.0m to prevent near-zero angle explosion (e.g. 96m error)
    const t1RadInit = absAngle * (Math.PI / 180);
    let calculatedD = eyeHeight / Math.tan(t1RadInit);
    if (calculatedD > 12.0 || absAngle < 5.0) {
      calculatedD = 3.0; // Realistic indoor pillar/wall distance default
    } else {
      calculatedD = Math.round(calculatedD * 10) / 10;
    }
    setCalibratedDistance(calculatedD);

    setStep('step2');
  };

  const handleStep2Lock = () => {
    const pitch = currentPitch;
    const absAngle = Math.max(1, Math.abs(pitch));
    setFixedPitch2(pitch);
    setTheta2(absAngle);

    // Capture photo at Step 2 completion
    captureVideoFrame();
  };

  const handleGoToAnalysis = () => {
    setStep('analysis');
  };

  const handleReset = () => {
    setStep('setup');
    setFixedPitch1(null);
    setFixedPitch2(null);
    setTheta1(null);
    setTheta2(null);
    setCalibratedDistance(null);
    setCapturedImage(null);
    setShowSolutionModal(false);
  };

  // -------------------------------------------------------------
  // 4. Mathematical Computations
  // -------------------------------------------------------------
  const t1Rad = (theta1 || 1) * (Math.PI / 180);
  const t2Rad = (theta2 || 1) * (Math.PI / 180);

  // Use user-calibrated or estimated distance d
  const d = calibratedDistance !== null ? calibratedDistance : Math.min(12, Math.max(1, eyeHeight / Math.tan(t1Rad)));
  const y = d * Math.tan(t2Rad);
  const H = y + eyeHeight;
  const c1 = Math.sqrt(d * d + eyeHeight * eyeHeight);
  const c2 = Math.sqrt(d * d + y * y);

  const fmt = (num: number, dec = 2) => num.toFixed(dec);

  // iOS Measure App AR dynamic point offsets
  const reticleX = 150;
  const reticleY = 180;

  // Position of Step 1 Base Marker relative to active tilt
  const pitchDiff1 = fixedPitch1 !== null ? (currentPitch - fixedPitch1) : 0;
  const marker1Y = Math.min(330, Math.max(50, reticleY + pitchDiff1 * 4.0));

  // Position of Step 1 Base Marker when frozen for Analysis
  const finalPitchDiff = (fixedPitch2 !== null && fixedPitch1 !== null) ? (fixedPitch2 - fixedPitch1) : 0;
  const finalMarker1Y = Math.min(330, Math.max(180, reticleY + finalPitchDiff * 4.0));
  const finalMarker2Y = 60; // Top marker position

  // -------------------------------------------------------------
  // RENDER APP 1: CHEESE CUTTING APP
  // -------------------------------------------------------------
  if (activeApp === 'cheese') {
    return <CheeseCuttingApp onBack={() => setActiveApp('hub')} />;
  }

  // -------------------------------------------------------------
  // RENDER APP 2: CIRCUMCENTER GAME APP
  // -------------------------------------------------------------
  if (activeApp === 'circumcenter') {
    return <CircumcenterApp onBack={() => setActiveApp('hub')} />;
  }

  // -------------------------------------------------------------
  // RENDER APP 3: POLYGON EXTERIOR ANGLE APP
  // -------------------------------------------------------------
  if (activeApp === 'exterior') {
    return <ExteriorAngleApp onBack={() => setActiveApp('hub')} />;
  }

  // -------------------------------------------------------------
  // RENDER HUB: MODERN PASTEL AURORA SELECTION HUB
  // -------------------------------------------------------------
  if (activeApp === 'hub') {
    // Filter apps based on category tab
    const filteredApps = selectedCategory === 'all'
      ? MATH_APPS
      : MATH_APPS.filter(app => app.category === selectedCategory);

    const grade1Count = MATH_APPS.filter(a => a.category === 'grade1').length;
    const grade2Count = MATH_APPS.filter(a => a.category === 'grade2').length;
    const challengeCount = MATH_APPS.filter(a => a.category === 'challenge').length;

    return (
      <div className="min-h-screen w-full aurora-bg flex flex-col font-sans select-none relative overflow-x-hidden text-slate-800">
        {/* TOP NAVBAR */}
        <Navbar
          currentCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          onResetApp={() => setActiveApp('hub')}
        />

        {/* HERO HEADER */}
        <main className="flex-1 flex flex-col items-center p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {/* DYNAMIC HERO HEADER */}
          <section className="text-center my-6 sm:my-10 max-w-3xl animate-fade-in relative">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full aurora-gradient-pill border border-purple-200/50 shadow-xs mb-4">
              <span className="text-sm">
                {selectedCategory === 'grade1' ? '🌸' : selectedCategory === 'grade2' ? '🔮' : selectedCategory === 'challenge' ? '🏆' : '✨'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-purple-900 tracking-tight">
                {selectedCategory === 'grade1' && '중학교 1학년 수학 교육과정 연계 탐구관'}
                {selectedCategory === 'grade2' && '중학교 2학년 수학 교육과정 연계 탐구관'}
                {selectedCategory === 'challenge' && '교내 체육대회 공식 종목 & 랭킹 배틀'}
                {selectedCategory === 'all' && '아이들의 눈높이에 맞춘 인터랙티브 수학 놀이터'}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-3">
              {selectedCategory === 'grade1' && <>1학년 <span className="text-rose-500">수학 실험실</span></>}
              {selectedCategory === 'grade2' && <>2학년 <span className="text-indigo-600">수학 실험실</span></>}
              {selectedCategory === 'challenge' && <>🏆 <span className="aurora-gradient-text">&lt;챌린지 게임 모음&gt;</span></>}
              {selectedCategory === 'all' && <>세원쌤의 <span className="aurora-gradient-text">수학 실험실</span></>}
            </h1>
            
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto font-normal">
              {selectedCategory === 'grade1' && '입체도형 접기, 피자 자르기, 치즈 다각형 분할, 외각 모으기로 도형의 원리를 발견해보세요.'}
              {selectedCategory === 'grade2' && '손그림 마을 닮음 찾기, 밤하늘 외심 항성 탐사, 카메라 AR 피타고라스 실측을 체험해보세요.'}
              {selectedCategory === 'challenge' && '체육대회 애국가·교가 타자 속도전과 외심 정밀 타겟전에서 실시간 최고 기록을 세워보세요!'}
              {selectedCategory === 'all' && '직접 도형을 만지고, 자르고, 측정하며 수학의 원리를 직관적으로 발견해보세요.'}
            </p>
          </section>

          {/* CONDITIONAL BANNER / GATEWAYS */}
          {selectedCategory === 'all' ? (
            /* 3 LARGE MAIN GATEWAY CARDS (GRADE 1 / GRADE 2 / CHALLENGE GAMES) */
            <section className="w-full mb-10">
              <div className="text-center sm:text-left mb-4">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                  EXPLORE CATEGORIES • 바로가기
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  어디로 가볼까요?
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* GATEWAY 1: GRADE 1 */}
                <div
                  onClick={() => setSelectedCategory('grade1')}
                  className="group cursor-pointer rounded-3xl p-6 sm:p-7 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between bg-white/90 hover:bg-white border-slate-100 hover:border-rose-200 shadow-xs hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-100/60 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                        🌸
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                        4개 활동 수록
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors mb-1.5">
                      중학교 1학년 수학
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                      3D 정다면체 메이커, 피자 자르기, 치즈 다각형 분할, 다각형 외각 모으기
                    </p>
                  </div>
                  <div className="relative z-10 pt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600 group-hover:underline">
                      1학년 활동 바로보기
                    </span>
                    <Link
                      href="/grade1"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs px-3 py-1.5 rounded-xl bg-rose-100/70 hover:bg-rose-600 text-rose-800 hover:text-white font-bold transition-colors"
                    >
                      전용 페이지 ➔
                    </Link>
                  </div>
                </div>

                {/* GATEWAY 2: GRADE 2 */}
                <div
                  onClick={() => setSelectedCategory('grade2')}
                  className="group cursor-pointer rounded-3xl p-6 sm:p-7 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between bg-white/90 hover:bg-white border-slate-100 hover:border-indigo-200 shadow-xs hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-100/60 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                        🔮
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        3개 활동 수록
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1.5">
                      중학교 2학년 수학
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                      손그림 마을 닮음 찾기, 밤하늘 외심 탐사선 랭킹, 카메라 AR 피타고라스 실측
                    </p>
                  </div>
                  <div className="relative z-10 pt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 group-hover:underline">
                      2학년 활동 바로보기
                    </span>
                    <Link
                      href="/grade2"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs px-3 py-1.5 rounded-xl bg-indigo-100/70 hover:bg-indigo-600 text-indigo-800 hover:text-white font-bold transition-colors"
                    >
                      전용 페이지 ➔
                    </Link>
                  </div>
                </div>

                {/* GATEWAY 3: CHALLENGE GAMES */}
                <div
                  onClick={() => setSelectedCategory('challenge')}
                  className="group cursor-pointer rounded-3xl p-6 sm:p-7 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-white via-pink-50/20 to-purple-50/30 hover:bg-white border-purple-200/70 hover:border-purple-300 shadow-sm hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-pink-200/60 to-purple-200/60 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-100 via-purple-100 to-sky-100 border border-purple-200 flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                        🏆
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-xs">
                        체육대회 & 랭킹전
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors mb-1.5 flex items-center gap-1.5">
                      <span>&lt;챌린지 게임 모음&gt;</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                      반 대항전 체육대회 타자 속도전, 외심 정밀 조준전, 신규 챌린지 게임
                    </p>
                  </div>
                  <div className="relative z-10 pt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-600 group-hover:underline">
                      챌린지 게임 바로보기
                    </span>
                    <Link
                      href="/challenge"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 text-white font-bold hover:opacity-90 transition-opacity shadow-xs"
                    >
                      전용 페이지 ➔
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            /* DEDICATED CATEGORY BANNER */
            <section className="w-full mb-8 animate-fade-in">
              {selectedCategory === 'grade1' && (
                <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-orange-50 border border-rose-200/60 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-rose-200 flex items-center justify-center text-3xl shadow-xs shrink-0">
                      🌸
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white">
                          중1 전용관
                        </span>
                        <span className="text-xs font-bold text-rose-700">
                          기하 & 다각형 단원
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        중학교 1학년 수학 탐구실
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        3D 정다면체 메이커, 피자 자르기, 치즈 다각형 분할, 외각 모으기로 수학의 원리를 발견해보세요!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="relative z-10 px-4 py-2.5 rounded-2xl bg-white hover:bg-rose-100/60 text-slate-700 font-bold text-xs border border-rose-200 transition-colors shrink-0 cursor-pointer"
                  >
                    전체 목록 보기 ➔
                  </button>
                </div>
              )}

              {selectedCategory === 'grade2' && (
                <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-sky-50 border border-indigo-200/60 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center text-3xl shadow-xs shrink-0">
                      🔮
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
                          중2 전용관
                        </span>
                        <span className="text-xs font-bold text-indigo-700">
                          도형의 닮음 & 성질 단원
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        중학교 2학년 수학 탐구실
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        손그림 마을 닮음 찾기, 밤하늘 외심 탐사선 랭킹, 카메라 AR 피타고라스 실측을 체험해보세요!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="relative z-10 px-4 py-2.5 rounded-2xl bg-white hover:bg-indigo-100/60 text-slate-700 font-bold text-xs border border-indigo-200 transition-colors shrink-0 cursor-pointer"
                  >
                    전체 목록 보기 ➔
                  </button>
                </div>
              )}

              {selectedCategory === 'challenge' && (
                <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-sky-50 border border-purple-200/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-tr from-pink-300/30 to-purple-300/30 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-100 via-purple-100 to-sky-100 border border-purple-200 flex items-center justify-center text-3xl shadow-xs shrink-0">
                      🏆
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-rose-500 to-purple-600 text-white">
                          체육대회 & 이벤트
                        </span>
                        <span className="text-xs font-bold text-purple-700">
                          실시간 랭킹 시스템 연동
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>&lt;챌린지 게임 모음&gt;</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        체육대회 애국가·교가 타자 속도전과 외심 정밀 타겟전에서 반 대항전 및 개인전 최고 기록을 세워보세요!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="relative z-10 px-4 py-2.5 rounded-2xl bg-white hover:bg-purple-100/60 text-purple-900 font-bold text-xs border border-purple-200 transition-colors shrink-0 cursor-pointer"
                  >
                    전체 목록 보기 ➔
                  </button>
                </div>
              )}
            </section>
          )}

          {/* QUICK CATEGORY TABS */}
          <section className="w-full mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-slate-200/60"
                  }`}
                >
                  전체보기 ({MATH_APPS.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('grade1')}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === 'grade1'
                      ? "bg-rose-500 text-white shadow-xs shadow-rose-500/20"
                      : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200/60"
                  }`}
                >
                  <span>🌸</span>
                  <span>중1 수학 ({grade1Count})</span>
                </button>
                <button
                  onClick={() => setSelectedCategory('grade2')}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === 'grade2'
                      ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/20"
                      : "bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200/60"
                  }`}
                >
                  <span>🔮</span>
                  <span>중2 수학 ({grade2Count})</span>
                </button>
                <button
                  onClick={() => setSelectedCategory('challenge')}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === 'challenge'
                      ? "bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 text-white shadow-xs"
                      : "bg-gradient-to-r from-pink-50 to-purple-50 text-purple-800 hover:from-pink-100 hover:to-purple-100 border border-purple-200/60"
                  }`}
                >
                  <span>🏆</span>
                  <span>&lt;챌린지 게임 모음&gt; ({challengeCount})</span>
                </button>
              </div>

              <span className="text-xs font-semibold text-slate-400">
                {selectedCategory === 'all' && `전체 ${MATH_APPS.length}개 프로그램`}
                {selectedCategory === 'grade1' && "중학교 1학년 교육과정 연계"}
                {selectedCategory === 'grade2' && "중학교 2학년 교육과정 연계"}
                {selectedCategory === 'challenge' && "체육대회 & 실시간 랭킹 게임"}
              </span>
            </div>
          </section>

          {/* APPLICATION CARDS GRID */}
          <section className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 animate-fade-in">
            {filteredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onOpenApp={(id) => setActiveApp(id)}
              />
            ))}
          </section>
        </main>

        {/* CLEAN MINIMAL FOOTER */}
        <footer className="w-full bg-white/70 border-t border-slate-100 py-8 px-4 sm:px-6 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🧪</span>
              <span className="font-bold text-slate-700">세원쌤의 수학 실험실</span>
              <span className="text-slate-300">|</span>
              <span>중학교 수학 탐구 & 챌린지 웹 플랫폼</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <Link href="/grade1" className="hover:text-slate-700 transition-colors">중1 수학</Link>
              <Link href="/grade2" className="hover:text-slate-700 transition-colors">중2 수학</Link>
              <Link href="/challenge" className="hover:text-purple-600 font-semibold transition-colors">챌린지 게임 모음</Link>
              <Link href="/typing" className="hover:text-rose-600 transition-colors">체육대회 타자 속도전</Link>
            </div>
          </div>
        </footer>
      </div>
    );
  }


  // -------------------------------------------------------------
  // RENDER APP 3: PYTHAGORAS AR HEIGHT MEASUREMENT APP
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* ------------------------------------------------------------- */}
      {/* CAMERA VIDEO STREAM (FULL SCREEN IN MEASUREMENT MODE) */}
      {/* ------------------------------------------------------------- */}
      {step !== 'analysis' && (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />
      )}

      {/* FALLBACK BACKGROUND IF CAMERA DISCONNECTED */}
      {step !== 'analysis' && !cameraActive && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>
          {cameraError && (
            <div className="z-10 bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs px-4 py-2.5 rounded-2xl max-w-sm mb-4">
              ⚠️ {cameraError}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MINIMAL TOP NAVIGATION */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-30 w-full p-4 flex items-center justify-between pointer-events-auto">
        <button
          onClick={() => setActiveApp('hub')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <span>🏠</span>
          <span>메인으로</span>
        </button>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* STEP 0: SETUP SCREEN */}
      {/* ------------------------------------------------------------- */}
      {step === 'setup' && (
        <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl text-center w-full animate-fade-in-up">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-400 text-xs font-bold mb-4">
              📐 iOS 측정 앱 방식 AR 높이 측정기
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
              세원쌤의 <span className="text-teal-400">수학 실험실</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              건물 바닥과 꼭대기를 찍어 실시간 직선 트래킹 라인과 <strong className="text-slate-200">피타고라스 정리</strong>로 높이를 산출합니다.
            </p>

            {/* Eye Height Setup Input */}
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 mb-6 text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                👤 관측자 눈높이 (h) 설정
              </label>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setEyeHeight(prev => Math.max(0.5, Math.round((prev - 0.05) * 100) / 100))}
                  className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg border border-slate-600 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  -
                </button>

                <div className="flex-1 text-center bg-slate-950 rounded-xl py-2 px-3 border border-slate-700">
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="2.5"
                    value={eyeHeight}
                    onChange={(e) => setEyeHeight(parseFloat(e.target.value) || 1.50)}
                    className="w-full text-center text-xl font-extrabold text-emerald-400 bg-transparent focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block font-medium">미터 (m)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setEyeHeight(prev => Math.min(2.5, Math.round((prev + 0.05) * 100) / 100))}
                  className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg border border-slate-600 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={requestPermissionsAndStart}
              className="w-full py-4 text-base font-bold text-slate-950 rounded-2xl bg-teal-300 hover:bg-teal-200 shadow-lg shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
            >
              📷 카메라 시작 & 측정하기
            </button>
          </div>
        </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PHASE 1: MEASUREMENT MODE (STEPS 1 & 2) - iOS MEASURE LINE TRACKING */}
      {/* ------------------------------------------------------------- */}
      {(step === 'step1' || step === 'step2') && (
        <div className="relative z-20 flex-1 flex flex-col justify-between pointer-events-none">
          {/* Top Angle Badge */}
          <div className="w-full pt-1 flex flex-col items-center pointer-events-auto">
            <div className="bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700 text-xs font-semibold text-slate-200 shadow-lg flex items-center gap-2">
              <span className="text-slate-400">
                {step === 'step1' ? "📍 바닥 조준 (θ₁)" : "🏢 꼭대기 조준 (θ₂)"}
              </span>
              <span className="text-sm font-extrabold text-amber-300 font-mono">
                {currentPitch > 0 ? `+${currentPitch}°` : `${currentPitch}°`}
              </span>
            </div>

            {step === 'step2' && fixedPitch2 === null && (
              <span className="mt-1 text-[11px] font-medium text-emerald-300 bg-slate-900/80 px-3 py-0.5 rounded-full border border-emerald-500/40">
                ⬆️ 위로 이동하며 꼭대기 지점을 찍으세요 (실선이 연결됩니다)
              </span>
            )}
          </div>

          {/* iOS MEASURE APP STYLE SOLID WHITE LINE & LIVE HEIGHT BADGE */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg viewBox="0 0 300 360" className="w-full h-full">
              {/* Dynamic Thick White Solid Line extending from Step 1 Base Marker up to Active Crosshair (Image 2 style) */}
              {step === 'step2' && fixedPitch1 !== null && (
                <>
                  {/* Thick White Solid Measurement Line */}
                  <line
                    x1={reticleX}
                    y1={marker1Y}
                    x2={reticleX}
                    y2={reticleY}
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                  />

                  {/* Step 1 Base White Circle Pin (Image 2 style) */}
                  <g transform={`translate(${reticleX}, ${marker1Y})`}>
                    <circle r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
                    <circle r="14" fill="none" stroke="#ffffff" strokeWidth="1.5" className="animate-ping" />
                  </g>

                  {/* Attached Oval Height Badge at the center of the tracking line (Image 2 style) */}
                  <g transform={`translate(${reticleX}, ${(marker1Y + reticleY) / 2})`}>
                    <rect x="-35" y="-12" width="70" height="24" rx="12" fill="#ffffff" stroke="#000000" strokeWidth="1" className="shadow-lg" />
                    <text x="0" y="3" fill="#000000" fontSize="11" fontWeight="extrabold" textAnchor="middle">
                      {fmt(H, 2)}m
                    </text>
                  </g>
                </>
              )}

              {/* Center AR Crosshair Reticle (iOS Measure style dot & circle) */}
              {fixedPitch2 === null && (
                <g transform={`translate(${reticleX}, ${reticleY})`}>
                  <circle r="18" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                  <circle r="4" fill="#ffffff" className="shadow-md" />
                </g>
              )}

              {/* Step 2 Top Marker Pin when locked */}
              {fixedPitch2 !== null && (
                <g transform={`translate(${reticleX}, ${reticleY})`}>
                  <circle r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
                </g>
              )}
            </svg>
          </div>

          {/* Bottom Action Buttons */}
          <div className="w-full p-6 pb-8 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col items-center pointer-events-auto">
            {step === 'step1' && (
              <button
                onClick={handleStep1Lock}
                className="w-full max-w-xs py-4 text-base font-bold text-slate-950 rounded-2xl bg-rose-300 hover:bg-rose-200 shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                📍 바닥 지점 고정 (Step 1)
              </button>
            )}

            {step === 'step2' && fixedPitch2 === null && (
              <button
                onClick={handleStep2Lock}
                className="w-full max-w-xs py-4 text-base font-bold text-slate-950 rounded-2xl bg-amber-300 hover:bg-amber-200 shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                🏢 꼭대기 지점 고정 (Step 2)
              </button>
            )}

            {/* When Step 2 is fixed, show Transition Button to Analysis Mode */}
            {step === 'step2' && fixedPitch2 !== null && (
              <button
                onClick={handleGoToAnalysis}
                className="w-full max-w-xs py-4 text-base font-bold text-slate-950 rounded-2xl bg-emerald-300 hover:bg-emerald-200 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer animate-pulse"
              >
                📸 캡처 사진 기반 피타고라스 분석하기 ➔
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PHASE 2: CAPTURED PHOTO ANALYSIS MODE (SEPARATED UPPER & LOWER LAYOUT) */}
      {/* ------------------------------------------------------------- */}
      {step === 'analysis' && (
        <div className="relative z-20 flex-1 flex flex-col h-full overflow-hidden">
          {/* UPPER SECTION (58% Height): CAPTURED PHOTO + iOS MEASURE AR OVERLAY */}
          <div className="relative w-full h-[58vh] bg-black overflow-hidden flex items-center justify-center">
            {/* Captured Photo Image */}
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured Building"
                className="w-full h-full object-cover opacity-90"
              />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500 text-xs">
                캡처된 이미지가 없습니다.
              </div>
            )}

            {/* iOS Measure Style AR Measurement Overlay (Image 2 style) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <svg viewBox="0 0 300 360" className="w-full h-full max-w-md">
                {/* 1. Ground level dashed line */}
                <line x1="30" y1={finalMarker1Y} x2="270" y2={finalMarker1Y} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />

                {/* 2. Eye height line (h) */}
                <line x1="50" y1="220" x2="50" y2={finalMarker1Y} stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />

                {/* 3. Horizontal distance line (d) */}
                <line x1="50" y1="220" x2={reticleX} y2="220" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
                <text x="100" y="212" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">
                  d={fmt(d, 1)}m
                </text>

                {/* 4. Sight line to Base (c1) */}
                <line x1="50" y1="220" x2={reticleX} y2={finalMarker1Y} stroke="#fbbf24" strokeWidth="2" />

                {/* 5. Sight line to Top (c2) */}
                <line x1="50" y1="220" x2={reticleX} y2={finalMarker2Y} stroke="#a78bfa" strokeWidth="2" />

                {/* 6. Solid Vertical Building White Measurement Line (P1 to P2) (Image 2 style) */}
                <line
                  x1={reticleX}
                  y1={finalMarker1Y}
                  x2={reticleX}
                  y2={finalMarker2Y}
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                />

                {/* Step 1 Base White Circle Pin */}
                <g transform={`translate(${reticleX}, ${finalMarker1Y})`}>
                  <circle r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
                </g>

                {/* Step 2 Top White Circle Pin */}
                <g transform={`translate(${reticleX}, ${finalMarker2Y})`}>
                  <circle r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
                </g>

                {/* White Attached Height Badge (Image 2 style) */}
                <g transform={`translate(${reticleX}, ${(finalMarker1Y + finalMarker2Y) / 2})`}>
                  <rect x="-42" y="-13" width="84" height="26" rx="13" fill="#ffffff" stroke="#000000" strokeWidth="1" className="shadow-xl" />
                  <text x="0" y="3" fill="#000000" fontSize="11" fontWeight="extrabold" textAnchor="middle">
                    {fmt(H, 2)}m
                  </text>
                </g>
              </svg>
            </div>
          </div>

          {/* LOWER SECTION (42% Height): SEPARATED RESULTS & DISTANCE CALIBRATION PANEL */}
          <div className="flex-1 w-full bg-slate-900 border-t-2 border-slate-800 p-4 pb-6 flex flex-col justify-between items-center shadow-2xl">
            {/* Distance d Fine-Calibration Control (Fixes 96m error) */}
            <div className="w-full max-w-md bg-slate-800/80 rounded-2xl p-3 border border-slate-700 flex items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[11px] font-bold text-sky-300 block">📐 수평 거리 (d) 보정</span>
                <span className="text-[10px] text-slate-400">실내/교실 실제 거리 맞춤</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalibratedDistance(prev => Math.max(0.8, Math.round(((prev || 3.0) - 0.2) * 10) / 10))}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-white text-base active:scale-95"
                >
                  -
                </button>
                <span className="text-sm font-extrabold text-sky-400 font-mono w-14 text-center">
                  {fmt(d, 1)}m
                </span>
                <button
                  onClick={() => setCalibratedDistance(prev => Math.min(15.0, Math.round(((prev || 3.0) + 0.2) * 10) / 10))}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-white text-base active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Separated Clean Result Cards */}
            <div className="w-full max-w-md grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800/90 p-2.5 rounded-2xl border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-semibold">수평 거리 (d)</span>
                <span className="text-sm sm:text-base font-black text-sky-400">{fmt(d, 2)}m</span>
              </div>
              <div className="bg-slate-800/90 p-2.5 rounded-2xl border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-semibold">상단 높이 (y)</span>
                <span className="text-sm sm:text-base font-black text-teal-400">{fmt(y, 2)}m</span>
              </div>
              <div className="bg-emerald-950/60 p-2.5 rounded-2xl border border-emerald-400/60">
                <span className="text-[10px] text-emerald-400 block font-bold">건물 높이 (H)</span>
                <span className="text-base sm:text-lg font-black text-emerald-300">{fmt(H, 2)}m</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full max-w-md mt-2">
              <button
                onClick={() => setShowSolutionModal(true)}
                className="flex-1 py-3 px-3 text-xs sm:text-sm font-bold text-purple-950 rounded-xl bg-purple-200 hover:bg-purple-100 shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                🔍 피타고라스 풀이 과정 보기
              </button>

              <button
                onClick={handleReset}
                className="py-3 px-4 text-xs sm:text-sm font-bold text-slate-300 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                🔄 다시 측정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP-BY-STEP MATH PROOF MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSolutionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100 relative">
            <button
              onClick={() => setShowSolutionModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-lg cursor-pointer"
            >
              ×
            </button>

            <div className="text-center mb-6">
              <span className="text-xs font-semibold text-purple-400 bg-purple-950 px-3 py-1 rounded-full border border-purple-800">
                수학 풀이 가이드
              </span>
              <h3 className="text-xl font-extrabold text-white mt-2">
                피타고라스 정리 & 삼각비 풀이 과정
              </h3>
            </div>

            {/* Step 1 */}
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 mb-3 space-y-1">
              <div className="text-xs font-bold text-sky-400">1단계: 수평 거리 (d) 산출</div>
              <p className="text-xs text-slate-300">
                {`내려본 각도 θ₁ = ${theta1}°, 눈높이 h = ${fmt(eyeHeight, 2)}m 이용`}
              </p>
              <div className="bg-slate-950 p-2.5 rounded-xl text-center font-mono text-sm text-sky-300 font-bold mt-2">
                {`d = h / tan(θ₁) = ${fmt(eyeHeight, 2)} / tan(${theta1}°) ≈ ${fmt(d, 2)}m`}
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 mb-3 space-y-1">
              <div className="text-xs font-bold text-teal-400">2단계: 상단 높이 (y) 산출</div>
              <p className="text-xs text-slate-300">
                {`올려본 각도 θ₂ = ${theta2}°, 수평 거리 d = ${fmt(d, 2)}m 이용`}
              </p>
              <div className="bg-slate-950 p-2.5 rounded-xl text-center font-mono text-sm text-teal-300 font-bold mt-2">
                {`y = d × tan(θ₂) = ${fmt(d, 2)} × tan(${theta2}°) ≈ ${fmt(y, 2)}m`}
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 mb-3 space-y-1">
              <div className="text-xs font-bold text-emerald-400">3단계: 전체 높이 (H) 합산</div>
              <div className="bg-slate-950 p-2.5 rounded-xl text-center font-mono text-base text-emerald-300 font-black mt-2">
                {`H = y + h = ${fmt(y, 2)} + ${fmt(eyeHeight, 2)} = ${fmt(H, 2)}m`}
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-purple-950/40 rounded-2xl p-4 border border-purple-500/40 mb-6 space-y-2">
              <div className="text-xs font-bold text-purple-300">
                📐 4단계: 피타고라스 정리 (c² = d² + h²) 시선 거리 검증
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="bg-slate-950 p-2 rounded-xl text-purple-200">
                  <span className="block text-[10px] text-slate-400">바닥 시선 거리 (c₁)</span>
                  {`c₁ = √(${fmt(d,2)}² + ${fmt(eyeHeight,2)}²) = ${fmt(c1, 2)}m`}
                </div>
                <div className="bg-slate-950 p-2 rounded-xl text-purple-200">
                  <span className="block text-[10px] text-slate-400">꼭대기 시선 거리 (c₂)</span>
                  {`c₂ = √(${fmt(d,2)}² + ${fmt(y,2)}²) = ${fmt(c2, 2)}m`}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSolutionModal(false)}
              className="w-full py-3.5 rounded-xl bg-purple-300 hover:bg-purple-200 text-purple-950 font-bold text-sm shadow-lg cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
