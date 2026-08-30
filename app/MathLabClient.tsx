"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Step = 'setup' | 'step1' | 'step2' | 'complete';

export default function MathLabClient() {
  // App States
  const [step, setStep] = useState<Step>('setup');
  const [eyeHeight, setEyeHeight] = useState<number>(1.50);
  
  // Real-time & Fixed Pitch Angles (Degrees, 0° = Horizon Level)
  const [currentPitch, setCurrentPitch] = useState<number>(0);
  const [fixedPitch1, setFixedPitch1] = useState<number | null>(null);
  const [fixedPitch2, setFixedPitch2] = useState<number | null>(null);
  
  // Angle Magnitudes for Math (in degrees)
  const [theta1, setTheta1] = useState<number | null>(null); // looking down angle (>0)
  const [theta2, setTheta2] = useState<number | null>(null); // looking up angle (>0)

  // Hardware Permissions & States
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [isSimulatorMode, setIsSimulatorMode] = useState<boolean>(false);
  const [simulatedPitch, setSimulatedPitch] = useState<number>(0);

  // UI Toggles
  const [showDiagram, setShowDiagram] = useState<boolean>(true);
  const [showSolutionModal, setShowSolutionModal] = useState<boolean>(false);

  // Media references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Effective active pitch angle (device sensor or simulator)
  const activePitch = isSimulatorMode ? simulatedPitch : currentPitch;

  // -------------------------------------------------------------
  // 1. Device Orientation Listener (iOS & Android Pitch Mapping)
  // -------------------------------------------------------------
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null) return;

      const b = e.beta; // -180 to 180
      const g = e.gamma || 0; // -90 to 90

      // When phone is in portrait mode:
      // Pitch relative to horizon (0° = vertical upright facing horizon)
      // Tilting UP towards sky: pitch > 0 (e.g. +30°)
      // Tilting DOWN towards ground: pitch < 0 (e.g. -30°)
      let pitch = 90 - b;

      // Adjust for device roll (gamma) if held at an angle
      if (Math.abs(g) > 45) {
        const radB = (b * Math.PI) / 180;
        const radG = (g * Math.PI) / 180;
        const pitchRad = Math.atan2(-Math.cos(radG) * Math.sin(radB), Math.cos(radB));
        pitch = (pitchRad * 180) / Math.PI - 90;
      }

      // Clamp pitch to [-89, 89] to prevent tangent infinity
      pitch = Math.max(-89, Math.min(89, pitch));
      setCurrentPitch(Math.round(pitch * 10) / 10);
      setSensorActive(true);
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

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // -------------------------------------------------------------
  // 2. Hardware Permission Requests (Camera & Motion Sensors)
  // -------------------------------------------------------------
  const requestPermissionsAndStart = async () => {
    setCameraError(null);

    // A. Camera Access
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

    // B. iOS DeviceOrientation Permission Request
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setSensorActive(true);
        } else {
          setIsSimulatorMode(true);
        }
      } catch (err) {
        console.warn("Motion permission error:", err);
        setIsSimulatorMode(true);
      }
    }

    // Proceed to Step 1
    setStep('step1');
  };

  // -------------------------------------------------------------
  // 3. Step Handlers & Math Computation
  // -------------------------------------------------------------
  const handleStep1Lock = () => {
    // Pitch looking down at base (should be negative or zero)
    const pitch = activePitch;
    const absAngle = Math.max(1, Math.abs(pitch)); // min 1 degree to avoid div by zero
    setFixedPitch1(pitch);
    setTheta1(absAngle);
    setStep('step2');
  };

  const handleStep2Lock = () => {
    // Pitch looking up at top (should be positive or zero)
    const pitch = activePitch;
    const absAngle = Math.max(1, Math.abs(pitch));
    setFixedPitch2(pitch);
    setTheta2(absAngle);
    setStep('complete');
  };

  const handleReset = () => {
    setStep('setup');
    setFixedPitch1(null);
    setFixedPitch2(null);
    setTheta1(null);
    setTheta2(null);
    setShowSolutionModal(false);
  };

  // -------------------------------------------------------------
  // 4. Mathematical Calculations (Trigonometry & Pythagoras)
  // -------------------------------------------------------------
  const t1Rad = (theta1 || 1) * (Math.PI / 180);
  const t2Rad = (theta2 || 1) * (Math.PI / 180);

  // Horizontal distance: d = h / tan(theta1)
  const d = eyeHeight / Math.tan(t1Rad);

  // Upper height from eye level: y = d * tan(theta2)
  const y = d * Math.tan(t2Rad);

  // Total building height: H = y + h
  const H = y + eyeHeight;

  // Hypotenuses via Pythagoras Theorem (c1 = sqrt(d^2 + h^2), c2 = sqrt(d^2 + y^2))
  const c1 = Math.sqrt(d * d + eyeHeight * eyeHeight); // Sight line to base
  const c2 = Math.sqrt(d * d + y * y); // Sight line to top

  // Helpers for formatting numbers
  const fmt = (num: number, dec = 2) => num.toFixed(dec);

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* ------------------------------------------------------------- */}
      {/* CAMERA VIDEO STREAM BACKGROUND */}
      {/* ------------------------------------------------------------- */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          cameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Fallback Camera Background (Pastel Grid Theme when camera off) */}
      {!cameraActive && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>
          {cameraError && (
            <div className="z-10 bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs px-4 py-2.5 rounded-2xl max-w-sm mb-4">
              ⚠️ {cameraError}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER / BAR */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-30 w-full px-4 py-3 bg-slate-950/70 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between">
        <Link
          href="/previous"
          id="btn-previous-page"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm"
        >
          <span>←</span>
          <span>이전페이지 살펴보기</span>
        </Link>

        {/* Toggle Controls */}
        <div className="flex items-center gap-2">
          {step !== 'setup' && (
            <button
              onClick={() => setShowDiagram(!showDiagram)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm ${
                showDiagram
                  ? "bg-sky-400/20 text-sky-300 border-sky-400/50"
                  : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white"
              }`}
            >
              📐 다이어그램 {showDiagram ? "ON" : "OFF"}
            </button>
          )}

          <button
            onClick={() => setIsSimulatorMode(!isSimulatorMode)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              isSimulatorMode
                ? "bg-purple-500/30 text-purple-300 border-purple-400/50"
                : "bg-slate-800/80 text-slate-400 border-slate-700"
            }`}
          >
            🎮 {isSimulatorMode ? "테스트 모드" : "센서 모드"}
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* STEP 0: SETUP SCREEN (EYE HEIGHT & PERMISSION START) */}
      {/* ------------------------------------------------------------- */}
      {step === 'setup' && (
        <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
          {/* Title Header Card */}
          <div className="bg-slate-900/90 backdrop-blur-lg border border-slate-800 rounded-3xl p-6 shadow-2xl text-center w-full animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-400 text-xs font-bold mb-4">
              📐 중학교 2학년 수학 연계 AR 실측
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight">
              세원쌤의 <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">AR 높이 측정기</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              카메라와 각도 센서를 이용해 건물의 바닥과 꼭대기를 조준하면, <strong className="text-sky-300">피타고라스 정리와 삼각비</strong>로 높이를 정확히 연산합니다.
            </p>

            {/* Eye Height Setup Box */}
            <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 mb-6 text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                👤 관측자 눈높이 ($h$) 설정
              </label>

              <div className="flex items-center justify-between gap-3">
                {/* Stepper Down */}
                <button
                  type="button"
                  onClick={() => setEyeHeight(prev => Math.max(0.5, Math.round((prev - 0.05) * 100) / 100))}
                  className="w-12 h-12 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-white font-bold text-xl border border-slate-600 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  -
                </button>

                {/* Display & Number Input */}
                <div className="flex-1 text-center bg-slate-900/90 rounded-xl py-2 px-3 border border-slate-700">
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="2.5"
                    value={eyeHeight}
                    onChange={(e) => setEyeHeight(parseFloat(e.target.value) || 1.50)}
                    className="w-full text-center text-2xl font-black text-emerald-400 bg-transparent focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-bold block">미터 (m)</span>
                </div>

                {/* Stepper Up */}
                <button
                  type="button"
                  onClick={() => setEyeHeight(prev => Math.min(2.5, Math.round((prev + 0.05) * 100) / 100))}
                  className="w-12 h-12 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-white font-bold text-xl border border-slate-600 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={requestPermissionsAndStart}
              className="w-full py-4 text-base sm:text-lg font-bold text-slate-950 rounded-2xl bg-gradient-to-r from-teal-300 via-emerald-300 to-sky-300 hover:from-teal-200 hover:to-sky-200 shadow-lg shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
            >
              📷 카메라 및 센서 시작
            </button>
          </div>
        </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* AR OVERLAY & CROSSHAIR (STEPS 1 & 2) */}
      {/* ------------------------------------------------------------- */}
      {step !== 'setup' && (
        <div className="relative z-20 flex-1 flex flex-col justify-between pointer-events-none">
          {/* Vertical Guide Overlay Shading (Active in Step 2 for Straight Tilt) */}
          {step === 'step2' && (
            <>
              <div className="absolute inset-y-0 left-0 w-1/5 bg-black/40 backdrop-blur-[1px] border-r border-slate-500/30 transition-all pointer-events-none"></div>
              <div className="absolute inset-y-0 right-0 w-1/5 bg-black/40 backdrop-blur-[1px] border-l border-slate-500/30 transition-all pointer-events-none"></div>
            </>
          )}

          {/* Top Info Banner (Current Pitch & Angle Indicators) */}
          <div className="w-full pt-4 px-4 flex flex-col items-center pointer-events-auto">
            {/* Live Angle Indicator Box */}
            <div className="bg-slate-950/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-slate-700/80 shadow-xl flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {step === 'step1' ? "내려본 각도 (θ₁)" : step === 'step2' ? "올려본 각도 (θ₂)" : "측정 완료"}
              </span>
              <span className="text-2xl font-black text-amber-300 font-mono">
                {activePitch > 0 ? `+${activePitch}°` : `${activePitch}°`}
              </span>
            </div>

            {/* Instruction Guidance Text */}
            <div className="mt-2 bg-sky-950/80 border border-sky-500/40 px-4 py-1.5 rounded-full text-xs font-medium text-sky-200 animate-pulse shadow-md">
              {step === 'step1' && "📍 1단계: 건물 맨 바닥 지점을 십자선 중앙에 맞추세요."}
              {step === 'step2' && "⬆️ 2단계: 카메라를 흔들림 없이 위로 올려 꼭대기를 조준하세요."}
              {step === 'complete' && "🎉 측정 완료! 아래 피타고라스 계산 결과를 확인하세요."}
            </div>
          </div>

          {/* Center AR Crosshair Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Circular Reticle */}
            <div className="w-24 h-24 rounded-full border-2 border-emerald-400/80 flex items-center justify-center relative shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              {/* Horizontal Line */}
              <div className="absolute w-32 h-[1.5px] bg-emerald-400/90"></div>
              {/* Vertical Line */}
              <div className="absolute h-32 w-[1.5px] bg-emerald-400/90"></div>
              {/* Center Dot */}
              <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-md"></div>
            </div>

            {/* Step 1 Fixed Marker (shows frozen point when in Step 2) */}
            {fixedPitch1 !== null && step !== 'step1' && (
              <div className="absolute flex flex-col items-center pointer-events-none opacity-80" style={{ transform: 'translateY(60px)' }}>
                <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white animate-ping"></div>
                <span className="text-[10px] font-bold bg-rose-950 text-rose-200 px-2 py-0.5 rounded border border-rose-500/50 mt-1">
                  Step 1 바닥 고정점 ({fixedPitch1}°)
                </span>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* FEATURE A: MINI 2D GEOMETRY CANVAS OVERLAY */}
          {/* ------------------------------------------------------------- */}
          {showDiagram && (
            <div className="absolute top-20 right-4 w-44 h-44 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2 shadow-2xl pointer-events-auto transition-all animate-scale-up">
              <div className="text-[9px] font-bold text-sky-400 mb-1 flex justify-between items-center">
                <span>📐 미니 기하 다이어그램</span>
                <span>h={fmt(eyeHeight,1)}m</span>
              </div>

              <svg viewBox="0 0 200 200" className="w-full h-full">
                {/* Ground */}
                <line x1="20" y1="170" x2="180" y2="170" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
                {/* Building Wall */}
                <line x1="160" y1="170" x2="160" y2="30" stroke="#f87171" strokeWidth="4" />
                
                {/* Observer Eye Position */}
                <circle cx="40" cy="130" r="4" fill="#38bdf8" />
                <text x="35" y="120" fill="#38bdf8" fontSize="10" fontWeight="bold">눈</text>
                
                {/* Eye Height Line (h) */}
                <line x1="40" y1="130" x2="40" y2="170" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />

                {/* Sight line to base (c1) */}
                <line x1="40" y1="130" x2="160" y2="170" stroke="#fbbf24" strokeWidth="2" />

                {/* Sight line to top (c2) */}
                <line x1="40" y1="130" x2="160" y2="30" stroke="#a78bfa" strokeWidth="2" />

                {/* Distance d (horizontal) */}
                <line x1="40" y1="130" x2="160" y2="130" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Labels */}
                <text x="95" y="125" fill="#cbd5e1" fontSize="9" textAnchor="middle">d={step === 'complete' ? fmt(d, 1) + 'm' : '?'}</text>
                <text x="170" y="100" fill="#f87171" fontSize="10" fontWeight="bold">H={step === 'complete' ? fmt(H, 1) + 'm' : '?'}</text>
              </svg>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* DESKTOP SIMULATOR CONTROL (IF IN TEST MODE) */}
          {/* ------------------------------------------------------------- */}
          {isSimulatorMode && (
            <div className="w-full px-6 py-2 bg-purple-950/80 backdrop-blur-md border-t border-purple-500/40 flex flex-col items-center pointer-events-auto">
              <div className="flex justify-between w-full text-xs font-bold text-purple-200 mb-1">
                <span>🎮 각도 시뮬레이터 조절</span>
                <span>현재 각도: {simulatedPitch}°</span>
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

          {/* ------------------------------------------------------------- */}
          {/* BOTTOM CONTROL ACTIONS */}
          {/* ------------------------------------------------------------- */}
          <div className="w-full p-4 pb-8 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center gap-3 pointer-events-auto">
            {step === 'step1' && (
              <button
                onClick={handleStep1Lock}
                className="w-full max-w-xs py-4 text-base font-bold text-slate-950 rounded-2xl bg-gradient-to-r from-coral-300 via-amber-300 to-rose-300 hover:from-amber-200 hover:to-rose-200 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                style={{ backgroundImage: 'linear-gradient(to right, #fb7185, #f59e0b)' }}
              >
                📍 바닥 지점 고정 (Step 1)
              </button>
            )}

            {step === 'step2' && (
              <button
                onClick={handleStep2Lock}
                className="w-full max-w-xs py-4 text-base font-bold text-slate-950 rounded-2xl bg-gradient-to-r from-teal-300 to-emerald-400 hover:from-teal-200 hover:to-emerald-300 shadow-xl shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
              >
                🏢 꼭대기 지점 고정 (Step 2)
              </button>
            )}

            {step === 'complete' && (
              <div className="w-full max-w-md flex flex-col items-center gap-3 animate-fade-in-up">
                {/* Result Summary Cards */}
                <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-700 shadow-2xl text-center grid grid-cols-3 gap-2">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">수평 거리 (d)</span>
                    <span className="text-base font-black text-sky-400">{fmt(d, 2)}m</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">상단 높이 (y)</span>
                    <span className="text-base font-black text-teal-400">{fmt(y, 2)}m</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-emerald-500/50 bg-emerald-950/20">
                    <span className="text-[10px] text-emerald-400 block font-bold">전체 높이 (H)</span>
                    <span className="text-lg font-black text-emerald-300">{fmt(H, 2)}m</span>
                  </div>
                </div>

                {/* Solution Modal Trigger */}
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => setShowSolutionModal(true)}
                    className="flex-1 py-3 px-4 text-xs sm:text-sm font-bold text-purple-900 rounded-xl bg-purple-200 hover:bg-purple-100 shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    🔍 피타고라스 계산 과정 보기
                  </button>

                  <button
                    onClick={handleReset}
                    className="py-3 px-4 text-xs sm:text-sm font-bold text-slate-300 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all cursor-pointer"
                  >
                    🔄 다시 측정
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FEATURE B: STEP-BY-STEP PYTHAGORAS PROOF MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSolutionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowSolutionModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-lg cursor-pointer"
            >
              ×
            </button>

            {/* Modal Title */}
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-purple-400 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-800">
                수학 풀이 가이드
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                피타고라스 정리 & 삼각비 풀이 과정
              </h3>
            </div>

            {/* Step 1: Horizontal Distance */}
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 mb-4 space-y-1">
              <div className="text-xs font-bold text-sky-400">1단계: 관측자와 건물 사이 수평 거리 (d)</div>
              <p className="text-xs text-slate-300">
                내려본 각도 θ₁ = {theta1}°, 눈높이 h = {fmt(eyeHeight, 2)}m를 이용해 수평 거리 d를 역산합니다.
              </p>
              <div className="bg-slate-950 p-2.5 rounded-xl text-center font-mono text-sm text-sky-300 font-bold mt-2">
                {`d = h / tan(θ₁) = ${fmt(eyeHeight, 2)} / tan(${theta1}°) ≈ ${fmt(d, 2)}m`}
              </div>
            </div>

            {/* Step 2: Upper Height */}
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 mb-4 space-y-1">
              <div className="text-xs font-bold text-teal-400">2단계: 눈높이 기준 상단 높이 (y)</div>
              <p className="text-xs text-slate-300">
                올려본 각도 θ₂ = {theta2}°와 수평 거리 d = {fmt(d, 2)}m로 상단 높이 y를 산출합니다.
              </p>
              <div className="bg-slate-950 p-2.5 rounded-xl text-center font-mono text-sm text-teal-300 font-bold mt-2">
                {`y = d × tan(θ₂) = ${fmt(d, 2)} × tan(${theta2}°) ≈ ${fmt(y, 2)}m`}
              </div>
            </div>

            {/* Step 3: Total Height */}
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 mb-4 space-y-1">
              <div className="text-xs font-bold text-emerald-400">3단계: 건물 전체 높이 (H) 합산</div>
              <p className="text-xs text-slate-300">
                상단 높이 y에 관측자의 눈높이 h를 더하여 건물 전체 높이 H를 구합니다.
              </p>
              <div className="bg-slate-950 p-2.5 rounded-xl text-center font-mono text-base text-emerald-300 font-black mt-2">
                {`H = y + h = ${fmt(y, 2)} + ${fmt(eyeHeight, 2)} = ${fmt(H, 2)}m`}
              </div>
            </div>

            {/* Step 4: Pythagoras Theorem Hypotenuse Verification */}
            <div className="bg-purple-950/40 rounded-2xl p-4 border border-purple-500/40 mb-6 space-y-2">
              <div className="text-xs font-bold text-purple-300 flex items-center gap-1">
                <span>📐 4단계: 피타고라스 정리로 시선 거리 (빗변 c) 검증</span>
              </div>
              <p className="text-xs text-slate-300">
                직각삼각형의 두 변의 길이로 시선 거리(빗변 c₁, c₂)를 계산합니다 (c² = d² + h²).
              </p>

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

            {/* Close Button */}
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
