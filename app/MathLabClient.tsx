"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Step = 'setup' | 'step1' | 'step2' | 'analysis';

export default function MathLabClient() {
  // App States
  const [step, setStep] = useState<Step>('setup');
  const [eyeHeight, setEyeHeight] = useState<number>(1.50);
  
  // Angles in degrees
  const [currentPitch, setCurrentPitch] = useState<number>(0);
  const [fixedPitch1, setFixedPitch1] = useState<number | null>(null);
  const [fixedPitch2, setFixedPitch2] = useState<number | null>(null);
  
  const [theta1, setTheta1] = useState<number | null>(null); // looking down (>0)
  const [theta2, setTheta2] = useState<number | null>(null); // looking up (>0)

  // Hardware Permissions & States
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSimulatorMode, setIsSimulatorMode] = useState<boolean>(false);
  const [simulatedPitch, setSimulatedPitch] = useState<number>(0);

  // Captured Photo Frame Data URL
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Modal State
  const [showSolutionModal, setShowSolutionModal] = useState<boolean>(false);

  // Media references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const activePitch = isSimulatorMode ? simulatedPitch : currentPitch;

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

    if ('DeviceOrientationEvent' in window && !isSimulatorMode) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if ('DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [isSimulatorMode]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // -------------------------------------------------------------
  // 2. Hardware Permission & Camera Start
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
      setCameraError("카메라 접근 권한이 없거나 지원되지 않습니다. 실시간 센서/시뮬레이터 모드로 계속 진행합니다.");
      setCameraActive(false);
    }

    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        await (DeviceOrientationEvent as any).requestPermission();
      } catch (err) {
        setIsSimulatorMode(true);
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
  // 3. Step Handlers
  // -------------------------------------------------------------
  const handleStep1Lock = () => {
    const pitch = activePitch;
    const absAngle = Math.max(1, Math.abs(pitch));
    setFixedPitch1(pitch);
    setTheta1(absAngle);
    setStep('step2');
  };

  const handleStep2Lock = () => {
    const pitch = activePitch;
    const absAngle = Math.max(1, Math.abs(pitch));
    setFixedPitch2(pitch);
    setTheta2(absAngle);

    // Capture the current camera frame on Step 2 completion
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
    setCapturedImage(null);
    setShowSolutionModal(false);
  };

  // -------------------------------------------------------------
  // 4. Mathematical Computations
  // -------------------------------------------------------------
  const t1Rad = (theta1 || 1) * (Math.PI / 180);
  const t2Rad = (theta2 || 1) * (Math.PI / 180);

  const d = eyeHeight / Math.tan(t1Rad);
  const y = d * Math.tan(t2Rad);
  const H = y + eyeHeight;
  const c1 = Math.sqrt(d * d + eyeHeight * eyeHeight);
  const c2 = Math.sqrt(d * d + y * y);

  const fmt = (num: number, dec = 2) => num.toFixed(dec);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* ------------------------------------------------------------- */}
      {/* CAMERA VIDEO STREAM BACKGROUND (PHASE 1) */}
      {/* ------------------------------------------------------------- */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          step !== 'analysis' && cameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

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

      {/* CAPTURED PHOTO BACKGROUND (PHASE 2: ANALYSIS MODE) */}
      {step === 'analysis' && capturedImage && (
        <div className="absolute inset-0 bg-black">
          <img
            src={capturedImage}
            alt="Captured Building"
            className="w-full h-full object-cover opacity-80"
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MINIMAL HEADER (UNOBSTRUCTED VISION) */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-30 w-full p-4 flex items-center justify-between pointer-events-auto">
        <Link
          href="/previous"
          id="btn-previous-page"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/60 text-xs text-slate-200 hover:text-white transition-all shadow-md"
        >
          <span>←</span>
          <span>이전페이지</span>
        </Link>

        {/* Small simulator toggle if needed */}
        <button
          onClick={() => setIsSimulatorMode(!isSimulatorMode)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border transition-all ${
            isSimulatorMode
              ? "bg-purple-600/80 text-white border-purple-400"
              : "bg-slate-900/60 text-slate-300 border-slate-700/60"
          }`}
        >
          {isSimulatorMode ? "🎮 시뮬레이터 ON" : "⚙️ 센서 모드"}
        </button>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* STEP 0: SETUP SCREEN */}
      {/* ------------------------------------------------------------- */}
      {step === 'setup' && (
        <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl text-center w-full animate-fade-in-up">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-400 text-xs font-semibold mb-4">
              📐 AR 간접 높이 측정
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
              세원쌤의 <span className="text-teal-400">AR 높이 측정기</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              건물 바닥과 꼭대기를 순서대로 조준하여 각도를 측정한 후, <strong className="text-slate-200">피타고라스 정리</strong>로 간접 높이를 산출합니다.
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
      {/* PHASE 1: MEASUREMENT MODE (STEPS 1 & 2) - UNCLUTTERED VISION */}
      {/* ------------------------------------------------------------- */}
      {(step === 'step1' || step === 'step2') && (
        <div className="relative z-20 flex-1 flex flex-col justify-between pointer-events-none">
          {/* Subtle Top Angle Badge (Unobtrusive) */}
          <div className="w-full pt-2 flex flex-col items-center pointer-events-auto">
            <div className="bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700/80 text-xs font-semibold text-slate-200 shadow-lg flex items-center gap-2">
              <span className="text-slate-400">
                {step === 'step1' ? "📍 바닥 조준 (θ₁)" : "🏢 꼭대기 조준 (θ₂)"}
              </span>
              <span className="text-sm font-extrabold text-amber-300 font-mono">
                {activePitch > 0 ? `+${activePitch}°` : `${activePitch}°`}
              </span>
            </div>

            {step === 'step2' && fixedPitch2 === null && (
              <span className="mt-1 text-[11px] font-medium text-sky-300 bg-slate-900/70 px-3 py-0.5 rounded-full border border-sky-500/30">
                ⬆️ 수직으로 카메라는 위로 천천히 올리세요
              </span>
            )}
          </div>

          {/* Minimal AR Crosshair Center Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full border border-emerald-400/70 flex items-center justify-center relative">
              <div className="absolute w-28 h-[1px] bg-emerald-400/80"></div>
              <div className="absolute h-28 w-[1px] bg-emerald-400/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
            </div>

            {/* Step 1 Fixed Marker (Shown in Step 2) */}
            {fixedPitch1 !== null && (
              <div className="absolute flex flex-col items-center pointer-events-none opacity-80" style={{ transform: 'translateY(50px)' }}>
                <div className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white animate-ping"></div>
                <span className="text-[10px] font-bold bg-rose-950/90 text-rose-200 px-2 py-0.5 rounded border border-rose-500/40 mt-1">
                  Step 1 고정 ({fixedPitch1}°)
                </span>
              </div>
            )}
          </div>

          {/* Simulator slider if toggled */}
          {isSimulatorMode && (
            <div className="w-full px-6 py-2 bg-purple-950/80 backdrop-blur-md border-t border-purple-500/40 flex flex-col items-center pointer-events-auto">
              <div className="flex justify-between w-full text-xs font-semibold text-purple-200 mb-1">
                <span>각도 수동 조절</span>
                <span>{simulatedPitch}°</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="1"
                value={simulatedPitch}
                onChange={(e) => setSimulatedPitch(parseInt(e.target.value))}
                className="w-full accent-purple-400 h-2 bg-purple-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div className="w-full p-6 pb-8 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col items-center pointer-events-auto">
            {step === 'step1' && (
              <button
                onClick={handleStep1Lock}
                className="w-full max-w-xs py-4 text-base font-bold text-slate-950 rounded-2xl bg-rose-300 hover:bg-rose-200 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                📍 바닥 지점 고정 (Step 1)
              </button>
            )}

            {step === 'step2' && fixedPitch2 === null && (
              <button
                onClick={handleStep2Lock}
                className="w-full max-w-xs py-4 text-base font-bold text-slate-950 rounded-2xl bg-amber-300 hover:bg-amber-200 shadow-lg active:scale-95 transition-all cursor-pointer"
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
                📸 캡처된 사진으로 피타고라스 분석하기 ➔
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PHASE 2: CAPTURED PHOTO ANALYSIS MODE */}
      {/* ------------------------------------------------------------- */}
      {step === 'analysis' && (
        <div className="relative z-20 flex-1 flex flex-col justify-between">
          {/* Top Title Banner */}
          <div className="w-full pt-2 px-4 flex justify-center">
            <div className="bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700 text-xs font-bold text-emerald-400 shadow-lg">
              📸 캡처 사진 기반 피타고라스 구조 분석
            </div>
          </div>

          {/* 2D Geometric SVG Overlay directly drawn over captured photo */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
            <svg viewBox="0 0 300 400" className="w-full h-full max-w-md max-h-[500px]">
              {/* Ground level */}
              <line x1="30" y1="340" x2="270" y2="340" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
              {/* Building Wall */}
              <line x1="230" y1="340" x2="230" y2="60" stroke="#f87171" strokeWidth="4" />
              
              {/* Observer Eye Position */}
              <circle cx="60" cy="270" r="5" fill="#38bdf8" />
              <text x="40" y="260" fill="#38bdf8" fontSize="11" fontWeight="bold">관측자(눈)</text>
              
              {/* Eye Height Line h */}
              <line x1="60" y1="270" x2="60" y2="340" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
              <text x="40" y="310" fill="#38bdf8" fontSize="10">h={fmt(eyeHeight,1)}m</text>

              {/* Sight line to base c1 */}
              <line x1="60" y1="270" x2="230" y2="340" stroke="#fbbf24" strokeWidth="2.5" />
              <text x="140" y="320" fill="#fbbf24" fontSize="10" fontWeight="bold">c₁={fmt(c1,1)}m</text>

              {/* Sight line to top c2 */}
              <line x1="60" y1="270" x2="230" y2="60" stroke="#a78bfa" strokeWidth="2.5" />
              <text x="130" y="150" fill="#a78bfa" fontSize="10" fontWeight="bold">c₂={fmt(c2,1)}m</text>

              {/* Distance d (horizontal) */}
              <line x1="60" y1="270" x2="230" y2="270" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
              <text x="140" y="260" fill="#cbd5e1" fontSize="11" textAnchor="middle">d={fmt(d,1)}m</text>

              {/* Upper height y & Total height H */}
              <text x="240" y="160" fill="#2dd4bf" fontSize="10">y={fmt(y,1)}m</text>
              <text x="240" y="200" fill="#f87171" fontSize="12" fontWeight="bold">H={fmt(H,1)}m</text>
            </svg>
          </div>

          {/* Bottom Results & Action Cards */}
          <div className="w-full p-4 pb-8 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/40 border-t border-slate-800/80 flex flex-col items-center gap-3">
            {/* Calculation Result Cards */}
            <div className="w-full max-w-md bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-2xl grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-semibold">수평 거리 (d)</span>
                <span className="text-sm sm:text-base font-extrabold text-sky-400">{fmt(d, 2)}m</span>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-semibold">상단 높이 (y)</span>
                <span className="text-sm sm:text-base font-extrabold text-teal-400">{fmt(y, 2)}m</span>
              </div>
              <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/50">
                <span className="text-[10px] text-emerald-400 block font-semibold">전체 높이 (H)</span>
                <span className="text-base sm:text-lg font-extrabold text-emerald-300">{fmt(H, 2)}m</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full max-w-md">
              <button
                onClick={() => setShowSolutionModal(true)}
                className="flex-1 py-3.5 px-4 text-xs sm:text-sm font-bold text-purple-950 rounded-xl bg-purple-200 hover:bg-purple-100 shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                🔍 피타고라스 풀이 과정 보기
              </button>

              <button
                onClick={handleReset}
                className="py-3.5 px-4 text-xs sm:text-sm font-bold text-slate-300 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all cursor-pointer"
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
              <div className="text-xs font-bold text-sky-400">1단계: 수평 거리 (d) 역산</div>
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
