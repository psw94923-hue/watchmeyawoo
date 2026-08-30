"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Step = 'setup' | 'step1' | 'step2' | 'analysis';

export default function MathLabClient() {
  // App States
  const [step, setStep] = useState<Step>('setup');
  const [eyeHeight, setEyeHeight] = useState<number>(1.50);
  
  // Real-time Pitch Angle (0° = Horizon Level)
  const [currentPitch, setCurrentPitch] = useState<number>(0);
  const [fixedPitch1, setFixedPitch1] = useState<number | null>(null);
  const [fixedPitch2, setFixedPitch2] = useState<number | null>(null);
  
  const [theta1, setTheta1] = useState<number | null>(null); // looking down angle (>0)
  const [theta2, setTheta2] = useState<number | null>(null); // looking up angle (>0)

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

      // Calculate pitch relative to horizon (0° = vertical upright facing horizon)
      let pitch = 90 - b;

      // Adjust for device roll
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
  // 3. Step Actions
  // -------------------------------------------------------------
  const handleStep1Lock = () => {
    const pitch = currentPitch;
    const absAngle = Math.max(1, Math.abs(pitch));
    setFixedPitch1(pitch);
    setTheta1(absAngle);
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

  // iOS Measure App AR dynamic point offsets
  // Center reticle is at SVG coordinate (150, 180) in a 300x360 canvas
  const reticleX = 150;
  const reticleY = 180;

  // Position of Step 1 Base Marker relative to active tilt
  const pitchDiff1 = fixedPitch1 !== null ? (currentPitch - fixedPitch1) : 0;
  // As phone tilts UP (currentPitch increases), base marker moves DOWN the screen
  const marker1Y = Math.min(330, Math.max(50, reticleY + pitchDiff1 * 3.5));

  // Position of Step 1 Base Marker when frozen for Analysis
  const finalPitchDiff = (fixedPitch2 !== null && fixedPitch1 !== null) ? (fixedPitch2 - fixedPitch1) : 0;
  const finalMarker1Y = Math.min(330, Math.max(180, reticleY + finalPitchDiff * 3.5));
  const finalMarker2Y = 60; // Top marker position

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
        <Link
          href="/previous"
          id="btn-previous-page"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-lg active:scale-95"
        >
          <span>←</span>
          <span>이전페이지</span>
        </Link>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* STEP 0: SETUP SCREEN */}
      {/* ------------------------------------------------------------- */}
      {step === 'setup' && (
        <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl text-center w-full animate-fade-in-up">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-400 text-xs font-bold mb-4">
              📐 AR 간접 높이 측정기
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
              세원쌤의 <span className="text-teal-400">수학 실험실</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              아이폰 측정 앱 방식으로 건물 바닥과 꼭대기를 찍어 <strong className="text-slate-200">피타고라스 정리</strong>로 높이를 실측합니다.
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
      {/* PHASE 1: MEASUREMENT MODE (STEPS 1 & 2) - iOS MEASURE APP STYLE */}
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
              <span className="mt-1 text-[11px] font-medium text-amber-300 bg-slate-900/80 px-3 py-0.5 rounded-full border border-amber-500/30">
                ⬆️ 위로 올려 꼭대기에 맞추세요 (점선이 연결됩니다)
              </span>
            )}
          </div>

          {/* iOS MEASURE APP AR RETICLE & DYNAMIC EXTENDING DOTTED LINE */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg viewBox="0 0 300 360" className="w-full h-full">
              {/* Dynamic Dotted Line extending from Step 1 Base Marker up to Active Crosshair */}
              {step === 'step2' && fixedPitch1 !== null && (
                <>
                  <line
                    x1={reticleX}
                    y1={marker1Y}
                    x2={reticleX}
                    y2={reticleY}
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                  />
                  {/* Step 1 Base AR Pin Marker */}
                  <g transform={`translate(${reticleX}, ${marker1Y})`}>
                    <circle r="8" fill="#fb7185" stroke="#ffffff" strokeWidth="2.5" />
                    <circle r="16" fill="none" stroke="#fb7185" strokeWidth="1" className="animate-ping" />
                    <rect x="-40" y="12" width="80" height="20" rx="6" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                    <text x="0" y="25" fill="#e0e7ff" fontSize="9" fontWeight="bold" textAnchor="middle">
                      시작점 (바닥)
                    </text>
                  </g>
                </>
              )}

              {/* Center AR Crosshair Reticle (iOS Measure style dot & circle) */}
              {fixedPitch2 === null && (
                <g transform={`translate(${reticleX}, ${reticleY})`}>
                  <circle r="20" fill="none" stroke="#34d399" strokeWidth="2" />
                  <line x1="-28" y1="0" x2="28" y2="0" stroke="#34d399" strokeWidth="1.5" />
                  <line x1="0" y1="-28" x2="0" y2="28" stroke="#34d399" strokeWidth="1.5" />
                  <circle r="4" fill="#34d399" className="shadow-lg" />
                </g>
              )}

              {/* Step 2 Top Marker Pin when locked */}
              {fixedPitch2 !== null && (
                <g transform={`translate(${reticleX}, ${reticleY})`}>
                  <circle r="8" fill="#34d399" stroke="#ffffff" strokeWidth="2.5" />
                  <rect x="-40" y="-30" width="80" height="20" rx="6" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
                  <text x="0" y="-17" fill="#a7f3d0" fontSize="9" fontWeight="bold" textAnchor="middle">
                    도착점 (꼭대기)
                  </text>
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
      {/* PHASE 2: CAPTURED PHOTO ANALYSIS MODE (UPPER/LOWER SPLIT UI) */}
      {/* ------------------------------------------------------------- */}
      {step === 'analysis' && (
        <div className="relative z-20 flex-1 flex flex-col h-full overflow-hidden">
          {/* UPPER SECTION (60% Height): CAPTURED PHOTO + AR OVERLAY */}
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

            {/* iOS Measure Style AR Measurement Overlay & Geometry Triangle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <svg viewBox="0 0 300 360" className="w-full h-full max-w-md">
                {/* 1. Ground level dashed line */}
                <line x1="30" y1={finalMarker1Y} x2="270" y2={finalMarker1Y} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />

                {/* 2. Eye height line (h) */}
                <line x1="60" y1="220" x2="60" y2={finalMarker1Y} stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />

                {/* 3. Horizontal distance line (d) */}
                <line x1="60" y1="220" x2={reticleX} y2="220" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
                <text x="105" y="212" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">
                  d={fmt(d, 1)}m
                </text>

                {/* 4. Sight line to Base (c1) */}
                <line x1="60" y1="220" x2={reticleX} y2={finalMarker1Y} stroke="#fbbf24" strokeWidth="2" />
                <text x="100" y={finalMarker1Y - 10} fill="#fbbf24" fontSize="10" fontWeight="bold">
                  c₁={fmt(c1, 1)}m
                </text>

                {/* 5. Sight line to Top (c2) */}
                <line x1="60" y1="220" x2={reticleX} y2={finalMarker2Y} stroke="#a78bfa" strokeWidth="2" />
                <text x="100" y="130" fill="#a78bfa" fontSize="10" fontWeight="bold">
                  c₂={fmt(c2, 1)}m
                </text>

                {/* 6. Solid Vertical Building Measurement Line (P1 to P2) */}
                <line
                  x1={reticleX}
                  y1={finalMarker1Y}
                  x2={reticleX}
                  y2={finalMarker2Y}
                  stroke="#34d399"
                  strokeWidth="3.5"
                />

                {/* Step 1 Base Marker Pin */}
                <g transform={`translate(${reticleX}, ${finalMarker1Y})`}>
                  <circle r="7" fill="#fb7185" stroke="#ffffff" strokeWidth="2" />
                  <text x="-15" y="16" fill="#fb7185" fontSize="9" fontWeight="bold">바닥</text>
                </g>

                {/* Step 2 Top Marker Pin */}
                <g transform={`translate(${reticleX}, ${finalMarker2Y})`}>
                  <circle r="7" fill="#34d399" stroke="#ffffff" strokeWidth="2" />
                  <text x="-15" y="-10" fill="#34d399" fontSize="9" fontWeight="bold">꼭대기</text>
                </g>

                {/* Highlighted Building Height Badge attached right next to the measurement line */}
                <g transform={`translate(${reticleX + 12}, ${(finalMarker1Y + finalMarker2Y) / 2})`}>
                  <rect x="0" y="-14" width="115" height="28" rx="8" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" />
                  <text x="57" y="3" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
                    높이 H = {fmt(H, 2)}m
                  </text>
                </g>
              </svg>
            </div>
          </div>

          {/* LOWER SECTION (42% Height): SEPARATED RESULTS CONTAINER (NO OVERLAP) */}
          <div className="flex-1 w-full bg-slate-900 border-t-2 border-slate-800 p-4 pb-6 flex flex-col justify-between items-center shadow-2xl">
            {/* Title / Badge */}
            <div className="text-center mb-2">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider bg-teal-950/80 px-3 py-0.5 rounded-full border border-teal-800">
                실측 데이터 분석 결과
              </span>
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
            <div className="flex gap-2 w-full max-w-md mt-3">
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
