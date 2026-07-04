"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// --- 데이터 구조 정의 ---
interface Equation {
  text: string;
  answer: number;
  score: number;
}

interface Worm {
  id: string;
  segments: { x: number; y: number }[]; // 0번 인덱스가 머리
  equation: Equation;
  color: string;
  isDragging: boolean;
  score: number;
}

interface Hole {
  id: string;
  x: number;
  y: number;
  value: number;
}

interface ScoreRecord {
  id?: number;
  created_at?: string;
  class_name: number;
  number: number;
  nickname: string;
  score: number;
}

// --- 상수 정의 ---
const GRID_COLS = 20;
const GRID_ROWS = 15;
const CELL_SIZE = 40; // 20 * 40 = 800px, 15 * 40 = 600px
const MAX_WORMS = 12; // 게임 오버 한계치

// --- 헬퍼 함수: 레트로 효과음 ---
function playSound(type: "correct" | "wrong" | "gameover" | "spawn" | "click") {
  if (typeof window === "undefined") return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  try {
    const ctx = new AudioContext();
    if (type === "correct") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "wrong") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "spawn") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === "gameover") {
      const freqs = [350, 300, 250, 200];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.1);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.12);
      });
    }
  } catch (e) {
    console.error("Audio error", e);
  }
}

// --- 헬퍼 함수: 방정식 랜덤 생성 ---
function generateEquation(score: number): Equation {
  let text = "";
  let answer = 0;

  if (score === 10) {
    const a = Math.floor(Math.random() * 8) + 2;
    const ans = Math.floor(Math.random() * 7) + 1;
    const op = Math.random() > 0.5 ? "+" : "-";
    if (op === "+") {
      text = `x + ${a} = ${ans + a}`;
      answer = ans;
    } else {
      text = `x - ${a} = ${ans}`;
      answer = ans + a;
    }
  } else if (score === 20) {
    const a = Math.floor(Math.random() * 3) + 2;
    const ans = Math.floor(Math.random() * 6) + 1;
    const b = Math.floor(Math.random() * 5) + 1;
    const c = a * ans - b;
    text = `${a}x - ${b} = ${c}`;
    answer = ans;
  } else if (score === 40) {
    const a = Math.floor(Math.random() * 3) + 3;
    const c = Math.floor(Math.random() * 2) + 1;
    const ans = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 6) + 1;
    const d = (a - c) * ans + b;
    text = `${a}x + ${b} = ${c}x + ${d}`;
    answer = ans;
  } else {
    const isFraction = Math.random() > 0.5;
    if (isFraction) {
      const a = Math.random() > 0.5 ? 2 : 3;
      const ansMultiplier = Math.floor(Math.random() * 4) + 1;
      const ans = a * ansMultiplier;
      const b = Math.floor(Math.random() * 4) + 1;
      const c = (ans / a) + b;
      text = `x/${a} + ${b} = ${c}`;
      answer = ans;
    } else {
      const a = Math.random() > 0.5 ? 2 : 3;
      const ans = Math.floor(Math.random() * 5) + 3;
      const b = Math.floor(Math.random() * 2) + 1;
      const c = a * (ans - b);
      text = `${a}(x - ${b}) = ${c}`;
      answer = ans;
    }
  }

  return { text, answer, score };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export default function MathWormGame() {
  const [gameState, setGameState] = useState<"LOBBY" | "TUTORIAL" | "PLAYING" | "GAMEOVER">("LOBBY");
  
  const [className, setClassName] = useState<number>(1);
  const [studentNumber, setStudentNumber] = useState<number>(1);
  const [nickname, setNickname] = useState<string>("");

  const [score, setScore] = useState<number>(0);
  const [playTime, setPlayTime] = useState<number>(0);
  const [worms, setWorms] = useState<Worm[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  
  const [rankingList, setRankingList] = useState<ScoreRecord[]>([]);
  const [rankTab, setRankTab] = useState<"ALL" | "CLASS">("ALL");
  const [isSubmittingScore, setIsSubmittingScore] = useState<boolean>(false);

  const [draggingWormId, setDraggingWormId] = useState<string | null>(null);
  const [dragPointerPos, setDragPointerPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [tutorialWorm, setTutorialWorm] = useState<Worm | null>(null);
  const [tutorialHole, setTutorialHole] = useState<Hole | null>(null);

  const timeIntervalRef = useRef<any>(null);
  const spawnerTimerRef = useRef<any>(null);

  useEffect(() => {
    if (gameState === "TUTORIAL") {
      setTutorialStep(0);
      setTutorialWorm({
        id: "tutorial-worm",
        segments: [
          { x: 5, y: 7 },
          { x: 4, y: 7 },
          { x: 3, y: 7 },
        ],
        equation: { text: "3x - 6 = 0", answer: 2, score: 20 },
        color: "#3b82f6",
        isDragging: false,
        score: 20
      });
      setTutorialHole({
        id: "tutorial-hole",
        x: 14,
        y: 7,
        value: 2,
      });
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "PLAYING") {
      playSound("spawn");
      setScore(0);
      setPlayTime(0);
      setWorms([]);
      setHoles([]);

      const initialWorms: Worm[] = [];
      const initialHoles: Hole[] = [];

      const targetAnswers = [2, 3, 5];
      targetAnswers.forEach((ans, i) => {
        initialHoles.push({
          id: `hole-${i}`,
          x: 4 + i * 5,
          y: 3 + (i % 2) * 8,
          value: ans,
        });
      });

      const scores = [10, 20];
      scores.forEach((sc, i) => {
        const eq = generateEquation(sc);
        initialHoles[i].value = eq.answer; 

        initialWorms.push({
          id: `worm-${Date.now()}-${i}`,
          segments: [
            { x: 3, y: 5 + i * 4 },
            { x: 2, y: 5 + i * 4 },
            { x: 1, y: 5 + i * 4 },
          ],
          equation: eq,
          color: sc === 10 ? "#10b981" : "#3b82f6",
          isDragging: false,
          score: sc,
        });
      });

      setWorms(initialWorms);
      setHoles(initialHoles);

      timeIntervalRef.current = setInterval(() => {
        setPlayTime((prev) => prev + 1);
      }, 1000);

      const spawnNext = () => {
        setWorms((prevWorms) => {
          if (prevWorms.length >= MAX_WORMS) return prevWorms;

          let currentPlayTime = 0;
          setPlayTime((t) => { currentPlayTime = t; return t; });

          let scoreTier = 10;
          const rand = Math.random();
          if (currentPlayTime < 30) {
            scoreTier = rand < 0.7 ? 10 : 20;
          } else if (currentPlayTime < 60) {
            scoreTier = rand < 0.4 ? 10 : rand < 0.8 ? 20 : 40;
          } else {
            scoreTier = rand < 0.2 ? 10 : rand < 0.5 ? 20 : rand < 0.85 ? 40 : 50;
          }

          const eq = generateEquation(scoreTier);

          let spawnX = 0;
          let spawnY = 0;
          let isBlocked = true;
          let attempts = 0;

          while (isBlocked && attempts < 50) {
            spawnX = Math.floor(Math.random() * (GRID_COLS - 6)) + 2;
            spawnY = Math.floor(Math.random() * (GRID_ROWS - 4)) + 2;
            
            isBlocked = prevWorms.some(w => w.segments.some(s => Math.abs(s.x - spawnX) < 3 && Math.abs(s.y - spawnY) < 3));
            attempts++;
          }

          const wormLength = Math.floor(Math.random() * 3) + 3;
          const spawnSegments = [];
          for (let j = 0; j < wormLength; j++) {
            spawnSegments.push({ x: spawnX - j, y: spawnY });
          }

          const colors: Record<number, string> = {
            10: "#10b981",
            20: "#3b82f6",
            40: "#8b5cf6",
            50: "rainbow",
          };

          const newWorm: Worm = {
            id: `worm-${Date.now()}-${Math.random()}`,
            segments: spawnSegments,
            equation: eq,
            color: colors[scoreTier],
            isDragging: false,
            score: scoreTier,
          };

          playSound("spawn");

          setHoles((prevHoles) => {
            const hasMatchingHole = prevHoles.some((h) => h.value === eq.answer);
            if (!hasMatchingHole) {
              let hX = 0, hY = 0;
              let hBlocked = true;
              let hAttempts = 0;
              
              while (hBlocked && hAttempts < 50) {
                hX = Math.floor(Math.random() * (GRID_COLS - 2)) + 1;
                hY = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
                hBlocked = prevHoles.some(h => Math.abs(h.x - hX) < 3 && Math.abs(h.y - hY) < 3) || (Math.abs(hX - spawnX) < 3 && Math.abs(hY - spawnY) < 3);
                hAttempts++;
              }

              return [
                ...prevHoles,
                {
                  id: `hole-${Date.now()}-${Math.random()}`,
                  x: hX,
                  y: hY,
                  value: eq.answer,
                },
              ];
            }
            return prevHoles;
          });

          return [...prevWorms, newWorm];
        });

        let currentPlayTime = 0;
        setPlayTime((t) => { currentPlayTime = t; return t; });
        
        const delay = Math.max(1500, 7000 - currentPlayTime * 100);
        spawnerTimerRef.current = setTimeout(spawnNext, delay);
      };

      spawnerTimerRef.current = setTimeout(spawnNext, 5000);

      return () => {
        if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
        if (spawnerTimerRef.current) clearTimeout(spawnerTimerRef.current);
      };
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "PLAYING" && worms.length >= MAX_WORMS) {
      playSound("gameover");
      setGameState("GAMEOVER");
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      if (spawnerTimerRef.current) clearTimeout(spawnerTimerRef.current);
      
      submitScore();
    }
  }, [worms, gameState]);

  const getSVGCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    
    const clientX = e.clientX;
    const clientY = e.clientY;

    const x = ((clientX - rect.left) / rect.width) * 800;
    const y = ((clientY - rect.top) / rect.height) * 600;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const coords = getSVGCoords(e);
    if (!coords) return;

    if (gameState === "TUTORIAL") {
      if (!tutorialWorm) return;
      const head = tutorialWorm.segments[0];
      const headPixel = { x: head.x * CELL_SIZE + CELL_SIZE / 2, y: head.y * CELL_SIZE + CELL_SIZE / 2 };
      const dist = Math.hypot(coords.x - headPixel.x, coords.y - headPixel.y);
      if (dist < 40) {
        playSound("click");
        setTutorialWorm({ ...tutorialWorm, isDragging: true });
        setDraggingWormId("tutorial-worm");
        setDragPointerPos(coords);
      }
    } else if (gameState === "PLAYING") {
      let foundWorm: Worm | null = null;
      
      for (const worm of worms) {
        const head = worm.segments[0];
        const headPixel = { x: head.x * CELL_SIZE + CELL_SIZE / 2, y: head.y * CELL_SIZE + CELL_SIZE / 2 };
        const dist = Math.hypot(coords.x - headPixel.x, coords.y - headPixel.y);
        
        if (dist < 45) {
          foundWorm = worm;
          break;
        }
      }

      if (foundWorm) {
        playSound("click");
        const wormId = foundWorm.id;
        setDraggingWormId(wormId);
        setDragPointerPos(coords);
        setWorms((prev) =>
          prev.map((w) => (w.id === wormId ? { ...w, isDragging: true } : w))
        );
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingWormId) return;
    e.preventDefault();
    const coords = getSVGCoords(e);
    if (!coords) return;

    setDragPointerPos(coords);

    const gridX = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(coords.x / CELL_SIZE)));
    const gridY = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(coords.y / CELL_SIZE)));

    if (gameState === "TUTORIAL" && tutorialWorm) {
      const newSegments = [...tutorialWorm.segments];
      const prevHead = newSegments[0];
      
      if (prevHead.x !== gridX || prevHead.y !== gridY) {
        const updatedSegs = [{ x: gridX, y: gridY }];
        for (let i = 0; i < newSegments.length - 1; i++) {
          updatedSegs.push(newSegments[i]);
        }
        setTutorialWorm({
          ...tutorialWorm,
          segments: updatedSegs,
        });
      }
    } else if (gameState === "PLAYING") {
      setWorms((prevWorms) =>
        prevWorms.map((w) => {
          if (w.id !== draggingWormId) return w;
          const newSegments = [...w.segments];
          const prevHead = newSegments[0];

          if (prevHead.x !== gridX || prevHead.y !== gridY) {
            const updatedSegs = [{ x: gridX, y: gridY }];
            for (let i = 0; i < newSegments.length - 1; i++) {
              updatedSegs.push(newSegments[i]);
            }
            return {
              ...w,
              segments: updatedSegs,
            };
          }
          return w;
        })
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (!draggingWormId) return;

    if (gameState === "TUTORIAL" && tutorialWorm && tutorialHole) {
      const head = tutorialWorm.segments[0];
      const hole = tutorialHole;
      
      const headPixel = { x: head.x * CELL_SIZE + CELL_SIZE / 2, y: head.y * CELL_SIZE + CELL_SIZE / 2 };
      const holePixel = { x: hole.x * CELL_SIZE + CELL_SIZE / 2, y: hole.y * CELL_SIZE + CELL_SIZE / 2 };
      const dist = Math.hypot(headPixel.x - holePixel.x, headPixel.y - holePixel.y);

      if (dist < 55) {
        if (hole.value === tutorialWorm.equation.answer) {
          playSound("correct");
          setTutorialStep(1);
          setTutorialWorm({
            ...tutorialWorm,
            isDragging: false,
            segments: tutorialWorm.segments.map(() => ({ x: hole.x, y: hole.y })),
          });
        } else {
          playSound("wrong");
          resetTutorialWorm();
        }
      } else {
        resetTutorialWorm();
      }
    } else if (gameState === "PLAYING") {
      const activeWorm = worms.find((w) => w.id === draggingWormId);
      if (activeWorm) {
        const head = activeWorm.segments[0];
        const headPixel = { x: head.x * CELL_SIZE + CELL_SIZE / 2, y: head.y * CELL_SIZE + CELL_SIZE / 2 };
        
        let targetHole: Hole | null = null;
        for (const hole of holes) {
          const holePixel = { x: hole.x * CELL_SIZE + CELL_SIZE / 2, y: hole.y * CELL_SIZE + CELL_SIZE / 2 };
          const dist = Math.hypot(headPixel.x - holePixel.x, headPixel.y - holePixel.y);
          if (dist < 55) {
            targetHole = hole;
            break;
          }
        }

        if (targetHole) {
          if (targetHole.value === activeWorm.equation.answer) {
            playSound("correct");
            setScore((prev) => prev + activeWorm.score);
            
            setWorms((prev) => prev.filter((w) => w.id !== draggingWormId));
            setHoles((prev) => prev.filter((h) => h.id !== targetHole!.id));
            
          } else {
            playSound("wrong");
            setScore((prev) => Math.max(0, prev - 5));
            resetActiveWorm(activeWorm);
          }
        } else {
          resetActiveWorm(activeWorm);
        }
      }
    }

    setDraggingWormId(null);
    setDragPointerPos(null);
  };

  const resetTutorialWorm = () => {
    playSound("wrong");
    setTutorialWorm((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        isDragging: false,
        segments: [
          { x: 5, y: 7 },
          { x: 4, y: 7 },
          { x: 3, y: 7 },
        ],
      };
    });
  };

  const resetActiveWorm = (worm: Worm) => {
    let startX = Math.floor(Math.random() * (GRID_COLS - 5)) + 2;
    let startY = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
    
    setWorms((prev) =>
      prev.map((w) => {
        if (w.id !== worm.id) return w;
        
        const newSegs = [];
        for (let i = 0; i < w.segments.length; i++) {
          newSegs.push({ x: startX - i, y: startY });
        }
        return {
          ...w,
          isDragging: false,
          segments: newSegs,
        };
      })
    );
  };

  const submitScore = async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("Supabase 환경 변수가 존재하지 않습니다. 로컬 메모리에 기록합니다.");
      saveScoreLocally();
      return;
    }

    setIsSubmittingScore(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/math_worm_scores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          class_name: className,
          number: studentNumber,
          nickname: nickname || "익명지렁이",
          score: score,
        }),
      });

      if (!response.ok) {
        throw new Error("Score insert failed");
      }
      fetchRankings();
    } catch (e) {
      console.error(e);
      saveScoreLocally();
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const fetchRankings = async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      loadRankingsLocally();
      return;
    }

    try {
      let queryUrl = `${SUPABASE_URL}/rest/v1/math_worm_scores?order=score.desc&limit=50`;
      if (rankTab === "CLASS") {
        queryUrl = `${SUPABASE_URL}/rest/v1/math_worm_scores?class_name=eq.${className}&order=score.desc&limit=50`;
      }

      const response = await fetch(queryUrl, {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRankingList(data);
      }
    } catch (e) {
      console.error(e);
      loadRankingsLocally();
    }
  };

  const saveScoreLocally = () => {
    const localRecord: ScoreRecord = {
      class_name: className,
      number: studentNumber,
      nickname: nickname || "익명지렁이",
      score: score,
      created_at: new Date().toISOString(),
    };
    const saved = localStorage.getItem("math_worm_local_scores");
    let list = saved ? JSON.parse(saved) : [];
    list.push(localRecord);
    list.sort((a: any, b: any) => b.score - a.score);
    localStorage.setItem("math_worm_local_scores", JSON.stringify(list));
    
    loadRankingsLocally();
  };

  const loadRankingsLocally = () => {
    const saved = localStorage.getItem("math_worm_local_scores");
    let list: ScoreRecord[] = saved ? JSON.parse(saved) : [];
    if (rankTab === "CLASS") {
      list = list.filter((r) => r.class_name === className);
    }
    setRankingList(list.slice(0, 50));
  };

  useEffect(() => {
    if (gameState === "GAMEOVER") {
      fetchRankings();
    }
  }, [rankTab, gameState]);

  const handleLobbySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return alert("닉네임을 입력해주세요!");
    playSound("click");
    setGameState("TUTORIAL");
  };

  const handleRestart = () => {
    playSound("click");
    setGameState("PLAYING");
  };

  return (
    <div className="flex-1 w-full h-full max-w-4xl mx-auto p-4 flex flex-col justify-center items-center overflow-hidden">
      {gameState === "LOBBY" && (
        <div className="w-full max-w-md bg-white text-black p-8 retro-border bg-slate-50 dark:bg-slate-900 dark:text-white rounded-lg mt-8 shadow-xl">
          <h2 className="text-3xl text-center mb-6 text-yellow-500 font-bold retro-text-shadow">
            🎮 수학 지렁이 👾
          </h2>
          <p className="text-sm text-center mb-8 text-slate-500 dark:text-slate-400">
            화면에 쌓이는 지렁이를 정답 구멍에 빠르게 넣어주세요! 12마리가 넘으면 게임 오버됩니다.
          </p>

          <form onSubmit={handleLobbySubmit} className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold mb-2">반</label>
                <select
                  value={className}
                  onChange={(e) => setClassName(Number(e.target.value))}
                  className="w-full p-3 border-4 border-black bg-white text-black font-bold outline-none"
                >
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num}>{num}반</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold mb-2">번호</label>
                <select
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(Number(e.target.value))}
                  className="w-full p-3 border-4 border-black bg-white text-black font-bold outline-none"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>{num}번</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">닉네임</label>
              <input
                type="text"
                maxLength={10}
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="최대 10자"
                className="w-full p-3 border-4 border-black bg-white text-black font-bold outline-none"
              />
            </div>

            <button type="submit" className="w-full retro-btn retro-btn-primary py-4 text-lg">
              접속하기
            </button>
          </form>
        </div>
      )}

      {gameState === "TUTORIAL" && (
        <div className="w-full bg-white dark:bg-slate-900 text-black dark:text-white p-4 retro-border rounded-lg flex flex-col items-center">
          <h3 className="text-lg font-bold mb-2 text-center text-yellow-500">
            튜토리얼
          </h3>
          <p className="text-xs text-center mb-4 max-w-md">
            지렁이 <b>머리</b>를 터치/클릭하여 드래그한 뒤, 해답에 맞는 구멍에 놓으세요!
          </p>

          <div className="relative border-4 border-black w-full aspect-[4/3] rounded-md shadow-lg mb-4 bg-slate-950 overflow-hidden touch-none flex justify-center items-center">
            <svg
              ref={svgRef}
              viewBox="0 0 800 600"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {tutorialStep === 0 && tutorialWorm && tutorialHole && (
                <g>
                  <line
                    x1={tutorialWorm.segments[0].x * CELL_SIZE + 20}
                    y1={tutorialWorm.segments[0].y * CELL_SIZE + 20}
                    x2={tutorialHole.x * CELL_SIZE + 20}
                    y2={tutorialHole.y * CELL_SIZE + 20}
                    stroke="#f59e0b"
                    strokeWidth="4"
                    strokeDasharray="8,8"
                  />
                </g>
              )}

              {tutorialHole && (
                <g>
                  <circle cx={tutorialHole.x * CELL_SIZE + 20} cy={tutorialHole.y * CELL_SIZE + 20} r="28" fill="#1e293b" stroke="#000" strokeWidth="3" />
                  <circle cx={tutorialHole.x * CELL_SIZE + 20} cy={tutorialHole.y * CELL_SIZE + 20} r="24" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4,4" />
                  <text x={tutorialHole.x * CELL_SIZE + 20} y={tutorialHole.y * CELL_SIZE + 26} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="bold">
                    {tutorialHole.value}
                  </text>
                </g>
              )}

              {tutorialWorm && (
                <g>
                  {tutorialWorm.segments.slice(1).map((seg, idx) => (
                    <rect key={idx} x={seg.x * CELL_SIZE + 4} y={seg.y * CELL_SIZE + 4} width="32" height="32" fill={tutorialWorm.color} stroke="#000" strokeWidth="2" rx="4" />
                  ))}
                  {(() => {
                    const head = tutorialWorm.segments[0];
                    return (
                      <g>
                        <rect x={head.x * CELL_SIZE + 2} y={head.y * CELL_SIZE + 2} width="36" height="36" fill={tutorialWorm.color} stroke="#000" strokeWidth="3" rx="6" className={tutorialWorm.isDragging ? "" : "animate-pulse"} />
                        <circle cx={head.x * CELL_SIZE + 12} cy={head.y * CELL_SIZE + 14} r="3" fill="#fff" />
                        <circle cx={head.x * CELL_SIZE + 12} cy={head.y * CELL_SIZE + 14} r="1.5" fill="#000" />
                        <circle cx={head.x * CELL_SIZE + 24} cy={head.y * CELL_SIZE + 14} r="3" fill="#fff" />
                        <circle cx={head.x * CELL_SIZE + 24} cy={head.y * CELL_SIZE + 14} r="1.5" fill="#000" />
                        <path d={`M ${head.x * CELL_SIZE + 14} ${head.y * CELL_SIZE + 24} Q ${head.x * CELL_SIZE + 18} ${head.y * CELL_SIZE + 28} ${head.x * CELL_SIZE + 22} ${head.y * CELL_SIZE + 24}`} fill="none" stroke="#000" strokeWidth="2" />
                        <g transform={`translate(${head.x * CELL_SIZE - 20}, ${head.y * CELL_SIZE - 20})`}>
                          <rect width="76" height="18" fill="#fff" stroke="#000" strokeWidth="2" rx="3" />
                          <text x="38" y="13" textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold">
                            {tutorialWorm.equation.text}
                          </text>
                        </g>
                      </g>
                    );
                  })()}
                </g>
              )}
            </svg>
          </div>

          <div className="w-full text-center">
            {tutorialStep === 0 ? (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 font-bold text-xs shadow-md">
                💡 방정식 3x - 6 = 0 의 해는 2 입니다. 지렁이를 드래그해서 [2] 구멍에 쏙!
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 font-bold text-sm shadow-md animate-scale-up">
                  🎉 정답입니다! 구멍과 지렁이가 함께 사라졌습니다!
                </div>
                <button
                  onClick={() => {
                    playSound("click");
                    setGameState("PLAYING");
                  }}
                  className="retro-btn retro-btn-success py-2 px-6 animate-pulse"
                >
                  본 게임 시작하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === "PLAYING" && (
        <div className="w-full flex-1 flex flex-col bg-slate-900 border-4 border-black p-2 rounded-lg">
          <div className="w-full flex flex-wrap justify-between items-center bg-black text-white p-2 border-b-4 border-black mb-2 font-retro select-none text-[10px] sm:text-xs gap-2">
            <div className="flex gap-3">
              <span className="text-green-400">SCORE: {String(score).padStart(5, "0")}</span>
              <span className="text-cyan-400">TIME: {`${Math.floor(playTime / 60)}:${String(playTime % 60).padStart(2, "0")}`}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">WORMS:</span>
              <div className="w-20 sm:w-32 bg-slate-800 border-2 border-black h-3 sm:h-4 flex overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    worms.length > 8 ? "bg-red-500" : worms.length > 5 ? "bg-yellow-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${(worms.length / MAX_WORMS) * 100}%` }}
                />
              </div>
              <span className={worms.length >= MAX_WORMS - 2 ? "text-red-500 font-bold animate-pulse" : "text-white"}>
                {worms.length} / {MAX_WORMS}
              </span>
            </div>
          </div>

          <div className="flex-1 w-full relative border-4 border-black bg-slate-950 overflow-hidden touch-none flex justify-center items-center shadow-xl">
            <svg
              ref={svgRef}
              viewBox="0 0 800 600"
              className="w-full h-full object-contain"
              preserveAspectRatio="xMidYMid meet"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <rect width="100%" height="100%" fill="url(#grid)" />

              {holes.map((hole) => (
                <g key={hole.id}>
                  <circle cx={hole.x * CELL_SIZE + 20} cy={hole.y * CELL_SIZE + 20} r="28" fill="#18181b" stroke="#000" strokeWidth="3" />
                  <circle cx={hole.x * CELL_SIZE + 20} cy={hole.y * CELL_SIZE + 20} r="24" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4,4" className="animate-spin" style={{ transformOrigin: `${hole.x * CELL_SIZE + 20}px ${hole.y * CELL_SIZE + 20}px`, animationDuration: "10s" }} />
                  <text x={hole.x * CELL_SIZE + 20} y={hole.y * CELL_SIZE + 26} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="bold" className="font-retro pointer-events-none">
                    {hole.value}
                  </text>
                </g>
              ))}

              {worms.map((worm) => (
                <g key={worm.id}>
                  {worm.segments.slice(1).map((seg, idx) => {
                    const isRainbow = worm.color === "rainbow";
                    return (
                      <rect key={idx} x={seg.x * CELL_SIZE + 4} y={seg.y * CELL_SIZE + 4} width="32" height="32" className={isRainbow ? "bg-rainbow fill-transparent" : ""} fill={isRainbow ? "none" : worm.color} stroke="#000" strokeWidth="2" rx="4" />
                    );
                  })}
                  {(() => {
                    const head = worm.segments[0];
                    const isRainbow = worm.color === "rainbow";
                    return (
                      <g>
                        <rect x={head.x * CELL_SIZE + 2} y={head.y * CELL_SIZE + 2} width="36" height="36" className={isRainbow ? "bg-rainbow fill-transparent" : ""} fill={isRainbow ? "none" : worm.color} stroke="#000" strokeWidth="3" rx="6" />
                        <circle cx={head.x * CELL_SIZE + 12} cy={head.y * CELL_SIZE + 14} r="3.5" fill="#fff" />
                        <circle cx={head.x * CELL_SIZE + 12} cy={head.y * CELL_SIZE + 14} r="1.5" fill="#000" />
                        <circle cx={head.x * CELL_SIZE + 24} cy={head.y * CELL_SIZE + 14} r="3.5" fill="#fff" />
                        <circle cx={head.x * CELL_SIZE + 24} cy={head.y * CELL_SIZE + 14} r="1.5" fill="#000" />
                        <path d={`M ${head.x * CELL_SIZE + 14} ${head.y * CELL_SIZE + 24} Q ${head.x * CELL_SIZE + 18} ${head.y * CELL_SIZE + 27} ${head.x * CELL_SIZE + 22} ${head.y * CELL_SIZE + 24}`} fill="none" stroke="#000" strokeWidth="2.5" />
                        <g transform={`translate(${head.x * CELL_SIZE - 20}, ${head.y * CELL_SIZE - 20})`}>
                          <rect width="80" height="18" fill="#fff" stroke="#000" strokeWidth="2" rx="3" />
                          <text x="40" y="13" textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold" className="font-retro pointer-events-none">
                            {worm.equation.text}
                          </text>
                        </g>
                      </g>
                    );
                  })()}
                </g>
              ))}
            </svg>
          </div>

          <div className="w-full text-center mt-2 text-[10px] sm:text-xs text-slate-400 select-none">
            🟢 10점 | 🔵 20점 | 🟣 40점 | 🌈 50점
            <br />
            <span className="text-red-400 font-bold">⚠️ 지렁이가 {MAX_WORMS}마리가 쌓이면 게임 오버!</span>
          </div>
        </div>
      )}

      {gameState === "GAMEOVER" && (
        <div className="w-full max-w-2xl bg-white text-black dark:bg-slate-900 dark:text-white p-6 retro-border rounded-lg flex flex-col items-center overflow-hidden">
          <h2 className="text-4xl text-center text-red-500 font-bold mb-2 animate-pulse retro-text-shadow">
            GAME OVER
          </h2>
          <p className="text-xl font-bold mb-6">
            최종 점수: <span className="text-yellow-500 text-2xl font-black">{score}점</span>
          </p>

          <div className="flex w-full max-w-md border-b-4 border-black mb-4">
            <button
              onClick={() => {
                playSound("click");
                setRankTab("ALL");
              }}
              className={`flex-1 py-3 text-center font-bold text-xs sm:text-sm ${
                rankTab === "ALL" ? "bg-yellow-300 text-black font-black" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              전체 랭킹
            </button>
            <button
              onClick={() => {
                playSound("click");
                setRankTab("CLASS");
              }}
              className={`flex-1 py-3 text-center font-bold text-xs sm:text-sm ${
                rankTab === "CLASS" ? "bg-yellow-300 text-black font-black" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {className}반 랭킹
            </button>
          </div>

          <div className="w-full max-h-52 overflow-y-auto border-4 border-black bg-slate-950 p-1 mb-6 rounded">
            {isSubmittingScore ? (
              <p className="text-center py-8 text-cyan-400 text-sm">점수 기록 중...</p>
            ) : rankingList.length === 0 ? (
              <p className="text-center py-8 text-slate-500 text-sm">랭킹 정보가 없습니다.</p>
            ) : (
              <table className="w-full text-left font-retro text-[10px] sm:text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-700 text-yellow-400">
                    <th className="py-2 px-1">순위</th>
                    <th className="py-2 px-1">학급</th>
                    <th className="py-2 px-1">닉네임</th>
                    <th className="py-2 px-1 text-right">점수</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingList.map((record, index) => {
                    const isCurrentUser =
                      record.nickname === nickname &&
                      record.class_name === className &&
                      record.number === studentNumber &&
                      record.score === score;
                    return (
                      <tr
                        key={index}
                        className={`border-b border-slate-800 hover:bg-slate-900 ${
                          isCurrentUser ? "bg-cyan-950/70 text-cyan-300 font-bold" : "text-white"
                        }`}
                      >
                        <td className="py-2 px-1">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`}
                        </td>
                        <td className="py-2 px-1">
                          {record.class_name}반 {record.number}번
                        </td>
                        <td className="py-2 px-1 truncate max-w-24">{record.nickname}</td>
                        <td className="py-2 px-1 text-right text-yellow-400">{record.score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex gap-4 w-full max-w-md">
            <button
              onClick={() => {
                playSound("click");
                setGameState("LOBBY");
              }}
              className="flex-1 retro-btn py-3 text-xs sm:text-sm"
            >
              로비로 가기
            </button>
            <button onClick={handleRestart} className="flex-1 retro-btn retro-btn-primary py-3 text-xs sm:text-sm">
              다시 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
