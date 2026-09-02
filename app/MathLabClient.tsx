"use client";

import React, { useState, useEffect, useRef } from "react";
import CheeseCuttingApp from "./components/CheeseCuttingApp";
import CircumcenterApp from "./components/CircumcenterApp";
import ExteriorAngleApp from "./components/ExteriorAngleApp";

type Step = 'setup' | 'step1' | 'step2' | 'analysis';
type ActiveApp = 'hub' | 'cheese' | 'circumcenter' | 'exterior' | 'pythagoras';

export default function MathLabClient() {
  // Navigation & Sub-App State
  const [activeApp, setActiveApp] = useState<ActiveApp>('hub');

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
  // RENDER HUB: APP SELECTION HUB
  // -------------------------------------------------------------
  if (activeApp === 'hub') {
    return (
      <div className="min-h-screen w-full bg-amber-50/50 flex flex-col font-sans select-none relative overflow-x-hidden">
        {/* TOP HEADER */}
        <header className="bg-amber-100/90 backdrop-blur-md border-b border-amber-200 px-6 py-4 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧪</span>
            <span className="text-lg font-black text-amber-950 tracking-tight">
              세원쌤의 <span className="text-amber-600">수학 실험실</span>
            </span>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-200/60 px-3 py-1 rounded-full border border-amber-300">
            중학교 수학 탐구 웹앱
          </span>
        </header>

        {/* HERO CONTENT */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-7xl mx-auto w-full">
          <div className="text-center mb-8 sm:mb-10 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl font-black text-amber-950 tracking-tight">
              세원쌤의 <span className="text-amber-600">수학 실험실</span>
            </h1>
          </div>

          {/* MAIN APP SELECTION CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
            {/* CARD 1: CHEESE CUTTING APP */}
            <div
              onClick={() => setActiveApp('cheese')}
              className="group cursor-pointer bg-white rounded-3xl p-6 sm:p-7 border-2 border-amber-200 hover:border-amber-400 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full blur-2xl group-hover:bg-amber-200/60 transition-all pointer-events-none" />
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  🧀
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold mb-2">
                  중1 수학 • 다각형의 내각의 합
                </div>
                <h2 className="text-xl font-black text-amber-950 mb-2 group-hover:text-amber-600 transition-colors">
                  치즈 커팅 (다각형 자르기)
                </h2>
                <p className="text-xs sm:text-sm text-amber-800/80 leading-relaxed mb-6">
                  귀여운 칼로 치즈 다각형을 직접 분할해보며 (N-2)×180° 내각의 합 공식을 스스로 발견해보세요!
                </p>
              </div>

              <button className="w-full py-3.5 rounded-2xl bg-amber-500 text-white font-extrabold text-sm shadow-md group-hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2">
                <span>치즈 커팅 시작하기</span>
                <span>➔</span>
              </button>
            </div>

            {/* CARD 2: CIRCUMCENTER MINI GAME APP */}
            <div
              onClick={() => setActiveApp('circumcenter')}
              className="group cursor-pointer bg-slate-900 rounded-3xl p-6 sm:p-7 border-2 border-indigo-500/40 hover:border-yellow-400 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden text-slate-100"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/30 rounded-full blur-2xl group-hover:bg-indigo-500/50 transition-all pointer-events-none" />
              <div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  🌌
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-500/40 text-yellow-300 text-[11px] font-bold mb-2">
                  중2 수학 • 삼각형의 외심
                </div>
                <h2 className="text-xl font-black text-white mb-2 group-hover:text-yellow-400 transition-colors">
                  외심 탐사선 (항성 찾기)
                </h2>
                <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed mb-6">
                  밤하늘의 세 별로부터 같은 거리에 있는 항성(외심)을 감으로 맞춰보고 실시간 랭킹에 도전하세요!
                </p>
              </div>

              <button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-extrabold text-sm shadow-md hover:from-yellow-300 hover:to-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2">
                <span>외심 탐사선 시작하기</span>
                <span>➔</span>
              </button>
            </div>

            {/* CARD 3: POLYGON EXTERIOR ANGLE EXPLORATION APP */}
            <div
              onClick={() => setActiveApp('exterior')}
              className="group cursor-pointer bg-white rounded-3xl p-6 sm:p-7 border-2 border-purple-200 hover:border-purple-400 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/50 rounded-full blur-2xl group-hover:bg-purple-200/60 transition-all pointer-events-none" />
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  📐
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold mb-2">
                  중1 수학 • 다각형의 외각의 합
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                  다각형 외각 탐구
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  다각형의 외각을 잘라 한 점으로 모아 외각의 총합이 항상 360도임을 직관적으로 확인해보세요!
                </p>
              </div>

              <button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-sm shadow-md group-hover:from-purple-500 group-hover:to-indigo-500 active:scale-95 transition-all flex items-center justify-center gap-2">
                <span>외각 탐구 시작하기</span>
                <span>➔</span>
              </button>
            </div>

            {/* CARD 4: PYTHAGORAS AR MEASUREMENT APP */}
            <div
              onClick={() => setActiveApp('pythagoras')}
              className="group cursor-pointer bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200 hover:border-teal-400 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-100/50 rounded-full blur-2xl group-hover:bg-teal-200/60 transition-all pointer-events-none" />
              <div>
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  📏
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold mb-2">
                  중2 수학 • 피타고라스 정리
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2 group-hover:text-teal-600 transition-colors">
                  피타고라스 측정하기
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  카메라와 자이로 센서로 건물 바닥과 꼭대기를 조준하고 삼각비와 피타고라스 정리로 높이를 구하세요!
                </p>
              </div>

              <button className="w-full py-3.5 rounded-2xl bg-slate-900 text-teal-300 font-extrabold text-sm shadow-md group-hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2">
                <span>피타고라스 측정하기</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        </main>
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
