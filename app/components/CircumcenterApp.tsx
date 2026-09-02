"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
interface Point {
  x: number;
  y: number;
}

interface ProblemData {
  circumcenter: Point;
  radius: number;
  stars: Point[]; // 3 star vertices
  spawnTime: number;
}

interface FeedbackState {
  type: "PERFECT" | "GREAT" | "GOOD" | "MISS";
  points: number;
  basePoints: number;
  multiplier: number;
  distance: number;
  ratio: number;
  clickPoint: Point;
  targetPoint: Point;
  radius: number;
  stars: Point[];
  startTime: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface RankingRecord {
  id?: number;
  created_at?: string;
  student_id_name: string;
  score: number;
}

const DEFAULT_RANKINGS: RankingRecord[] = [
  { student_id_name: "서해나", score: 1485, created_at: "2026-09-01T10:00:00.000Z" },
  { student_id_name: "김태섭", score: 1453, created_at: "2026-09-01T10:05:00.000Z" },
  { student_id_name: "오은중", score: 1453, created_at: "2026-09-01T10:10:00.000Z" },
];


interface CircumcenterAppProps {
  onBack: () => void;
}

// ----------------------------------------------------------------------
// Audio Synthesizer using Web Audio API
// ----------------------------------------------------------------------
class SoundEffect {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playScore(type: "PERFECT" | "GREAT" | "GOOD" | "MISS", combo: number) {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (type === "PERFECT") {
      const freqs = combo >= 3 ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
      freqs.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.05);
        gain.gain.setValueAtTime(0.2, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.45);
      });
    } else if (type === "GREAT") {
      [587.33, 880].forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.06);
        gain.gain.setValueAtTime(0.18, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.4);
      });
    } else if (type === "GOOD") {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  playGameEnd() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + idx * 0.1);
      gain.gain.setValueAtTime(0.15, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.55);
    });
  }
}

const soundManager = new SoundEffect();

// ----------------------------------------------------------------------
// Mathematical Algorithm: Generate Acute Triangle & Circumcircle
// ----------------------------------------------------------------------
function generateAcuteTriangleProblem(width: number, height: number): ProblemData {
  const safeW = Math.max(280, width);
  const safeH = Math.max(280, height);
  const minDim = Math.min(safeW, safeH);

  let R = minDim * (0.24 + Math.random() * 0.12);

  const padX = R + 40;
  const padY = R + 60;

  const minX = padX;
  const maxX = Math.max(minX + 10, safeW - padX);
  const minY = padY;
  const maxY = Math.max(minY + 10, safeH - padY);

  const x0 = minX + Math.random() * (maxX - minX);
  const y0 = minY + Math.random() * (maxY - minY);

  const baseAngle = Math.random() * Math.PI * 2;

  let gap1Deg = 70 + Math.random() * 65;
  let gap2Deg = 70 + Math.random() * 65;
  let gap3Deg = 360 - (gap1Deg + gap2Deg);

  let attempts = 0;
  while ((gap3Deg < 65 || gap3Deg > 145) && attempts < 100) {
    gap1Deg = 70 + Math.random() * 65;
    gap2Deg = 70 + Math.random() * 65;
    gap3Deg = 360 - (gap1Deg + gap2Deg);
    attempts++;
  }

  const a1 = baseAngle;
  const a2 = baseAngle + (gap1Deg * Math.PI) / 180;
  const a3 = baseAngle + ((gap1Deg + gap2Deg) * Math.PI) / 180;

  const stars: Point[] = [
    { x: x0 + R * Math.cos(a1), y: y0 + R * Math.sin(a1) },
    { x: x0 + R * Math.cos(a2), y: y0 + R * Math.sin(a2) },
    { x: x0 + R * Math.cos(a3), y: y0 + R * Math.sin(a3) },
  ];

  return {
    circumcenter: { x: x0, y: y0 },
    radius: R,
    stars,
    spawnTime: performance.now(),
  };
}

// ----------------------------------------------------------------------
// Main CircumcenterApp Component
// ----------------------------------------------------------------------
export default function CircumcenterApp({ onBack }: CircumcenterAppProps) {
  // Screen States: 'tutorial' | 'playing' | 'gameover' | 'leaderboard'
  const [screen, setScreen] = useState<"tutorial" | "playing" | "gameover" | "leaderboard">("tutorial");

  // Gameplay States
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(40);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [perfectCount, setPerfectCount] = useState<number>(0);
  const [greatCount, setGreatCount] = useState<number>(0);
  const [goodCount, setGoodCount] = useState<number>(0);
  const [missCount, setMissCount] = useState<number>(0);

  // Tutorial Popup State
  const [tutorialHasTried, setTutorialHasTried] = useState<boolean>(false);
  const [showTutorialPopup, setShowTutorialPopup] = useState<boolean>(false);

  // Leaderboard & Student Input
  const [studentIdName, setStudentIdName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [rankings, setRankings] = useState<RankingRecord[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Canvas & Game Loop Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const problemRef = useRef<ProblemData | null>(null);
  const feedbackRef = useRef<FeedbackState | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const starsBgRef = useRef<{ x: number; y: number; r: number; alpha: number; speed: number }[]>([]);

  const isTouchLockedRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Background Stars
  useEffect(() => {
    const stars: { x: number; y: number; r: number; alpha: number; speed: number }[] = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.8 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.02 + 0.005,
      });
    }
    starsBgRef.current = stars;
  }, []);

  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingRankings(true);
    let loadedRankings: RankingRecord[] = [];
    let isSupabaseLoaded = false;

    try {
      const { data, error } = await supabase
        .from("rankings")
        .select("*")
        .order("score", { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const filtered = data.filter((rk) => rk.student_id_name !== "테스트유저");
        const seenNames = new Set<string>();
        const unique: RankingRecord[] = [];
        for (const item of filtered) {
          if (!seenNames.has(item.student_id_name)) {
            seenNames.add(item.student_id_name);
            unique.push(item);
          }
        }
        loadedRankings = unique;
        isSupabaseLoaded = true;
      }
    } catch (err) {
      console.warn("Supabase fetch rankings error (using fallback):", err);
    }

    if (isSupabaseLoaded) {
      const seen = new Set(loadedRankings.map((r) => r.student_id_name));
      DEFAULT_RANKINGS.forEach((def) => {
        if (!seen.has(def.student_id_name)) {
          loadedRankings.push(def);
          seen.add(def.student_id_name);
        }
      });
      loadedRankings.sort((a, b) => b.score - a.score);
      setRankings(loadedRankings.slice(0, 10));
    } else {
      try {
        const rawLocal = localStorage.getItem("circumcenter_rankings");
        let local: RankingRecord[] = rawLocal ? JSON.parse(rawLocal) : [];
        local = local.filter((rk) => rk.student_id_name !== "테스트유저");
        const seenNames = new Set<string>();
        const uniqueLocal: RankingRecord[] = [];
        for (const item of local) {
          if (!seenNames.has(item.student_id_name)) {
            seenNames.add(item.student_id_name);
            uniqueLocal.push(item);
          }
        }
        DEFAULT_RANKINGS.forEach((def) => {
          if (!seenNames.has(def.student_id_name)) {
            uniqueLocal.push(def);
            seenNames.add(def.student_id_name);
          }
        });
        uniqueLocal.sort((a, b) => b.score - a.score);
        localStorage.setItem("circumcenter_rankings", JSON.stringify(uniqueLocal));
        setRankings(uniqueLocal.slice(0, 10));
      } catch (e) {
        setRankings(DEFAULT_RANKINGS.slice(0, 10));
      }
    }
    setIsLoadingRankings(false);
  }, []);

  // Spawn Next Problem
  const spawnProblem = useCallback((w?: number, h?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = w || (canvas.width / dpr);
    const height = h || (canvas.height / dpr);

    if (width <= 0 || height <= 0) return;

    problemRef.current = generateAcuteTriangleProblem(width, height);
    feedbackRef.current = null;
    isTouchLockedRef.current = false;
  }, []);

  // ResizeObserver for Reliable Canvas Dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;

        if (width > 50 && height > 50 && canvasRef.current) {
          const dpr = window.devicePixelRatio || 1;
          canvasRef.current.width = width * dpr;
          canvasRef.current.height = height * dpr;

          spawnProblem(width, height);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [screen, spawnProblem]);

  // Handle Practice Again Action (Generates NEW triangle)
  const handlePracticeAgain = () => {
    setShowTutorialPopup(false);
    setTutorialHasTried(false);
    feedbackRef.current = null;
    isTouchLockedRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      spawnProblem(canvas.width / dpr, canvas.height / dpr);
    }
  };

  // Start New Game
  const startGame = () => {
    setShowTutorialPopup(false);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(40);
    setTotalAttempts(0);
    setPerfectCount(0);
    setGreatCount(0);
    setGoodCount(0);
    setMissCount(0);
    setSubmitSuccess(false);
    setScreen("playing");
  };

  // Timer Tick Hook
  useEffect(() => {
    if (screen === "playing") {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            soundManager.playGameEnd();
            setScreen("gameover");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [screen]);

  // Submit Score to Supabase
  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const payload = {
      student_id_name: studentIdName.trim(),
      score,
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("rankings").insert([payload]);
      if (error) console.warn("Supabase insert error:", error);
    } catch (err) {
      console.warn("Supabase insert exception:", err);
    }

    try {
      const rawLocal = localStorage.getItem("circumcenter_rankings");
      let local: RankingRecord[] = rawLocal ? JSON.parse(rawLocal) : [...DEFAULT_RANKINGS];
      DEFAULT_RANKINGS.forEach((def) => {
        if (!local.some((item) => item.student_id_name === def.student_id_name && item.score === def.score)) {
          local.push(def);
        }
      });
      local.push(payload);
      local.sort((a, b) => b.score - a.score);
      localStorage.setItem("circumcenter_rankings", JSON.stringify(local));
    } catch (err) {
      console.error(err);
    }

    setIsSubmitting(false);
    setSubmitSuccess(true);
    fetchLeaderboard();
    setScreen("leaderboard");
  };

  // ----------------------------------------------------------------------
  // Canvas Rendering & Particle Animation Loop
  // ----------------------------------------------------------------------
  useEffect(() => {
    let running = true;

    const render = () => {
      if (!running) return;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const width = canvas.width / dpr;
          const height = canvas.height / dpr;

          if (width > 0 && height > 0) {
            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, width, height);

            // 1. Draw Dark Night Sky Gradient
            const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
            skyGrad.addColorStop(0, "#080c1a");
            skyGrad.addColorStop(0.5, "#0b122c");
            skyGrad.addColorStop(1, "#070a16");
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, width, height);

            // Nebula glow
            const nebulaGrad = ctx.createRadialGradient(
              width * 0.5,
              height * 0.4,
              20,
              width * 0.5,
              height * 0.4,
              width * 0.6
            );
            nebulaGrad.addColorStop(0, "rgba(99, 102, 241, 0.15)");
            nebulaGrad.addColorStop(0.6, "rgba(59, 130, 246, 0.05)");
            nebulaGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = nebulaGrad;
            ctx.fillRect(0, 0, width, height);

            // Twinkling Background Stars
            starsBgRef.current.forEach((st) => {
              st.alpha += st.speed;
              const currentAlpha = 0.3 + Math.abs(Math.sin(st.alpha)) * 0.7;
              ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
              ctx.beginPath();
              ctx.arc(st.x * width, st.y * height, st.r, 0, Math.PI * 2);
              ctx.fill();
            });

            const prob = problemRef.current;
            const fb = feedbackRef.current;

            if (prob) {
              const { circumcenter, radius, stars, spawnTime } = prob;

              // 2. Smooth Fade-In for Triangle Lines (Fades in over 0.8s)
              const elapsedSinceSpawn = (performance.now() - spawnTime) / 1000;
              const triangleLineOpacity = Math.min(0.45, (elapsedSinceSpawn / 0.8) * 0.45);

              if (triangleLineOpacity > 0) {
                ctx.strokeStyle = `rgba(147, 197, 253, ${triangleLineOpacity})`;
                ctx.lineWidth = 1.8;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(stars[0].x, stars[0].y);
                ctx.lineTo(stars[1].x, stars[1].y);
                ctx.lineTo(stars[2].x, stars[2].y);
                ctx.closePath();
                ctx.stroke();
                ctx.setLineDash([]);
              }

              // 3. Draw 3 Sparkling Star Vertices
              stars.forEach((st, idx) => {
                // Glow
                const starGlow = ctx.createRadialGradient(st.x, st.y, 2, st.x, st.y, 24);
                starGlow.addColorStop(0, "rgba(253, 224, 71, 0.8)");
                starGlow.addColorStop(0.5, "rgba(234, 179, 8, 0.3)");
                starGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
                ctx.fillStyle = starGlow;
                ctx.beginPath();
                ctx.arc(st.x, st.y, 24, 0, Math.PI * 2);
                ctx.fill();

                // 5-Point Star Core
                ctx.save();
                ctx.translate(st.x, st.y);
                ctx.fillStyle = "#fff";
                ctx.shadowColor = "#fde047";
                ctx.shadowBlur = 12;

                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                  const rot = (Math.PI / 5) * 2 * i - Math.PI / 2;
                  ctx.lineTo(Math.cos(rot) * 10, Math.sin(rot) * 10);
                  const innerRot = rot + Math.PI / 5;
                  ctx.lineTo(Math.cos(innerRot) * 4.5, Math.sin(innerRot) * 4.5);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Label A, B, C
                ctx.fillStyle = "#e2e8f0";
                ctx.font = "bold 13px sans-serif";
                ctx.textAlign = "center";
                const labelOffsetAngle = Math.atan2(st.y - circumcenter.y, st.x - circumcenter.x);
                const labelX = st.x + Math.cos(labelOffsetAngle) * 22;
                const labelY = st.y + Math.sin(labelOffsetAngle) * 22 + 4;
                ctx.fillText(String.fromCharCode(65 + idx), labelX, labelY);
              });

              // 4. FEEDBACK ANIMATION (Full drawing completed early in 0.42 seconds)
              if (fb) {
                const elapsed = (performance.now() - fb.startTime) / 1000;
                const drawProgress = Math.min(1.0, elapsed / 0.42);

                const rPerf = radius * 0.08;
                const rGreat = radius * 0.18;
                const rGood = radius * 0.32;

                // Target Rings
                ctx.strokeStyle = "rgba(251, 146, 60, 0.4)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(circumcenter.x, circumcenter.y, rGood, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = "rgba(250, 204, 21, 0.6)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(circumcenter.x, circumcenter.y, rGreat, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = "rgba(52, 211, 153, 0.8)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(circumcenter.x, circumcenter.y, rPerf, 0, Math.PI * 2);
                ctx.stroke();

                // Circumcircle Animation (Reaches 360 deg in 0.42s)
                ctx.save();
                ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
                ctx.lineWidth = 2.8;
                ctx.shadowColor = "#38bdf8";
                ctx.shadowBlur = 14;

                ctx.beginPath();
                ctx.arc(circumcenter.x, circumcenter.y, radius, 0, Math.PI * 2 * drawProgress);
                ctx.stroke();
                ctx.restore();

                // 3 Radial Lines connecting Circumcenter to 3 Star Vertices (Draws in sync)
                stars.forEach((st) => {
                  ctx.strokeStyle = "rgba(253, 224, 71, 0.7)";
                  ctx.lineWidth = 1.6;
                  ctx.setLineDash([4, 4]);
                  ctx.beginPath();
                  ctx.moveTo(circumcenter.x, circumcenter.y);
                  ctx.lineTo(
                    circumcenter.x + (st.x - circumcenter.x) * drawProgress,
                    circumcenter.y + (st.y - circumcenter.y) * drawProgress
                  );
                  ctx.stroke();
                  ctx.setLineDash([]);
                });

                // Circumcenter Sun Core
                ctx.save();
                ctx.translate(circumcenter.x, circumcenter.y);
                const coreGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
                coreGlow.addColorStop(0, "#fbbf24");
                coreGlow.addColorStop(0.6, "rgba(245, 158, 11, 0.5)");
                coreGlow.addColorStop(1, "rgba(0,0,0,0)");
                ctx.fillStyle = coreGlow;
                ctx.beginPath();
                ctx.arc(0, 0, 18, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Clicked Marker
                ctx.save();
                ctx.strokeStyle = fb.type === "MISS" ? "#ef4444" : "#38bdf8";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(fb.clickPoint.x, fb.clickPoint.y, 8 + Math.sin(drawProgress * Math.PI) * 4, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(fb.clickPoint.x - 12, fb.clickPoint.y);
                ctx.lineTo(fb.clickPoint.x + 12, fb.clickPoint.y);
                ctx.moveTo(fb.clickPoint.x, fb.clickPoint.y - 12);
                ctx.lineTo(fb.clickPoint.x, fb.clickPoint.y + 12);
                ctx.stroke();
                ctx.restore();

                // Score Text Popup
                ctx.save();
                const popY = fb.clickPoint.y - 25 - drawProgress * 35;
                const popAlpha = Math.max(0, 1 - drawProgress * 0.8);
                ctx.textAlign = "center";
                ctx.font = "black 22px sans-serif";

                let color = "#38bdf8";
                let txt = `${fb.type}! +${fb.points}`;
                if (fb.type === "PERFECT") color = "#34d399";
                if (fb.type === "GREAT") color = "#facc15";
                if (fb.type === "GOOD") color = "#fb923c";
                if (fb.type === "MISS") {
                  color = "#f87171";
                  txt = "MISS!";
                }

                if (fb.multiplier > 1.0 && fb.type !== "MISS") {
                  txt += ` (x${fb.multiplier})`;
                }

                ctx.fillStyle = color;
                ctx.globalAlpha = popAlpha;
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.fillText(txt, fb.clickPoint.x, popY);
                ctx.restore();
              }
            }

            // Particles
            particlesRef.current.forEach((p) => {
              p.x += p.vx;
              p.y += p.vy;
              p.alpha -= 0.025;
              p.life += 1;

              if (p.alpha > 0) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
              }
            });
            particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

            ctx.restore();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Handle Touch / Click on Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isTouchLockedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || !problemRef.current) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const { circumcenter, radius, stars } = problemRef.current;
    const dist = Math.sqrt((x - circumcenter.x) ** 2 + (y - circumcenter.y) ** 2);
    const ratio = dist / radius;

    let type: "PERFECT" | "GREAT" | "GOOD" | "MISS" = "MISS";
    let basePoints = 0;
    let newCombo = combo;

    if (ratio <= 0.08) {
      type = "PERFECT";
      basePoints = 50;
      newCombo = combo + 1;
    } else if (ratio <= 0.18) {
      type = "GREAT";
      basePoints = 30;
      newCombo = combo + 1;
    } else if (ratio <= 0.32) {
      type = "GOOD";
      basePoints = 15;
    } else {
      type = "MISS";
      basePoints = 0;
      newCombo = 0;
    }

    let multiplier = 1.0;
    if (newCombo >= 5) multiplier = 1.5;
    else if (newCombo >= 3) multiplier = 1.2;

    const awardedPoints = Math.round(basePoints * multiplier);
    soundManager.playScore(type, newCombo);

    // Tutorial Mode Handling
    if (screen === "tutorial") {
      setTutorialHasTried(true);
      feedbackRef.current = {
        type,
        points: awardedPoints,
        basePoints,
        multiplier,
        distance: dist,
        ratio,
        clickPoint: { x, y },
        targetPoint: circumcenter,
        radius,
        stars,
        startTime: performance.now(),
      };

      // Show Popup Modal after 1.3s so student can observe full circumcircle & radial lines!
      setTimeout(() => {
        setShowTutorialPopup(true);
      }, 1300);
      return;
    }

    // Playing Mode Handling
    isTouchLockedRef.current = true;
    setCombo(newCombo);
    if (newCombo > maxCombo) setMaxCombo(newCombo);
    setScore((prev) => prev + awardedPoints);
    setTotalAttempts((prev) => prev + 1);

    if (type === "PERFECT") setPerfectCount((prev) => prev + 1);
    if (type === "GREAT") setGreatCount((prev) => prev + 1);
    if (type === "GOOD") setGoodCount((prev) => prev + 1);
    if (type === "MISS") setMissCount((prev) => prev + 1);

    const particleColors =
      type === "PERFECT"
        ? ["#34d399", "#a7f3d0", "#fde047"]
        : type === "GREAT"
        ? ["#facc15", "#fde047", "#60a5fa"]
        : type === "GOOD"
        ? ["#fb923c", "#fde047"]
        : ["#ef4444", "#f87171"];

    for (let i = 0; i < 20; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 4 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: Math.random() * 3 + 1.5,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        alpha: 1.0,
        life: 0,
        maxLife: 30,
      });
    }

    feedbackRef.current = {
      type,
      points: awardedPoints,
      basePoints,
      multiplier,
      distance: dist,
      ratio,
      clickPoint: { x, y },
      targetPoint: circumcenter,
      radius,
      stars,
      startTime: performance.now(),
    };

    // Auto spawn next problem after 800ms (0.8s) so full circumcircle & radial lines stay fully visible!
    setTimeout(() => {
      if (screen === "playing") {
        const canvas = canvasRef.current;
        if (canvas) {
          const dpr = window.devicePixelRatio || 1;
          spawnProblem(canvas.width / dpr, canvas.height / dpr);
        }
      }
    }, 800);
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none relative overflow-hidden">
      {/* HEADER NAV BAR */}
      <header className="relative z-30 w-full px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-indigo-900/40 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-all active:scale-95 cursor-pointer"
          >
            <span>←</span>
            <span>메인으로</span>
          </button>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xl">🌌</span>
            <span className="text-sm font-black text-indigo-200 tracking-tight">
              외심 탐사선 <span className="text-yellow-400">밤하늘의 항성을 찾아라!</span>
            </span>
          </div>
        </div>
      </header>

      {/* FEVER TIME BANNER (No screen brightening, clean glowing banner) */}
      {screen === "playing" && timeLeft <= 10 && (
        <div className="absolute top-16 inset-x-0 z-30 flex justify-center pointer-events-none animate-bounce">
          <span className="bg-gradient-to-r from-red-600 via-amber-500 to-purple-600 text-white font-black text-sm sm:text-base px-6 py-1.5 rounded-full shadow-2xl tracking-widest border-2 border-yellow-300">
            🔥 FEVER TIME! 남은 시간 {timeLeft}초! 🔥
          </span>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* SCREEN 1: TUTORIAL / START SCREEN */}
      {/* ---------------------------------------------------------------------- */}
      {screen === "tutorial" && (
        <div className="flex-1 flex flex-col items-center justify-between p-4 relative z-20 max-w-4xl mx-auto w-full">
          <div className="text-center mt-1 mb-3 animate-fade-in">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-bold mb-2">
              중2 수학 • 삼각형의 외심 개념 형성 미니게임
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1.5">
              세 별로부터 <span className="text-yellow-400">같은 거리에 있는 항성(외심)</span>을 찾아라!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              💡 <span className="text-yellow-300 font-bold">외심의 성질:</span> 세 별(꼭짓점)을 지나는 원(외접원)의 중심이며, 세 별까지의 거리가 모두 같습니다.
            </p>
          </div>

          {/* Interactive Tutorial Canvas Preview */}
          <div
            ref={containerRef}
            className="w-full flex-1 min-h-[300px] max-h-[420px] rounded-3xl border-2 border-indigo-500/40 bg-slate-900/90 shadow-2xl relative overflow-hidden cursor-crosshair flex items-center justify-center"
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              onClick={handleCanvasClick}
              onTouchStart={handleCanvasClick}
            />

            {!tutorialHasTried && (
              <div className="absolute inset-x-4 bottom-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-yellow-400/40 text-center pointer-events-none animate-bounce shadow-xl">
                <span className="text-xs sm:text-sm font-bold text-yellow-300">
                  👉 화면 속 밤하늘을 터치해 외심 위치를 맞혀보세요! (연습 1회)
                </span>
              </div>
            )}
          </div>

          {/* Prominent Action Buttons (Big & Equal Sized Side-by-Side) */}
          <div className="w-full mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            <button
              onClick={startGame}
              className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-xl shadow-yellow-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🚀 게임 시작하기 (40초)</span>
              <span>➔</span>
            </button>

            <button
              onClick={() => {
                fetchLeaderboard();
                setScreen("leaderboard");
              }}
              className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg bg-indigo-900/90 hover:bg-indigo-800 border-2 border-indigo-500/50 text-yellow-300 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🏆 명예의 전당 보기</span>
            </button>
          </div>
        </div>
      )}

      {/* TUTORIAL PRACTICE COMPLETED POPUP MODAL */}
      {showTutorialPopup && screen === "tutorial" && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center relative text-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 flex items-center justify-center text-3xl mx-auto mb-4 font-black shadow-lg">
              🎉
            </div>
            <h2 className="text-2xl font-black text-white mb-2">연습 완료!</h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              외심 감각을 익혔나요? 이제 <span className="text-yellow-300 font-bold">40초 실전 타임어택</span>에 도전해 랭킹에 이름을 올려보세요!
            </p>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={startGame}
                className="w-full py-4 rounded-2xl font-black text-base sm:text-lg bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀 실전 게임 시작하기</span>
                <span>➔</span>
              </button>

              <button
                onClick={() => {
                  setShowTutorialPopup(false);
                  fetchLeaderboard();
                  setScreen("leaderboard");
                }}
                className="w-full py-4 rounded-2xl font-black text-base sm:text-lg bg-indigo-900/90 hover:bg-indigo-800 border-2 border-indigo-500/50 text-yellow-300 shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🏆 명예의 전당 보기</span>
              </button>

              <button
                onClick={handlePracticeAgain}
                className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs cursor-pointer border border-slate-700 active:scale-95 transition-all"
              >
                🔄 연습 더 하기 (새로운 삼각형 스폰)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* SCREEN 2: IN-GAME HUD & CANVAS */}
      {/* ---------------------------------------------------------------------- */}
      {screen === "playing" && (
        <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
          {/* Top HUD */}
          <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none max-w-4xl mx-auto">
            {/* Timer */}
            <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-indigo-500/40 shadow-xl flex items-center gap-2">
              <span className="text-lg">⏱️</span>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">남은 시간</span>
                <span className={`text-xl font-black font-mono ${timeLeft <= 10 ? "text-rose-400 animate-pulse" : "text-sky-300"}`}>
                  {timeLeft}초
                </span>
              </div>
            </div>

            {/* Combo Streak */}
            {combo >= 2 && (
              <div className="bg-gradient-to-r from-amber-500/30 to-red-500/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-400/60 shadow-xl flex items-center gap-2 animate-bounce">
                <span className="text-xl">🔥</span>
                <div>
                  <span className="text-[10px] text-amber-300 block font-bold">STREAK</span>
                  <span className="text-lg font-black text-yellow-300 font-mono">
                    {combo} Combo {combo >= 5 ? "(x1.5)" : combo >= 3 ? "(x1.2)" : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Score */}
            <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-indigo-500/40 shadow-xl flex items-center gap-2">
              <span className="text-lg">⭐</span>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold">현재 점수</span>
                <span className="text-xl font-black text-yellow-400 font-mono">{score}점</span>
              </div>
            </div>
          </div>

          {/* In-Game Canvas Container (Subtle Neon Border in Fever Time, No background brightening!) */}
          <div
            ref={containerRef}
            className={`w-full flex-1 relative cursor-crosshair transition-all duration-500 ${
              timeLeft <= 10
                ? "border-2 border-indigo-400 shadow-[inset_0_0_20px_rgba(129,140,248,0.35),0_0_20px_rgba(129,140,248,0.4)] animate-pulse"
                : ""
            }`}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              onClick={handleCanvasClick}
              onTouchStart={handleCanvasClick}
            />
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* SCREEN 3: GAME OVER & RANK REGISTRATION */}
      {/* ---------------------------------------------------------------------- */}
      {screen === "gameover" && (
        <div className="flex-1 flex items-center justify-center p-4 relative z-20">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fade-in text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-3xl mx-auto mb-4">
              🌌
            </div>
            <h2 className="text-2xl font-black text-white mb-1">탐사 완료!</h2>
            <p className="text-xs text-slate-400 mb-6">외심 위치 감각 탐사가 종료되었습니다.</p>

            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 mb-6 space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs text-slate-400 font-semibold">최종 획득 점수</span>
                <span className="text-2xl font-black text-yellow-400 font-mono">{score}점</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex justify-between">
                  <span className="text-emerald-400 font-bold">✨ PERFECT</span>
                  <span className="font-mono text-white font-bold">{perfectCount}회</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex justify-between">
                  <span className="text-yellow-400 font-bold">🌟 GREAT</span>
                  <span className="font-mono text-white font-bold">{greatCount}회</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex justify-between">
                  <span className="text-orange-400 font-bold">👍 GOOD</span>
                  <span className="font-mono text-white font-bold">{goodCount}회</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex justify-between">
                  <span className="text-amber-300 font-bold">🔥 최대 콤보</span>
                  <span className="font-mono text-yellow-300 font-bold">{maxCombo} Combo</span>
                </div>
              </div>
            </div>

            {!submitSuccess ? (
              <form onSubmit={handleSubmitScore} className="space-y-3">
                <div className="text-left">
                  <label className="block text-xs font-bold text-indigo-300 mb-1">
                    🏆 명예의 전당 랭킹 등록
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="학번과 이름 (예: 2130 박세원)"
                    value={studentIdName}
                    onChange={(e) => setStudentIdName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-indigo-500/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg hover:from-yellow-300 hover:to-amber-400 active:scale-95 transition-all cursor-pointer"
                  >
                    {isSubmitting ? "등록 중..." : "🚀 랭킹 등록하기"}
                  </button>

                  <button
                    type="button"
                    onClick={startGame}
                    className="py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 active:scale-95 transition-all cursor-pointer"
                  >
                    🔄 다시하기
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-xl">
                  ✅ 랭킹이 정상적으로 등록되었습니다!
                </div>
                <button
                  onClick={() => {
                    fetchLeaderboard();
                    setScreen("leaderboard");
                  }}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  🏆 명예의 전당 보기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* SCREEN 4: HALL OF FAME (LEADERBOARD) */}
      {/* ---------------------------------------------------------------------- */}
      {screen === "leaderboard" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-20 max-w-md mx-auto w-full">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-3xl p-6 w-full shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
            <div className="text-center mb-4">
              <span className="text-xs font-bold text-yellow-400 bg-yellow-950/80 px-3 py-1 rounded-full border border-yellow-500/40">
                실시간 랭킹 Top 10
              </span>
              <h2 className="text-2xl font-black text-white mt-2">🏆 명예의 전당</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4">
              {isLoadingRankings ? (
                <div className="text-center py-8 text-slate-400 text-xs">랭킹 데이터를 불러오는 중...</div>
              ) : rankings.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">아직 등록된 랭킹 기록이 없습니다. 첫 번째 주인공이 되어보세요!</div>
              ) : (
                rankings.map((rk, idx) => {
                  let trophy = `${idx + 1}위`;
                  let rankBg = "bg-slate-950/60 border-slate-800 text-slate-300";
                  let scoreColor = "text-slate-200";

                  if (idx === 0) {
                    trophy = "🥇 1위";
                    rankBg = "bg-gradient-to-r from-amber-950/80 to-yellow-950/80 border-amber-500/60 text-yellow-300 font-bold";
                    scoreColor = "text-yellow-400 font-black";
                  } else if (idx === 1) {
                    trophy = "🥈 2위";
                    rankBg = "bg-slate-900/90 border-slate-400/40 text-slate-200";
                    scoreColor = "text-slate-100 font-bold";
                  } else if (idx === 2) {
                    trophy = "🥉 3위";
                    rankBg = "bg-slate-900/90 border-amber-800/40 text-amber-200";
                    scoreColor = "text-amber-300 font-bold";
                  }

                  return (
                    <div
                      key={rk.id || idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between text-xs sm:text-sm ${rankBg}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-extrabold w-12 text-center">{trophy}</span>
                        <span className="font-bold text-white">{rk.student_id_name}</span>
                      </div>
                      <span className={`font-mono text-base ${scoreColor}`}>{rk.score}점</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={startGame}
                className="py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md hover:from-yellow-300 hover:to-amber-400 active:scale-95 transition-all cursor-pointer"
              >
                🚀 다시 도전하기
              </button>
              <button
                onClick={() => setScreen("tutorial")}
                className="py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm border border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                🏠 시작 화면
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
