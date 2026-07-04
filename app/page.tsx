"use client";

import React, { useState, useEffect, useRef } from "react";

// --- 데이터 구조 정의 ---
interface Equation {
  text: string;
  answer: number;
  score: number;
}

interface Worm {
  id: string;
  segments: { x: number; y: number }[]; // 0번 인덱스가 머리
  direction: "UP" | "DOWN" | "LEFT" | "RIGHT";
  equation: Equation;
  color: string;
  isDragging: boolean;
  score: number; // 지렁이가 가진 점수
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
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08); // G5
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
    // 10점: 계수가 1인 간단한 식 (x + a = b)
    const a = Math.floor(Math.random() * 8) + 2; // 2 ~ 9
    const ans = Math.floor(Math.random() * 7) + 1; // 1 ~ 7
    const op = Math.random() > 0.5 ? "+" : "-";
    if (op === "+") {
      text = `x + ${a} = ${ans + a}`;
      answer = ans;
    } else {
      text = `x - ${a} = ${ans - a < 0 ? ans - a : ans - a}`; // 해가 양수가 되도록 ans + a로 설정하거나 조율
      // 조금 더 깔끔하게: x - a = ans -> x = ans + a
      text = `x - ${a} = ${ans}`;
      answer = ans + a;
    }
  } else if (score === 20) {
    // 20점: ax - b = c (계수가 간단한 정수, 해는 정수)
    const a = Math.floor(Math.random() * 3) + 2; // 2 ~ 4
    const ans = Math.floor(Math.random() * 6) + 1; // 1 ~ 6
    const b = Math.floor(Math.random() * 5) + 1; // 1 ~ 5
    const c = a * ans - b;
    text = `${a}x - ${b} = ${c}`;
    answer = ans;
  } else if (score === 40) {
    // 40점: ax + b = cx + d (양변 이항 필요, 해는 정수)
    const a = Math.floor(Math.random() * 3) + 3; // 3 ~ 5
    const c = Math.floor(Math.random() * 2) + 1; // 1 ~ 2 (a != c 보장)
    const ans = Math.floor(Math.random() * 5) + 1; // 1 ~ 5
    const b = Math.floor(Math.random() * 6) + 1; // 1 ~ 6
    // a * ans + b = c * ans + d => d = (a - c) * ans + b
    const d = (a - c) * ans + b;
    text = `${a}x + ${b} = ${c}x + ${d}`;
    answer = ans;
  } else {
    // 50점: 복잡한 식 (괄호가 있거나 분수 계수)
    const isFraction = Math.random() > 0.5;
    if (isFraction) {
      // x / a + b = c -> x/a = c - b -> x = a(c - b)
      const a = Math.random() > 0.5 ? 2 : 3;
      const ansMultiplier = Math.floor(Math.random() * 4) + 1; // 1 ~ 4
      const ans = a * ansMultiplier; // 2, 4, 6, 8 or 3, 6, 9, 12
      const b = Math.floor(Math.random() * 4) + 1; // 1 ~ 4
      const c = (ans / a) + b;
      text = `x/${a} + ${b} = ${c}`;
      answer = ans;
    } else {
      // a(x - b) = c -> ax - ab = c -> x = (c/a) + b
      const a = Math.random() > 0.5 ? 2 : 3;
      const ans = Math.floor(Math.random() * 5) + 3; // 3 ~ 7
      const b = Math.floor(Math.random() * 2) + 1; // 1 ~ 2
      const c = a * (ans - b);
      text = `${a}(x - ${b}) = ${c}`;
      answer = ans;
    }
  }

  return { text, answer, score };
}

// --- Supabase 설정 읽기 ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export default function MathWormGame() {
  // --- 게임 상태 관리 ---
  const [gameState, setGameState] = useState<"LOBBY" | "TUTORIAL" | "PLAYING" | "GAMEOVER">("LOBBY");
  
  // 사용자 정보
  const [className, setClassName] = useState<number>(1);
  const [studentNumber, setStudentNumber] = useState<number>(1);
  const [nickname, setNickname] = useState<string>("");

  // 게임 내 변수
  const [score, setScore] = useState<number>(0);
  const [playTime, setPlayTime] = useState<number>(0);
  const [worms, setWorms] = useState<Worm[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  
  // 랭킹 리스트 및 랭킹 모드
  const [rankingList, setRankingList] = useState<ScoreRecord[]>([]);
  const [rankTab, setRankTab] = useState<"ALL" | "CLASS">("ALL");
  const [isSubmittingScore, setIsSubmittingScore] = useState<boolean>(false);

  // 드래그 중인 지렁이 관리
  const [draggingWormId, setDraggingWormId] = useState<string | null>(null);
  const [dragPointerPos, setDragPointerPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 튜토리얼 상태
  const [tutorialStep, setTutorialStep] = useState<number>(0); // 0: 드래그 전, 1: 드래그 성공
  const [tutorialWorm, setTutorialWorm] = useState<Worm | null>(null);
  const [tutorialHole, setTutorialHole] = useState<Hole | null>(null);

  // 실시간 타이머 및 루프 레퍼런스
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const spawnerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- 튜토리얼 초기화 ---
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
        direction: "RIGHT",
        equation: { text: "3x - 6 = 0", answer: 2, score: 20 },
        color: "#3b82f6", // 20점짜리 파랑색
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

  // --- 플레이 시작 및 루프 구동 ---
  useEffect(() => {
    if (gameState === "PLAYING") {
      playSound("spawn");
      setScore(0);
      setPlayTime(0);
      setWorms([]);
      setHoles([]);

      // 1. 초기 스폰 (지렁이 2마리, 구멍 3개)
      const initialWorms: Worm[] = [];
      const initialHoles: Hole[] = [];

      // 구멍 생성
      const targetAnswers = [2, 3, 5];
      targetAnswers.forEach((ans, i) => {
        initialHoles.push({
          id: `hole-${i}`,
          x: 4 + i * 5,
          y: 3 + (i % 2) * 8,
          value: ans,
        });
      });

      // 지렁이 생성
      const scores = [10, 20];
      scores.forEach((sc, i) => {
        const eq = generateEquation(sc);
        // 방정식 해와 일치하는 구멍이 무조건 하나 이상 있어야 하므로 초기 구멍 중 하나를 변경
        initialHoles[i].value = eq.answer;

        initialWorms.push({
          id: `worm-${Date.now()}-${i}`,
          segments: [
            { x: 3, y: 5 + i * 4 },
            { x: 2, y: 5 + i * 4 },
            { x: 1, y: 5 + i * 4 },
          ],
          direction: "RIGHT",
          equation: eq,
          color: sc === 10 ? "#10b981" : "#3b82f6",
          isDragging: false,
          score: sc,
        });
      });

      setWorms(initialWorms);
      setHoles(initialHoles);

      // 2. 타이머 시작
      timeIntervalRef.current = setInterval(() => {
        setPlayTime((prev) => prev + 1);
      }, 1000);

      // 3. 지렁이 움직임 루프 (300ms마다 한 칸씩 전진)
      gameIntervalRef.current = setInterval(() => {
        setWorms((prevWorms) => {
          return prevWorms.map((worm) => {
            if (worm.isDragging) return worm; // 드래그 중인 지렁이는 안 움직임

            const head = worm.segments[0];
            let nextDir = worm.direction;

            // 벽이나 다른 지렁이와 충돌할 예정인지 판단
            const getNextPos = (dir: string) => {
              if (dir === "UP") return { x: head.x, y: head.y - 1 };
              if (dir === "DOWN") return { x: head.x, y: head.y + 1 };
              if (dir === "LEFT") return { x: head.x - 1, y: head.y };
              return { x: head.x + 1, y: head.y }; // RIGHT
            };

            const isCellBlocked = (pos: { x: number; y: number }, excludeWormId: string) => {
              // 1. 벽 충돌
              if (pos.x < 0 || pos.x >= GRID_COLS || pos.y < 0 || pos.y >= GRID_ROWS) return true;
              // 2. 다른 지렁이(또는 자기) 몸통과의 충돌
              for (const w of prevWorms) {
                for (const seg of w.segments) {
                  if (seg.x === pos.x && seg.y === pos.y) return true;
                }
              }
              // 3. 구멍과의 물리 충돌 방지 (드롭 대상이므로 비켜가게 하거나 겹치게 할 수 있으나 겹쳐도 됨. 여기서는 겹침 허용)
              return false;
            };

            let nextPos = getNextPos(nextDir);

            // 막혀있다면 방향 전환 시도
            if (isCellBlocked(nextPos, worm.id)) {
              const directions: ("UP" | "DOWN" | "LEFT" | "RIGHT")[] = ["UP", "DOWN", "LEFT", "RIGHT"];
              const safeDirs = directions.filter((d) => !isCellBlocked(getNextPos(d), worm.id));

              if (safeDirs.length > 0) {
                // 안전한 방향 중 랜덤하게 하나 선택
                nextDir = safeDirs[Math.floor(Math.random() * safeDirs.length)];
                nextPos = getNextPos(nextDir);
              } else {
                // 사방이 꽉 막혔다면 이번 틱에는 정지 (움직이지 않고 방향만 꼼지락)
                return worm;
              }
            } else {
              // 막히지 않았어도 무작위로 꿈물꿈물 꺾는 레트로 느낌 부여 (10% 확률로 빈 공간 회전)
              if (Math.random() < 0.1) {
                const directions: ("UP" | "DOWN" | "LEFT" | "RIGHT")[] = ["UP", "DOWN", "LEFT", "RIGHT"];
                const safeDirs = directions.filter((d) => !isCellBlocked(getNextPos(d), worm.id));
                if (safeDirs.length > 0) {
                  nextDir = safeDirs[Math.floor(Math.random() * safeDirs.length)];
                  nextPos = getNextPos(nextDir);
                }
              }
            }

            // 머리 이동 및 몸체 따라오기
            const newSegments = [nextPos, ...worm.segments.slice(0, -1)];
            return {
              ...worm,
              segments: newSegments,
              direction: nextDir,
            };
          });
        });
      }, 300);

      // 4. 지렁이 & 구멍 주기적 생성 루프 (8초마다)
      spawnerIntervalRef.current = setInterval(() => {
        // 난이도 결정 법칙 (시간 경과에 따라 40, 50점 지렁이 스폰 확률 업)
        setPlayTime((time) => {
          setWorms((prevWorms) => {
            if (prevWorms.length >= MAX_WORMS) {
              // 포화 상태 도달 시 즉시 루프가 정지되며 게임오버 처리됨
              return prevWorms;
            }

            // 난이도별 점수 분배
            let scoreTier = 10;
            const rand = Math.random();
            if (time < 30) {
              scoreTier = rand < 0.7 ? 10 : 20;
            } else if (time < 60) {
              scoreTier = rand < 0.4 ? 10 : rand < 0.8 ? 20 : 40;
            } else {
              scoreTier = rand < 0.2 ? 10 : rand < 0.5 ? 20 : rand < 0.85 ? 40 : 50;
            }

            const eq = generateEquation(scoreTier);

            // 신규 지렁이 스폰 위치 확보 (지렁이들이 없는 벽면 입구 등)
            // 비어있는 무작위 출발지점 서치
            let spawnX = 0;
            let spawnY = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
            
            // 겹치지 않는 스폰 시도
            const isSpawnBlocked = prevWorms.some(w => w.segments.some(s => s.x === spawnX && s.y === spawnY));
            if (isSpawnBlocked) {
              spawnY = (spawnY + 4) % (GRID_ROWS - 2) + 1;
            }

            // 지렁이 길이 3~8 랜덤
            const wormLength = Math.floor(Math.random() * 6) + 3;
            const spawnSegments = [];
            for (let j = 0; j < wormLength; j++) {
              spawnSegments.push({ x: spawnX, y: spawnY }); // 한 점에 뭉쳐서 태어났다가 전진하며 길어짐
            }

            const colors: Record<number, string> = {
              10: "#10b981", // 초록
              20: "#3b82f6", // 파랑
              40: "#8b5cf6", // 보라
              50: "rainbow",  // 무지개 (CSS 처리)
            };

            const newWorm: Worm = {
              id: `worm-${Date.now()}-${Math.random()}`,
              segments: spawnSegments,
              direction: "RIGHT",
              equation: eq,
              color: colors[scoreTier],
              isDragging: false,
              score: scoreTier,
            };

            playSound("spawn");

            // 구멍도 같이 스폰해주기 (만약 맵에 해당 해의 구멍이 없다면 필수 추가)
            setHoles((prevHoles) => {
              const hasMatchingHole = prevHoles.some((h) => h.value === eq.answer);
              if (!hasMatchingHole && prevHoles.length < 6) {
                // 구멍 추가
                let hX = Math.floor(Math.random() * (GRID_COLS - 6)) + 3;
                let hY = Math.floor(Math.random() * (GRID_ROWS - 6)) + 3;
                
                // 기존 구멍들과 안 겹치게 서치
                while (prevHoles.some(h => Math.abs(h.x - hX) < 2 && Math.abs(h.y - hY) < 2)) {
                  hX = Math.floor(Math.random() * (GRID_COLS - 6)) + 3;
                  hY = Math.floor(Math.random() * (GRID_ROWS - 6)) + 3;
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
              } else if (prevHoles.length < 4) {
                // 주기적으로 무작위 구멍 보강
                let hX = Math.floor(Math.random() * (GRID_COLS - 6)) + 3;
                let hY = Math.floor(Math.random() * (GRID_ROWS - 6)) + 3;
                return [
                  ...prevHoles,
                  {
                    id: `hole-${Date.now()}-${Math.random()}`,
                    x: hX,
                    y: hY,
                    value: Math.floor(Math.random() * 10) + 1,
                  },
                ];
              }
              return prevHoles;
            });

            return [...prevWorms, newWorm];
          });
          return time;
        });
      }, 7000);

      return () => {
        if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
        if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
        if (spawnerIntervalRef.current) clearInterval(spawnerIntervalRef.current);
      };
    }
  }, [gameState]);

  // --- 지렁이 수 포화 상태 감지 (게임오버 트리거) ---
  useEffect(() => {
    if (gameState === "PLAYING" && worms.length >= MAX_WORMS) {
      // 12마리 도달 시 즉시 게임 오버
      playSound("gameover");
      setGameState("GAMEOVER");
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      if (spawnerIntervalRef.current) clearInterval(spawnerIntervalRef.current);
      
      // 스코어 전송 트리거
      submitScore();
    }
  }, [worms, gameState]);

  // --- SVG 좌표 구하기 (모바일/태블릿 터치 터치 및 마우스 포인터 공통 대응) ---
  const getSVGCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    
    // PointerEvent의 clientX, clientY 사용
    const clientX = e.clientX;
    const clientY = e.clientY;

    // SVG viewBox 비율에 맞춰 변환 (0~800, 0~600)
    const x = ((clientX - rect.left) / rect.width) * 800;
    const y = ((clientY - rect.top) / rect.height) * 600;
    return { x, y };
  };

  // --- 포인터 조작: 드래그 시작 (PointerDown) ---
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    const coords = getSVGCoords(e);
    if (!coords) return;

    // 클릭 지점 근처에 있는 지렁이 탐색
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
      
      // 머리 혹은 몸통 클릭 시 드래그 가능하게
      for (const worm of worms) {
        const head = worm.segments[0];
        const headPixel = { x: head.x * CELL_SIZE + CELL_SIZE / 2, y: head.y * CELL_SIZE + CELL_SIZE / 2 };
        const dist = Math.hypot(coords.x - headPixel.x, coords.y - headPixel.y);
        
        // 지렁이 머리 근처 클릭 시 픽업
        if (dist < 35) {
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

  // --- 포인터 조작: 드래그 중 (PointerMove) ---
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingWormId) return;
    e.preventDefault();
    const coords = getSVGCoords(e);
    if (!coords) return;

    setDragPointerPos(coords);

    // 격자 인덱스로 변환 (0 ~ 19, 0 ~ 14)
    const gridX = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(coords.x / CELL_SIZE)));
    const gridY = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(coords.y / CELL_SIZE)));

    if (gameState === "TUTORIAL" && tutorialWorm) {
      // 머리 좌표 변경 및 몸통이 머리를 부드럽게 따라오게 함
      const newSegments = [...tutorialWorm.segments];
      const prevHead = newSegments[0];
      
      if (prevHead.x !== gridX || prevHead.y !== gridY) {
        // 움직였을 때 세그먼트 업데이트
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

  // --- 포인터 조작: 드롭 (PointerUp) ---
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingWormId) return;
    e.preventDefault();

    if (gameState === "TUTORIAL" && tutorialWorm && tutorialHole) {
      const head = tutorialWorm.segments[0];
      const hole = tutorialHole;
      
      // 거리 확인
      const headPixel = { x: head.x * CELL_SIZE + CELL_SIZE / 2, y: head.y * CELL_SIZE + CELL_SIZE / 2 };
      const holePixel = { x: hole.x * CELL_SIZE + CELL_SIZE / 2, y: hole.y * CELL_SIZE + CELL_SIZE / 2 };
      const dist = Math.hypot(headPixel.x - holePixel.x, headPixel.y - holePixel.y);

      if (dist < 55) {
        // 정답 판정 (튜토리얼 해: 2)
        if (hole.value === tutorialWorm.equation.answer) {
          playSound("correct");
          setTutorialStep(1); // 튜토리얼 완료 단계
          // 구멍 중심으로 쏙 흡수되는 모션 연출
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
      // 드래그 대상 지렁이 찾기
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
          // 정답 확인
          if (targetHole.value === activeWorm.equation.answer) {
            playSound("correct");
            setScore((prev) => prev + activeWorm.score);
            
            // 쏙 들어가는 효과를 위해 잠시 스폰 멈추고 필터
            setWorms((prev) => prev.filter((w) => w.id !== draggingWormId));
            
            // 성공한 구멍은 리스폰하거나 새로운 값으로 갱신
            const updatedHoleValue = Math.floor(Math.random() * 15) + 1; // 새 해 값
            setHoles((prev) =>
              prev.map((h) => (h.id === targetHole!.id ? { ...h, value: updatedHoleValue } : h))
            );
          } else {
            // 오답! 감점
            playSound("wrong");
            setScore((prev) => Math.max(0, prev - 5));
            resetActiveWorm(activeWorm);
          }
        } else {
          // 구멍 밖으로 놓은 경우 원래 기어가기 복귀
          resetActiveWorm(activeWorm);
        }
      }
    }

    setDraggingWormId(null);
    setDragPointerPos(null);
  };

  // --- 지렁이 리셋 기능 (오답 및 빈곳에 놓았을 때) ---
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
    // 맵 안에서 안전한 빈 공간 찾아서 리셋
    let startX = Math.floor(Math.random() * (GRID_COLS - 5)) + 2;
    let startY = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
    
    setWorms((prev) =>
      prev.map((w) => {
        if (w.id !== worm.id) return w;
        
        // 지렁이 머리와 몸통 재배치
        const newSegs = [];
        for (let i = 0; i < w.segments.length; i++) {
          newSegs.push({ x: startX - i, y: startY });
        }
        return {
          ...w,
          isDragging: false,
          segments: newSegs,
          direction: "RIGHT" as const,
        };
      })
    );
  };

  // --- Supabase DB 저장 API ---
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
      console.log("점수가 성공적으로 기록되었습니다.");
      fetchRankings();
    } catch (e) {
      console.error(e);
      saveScoreLocally();
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // --- Supabase DB 랭킹 조회 API ---
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

  // --- Supabase 장애 또는 로컬 시뮬레이션용 대체 기능 ---
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
    
    // 랭킹 강제 업데이트
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

  // 랭킹 탭 전환 시 조회
  useEffect(() => {
    if (gameState === "GAMEOVER") {
      fetchRankings();
    }
  }, [rankTab, gameState]);

  // --- 로비 입장 확인 ---
  const handleLobbySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return alert("닉네임을 입력해주세요!");
    playSound("click");
    setGameState("TUTORIAL");
  };

  // --- 게임 재시작 ---
  const handleRestart = () => {
    playSound("click");
    setGameState("PLAYING");
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 flex flex-col justify-center items-center">
      {/* 1. LOBBY 화면 */}
      {gameState === "LOBBY" && (
        <div className="w-full max-w-md bg-white text-black p-8 retro-border bg-slate-50 dark:bg-slate-900 dark:text-white rounded-lg mt-8">
          <h2 className="text-3xl text-center mb-6 text-yellow-500 font-bold retro-text-shadow">
            🎮 수학 지렁이 👾
          </h2>
          <p className="text-sm text-center mb-8 text-slate-500 dark:text-slate-400">
            일차방정식을 풀고 지렁이를 알맞은 해 구멍에 넣어 최고 점수에 도전하세요!
          </p>

          <form onSubmit={handleLobbySubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2">반 선택</label>
              <select
                value={className}
                onChange={(e) => setClassName(Number(e.target.value))}
                className="w-full p-3 border-4 border-black bg-white text-black font-bold outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num}반
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">번호 선택</label>
              <select
                value={studentNumber}
                onChange={(e) => setStudentNumber(Number(e.target.value))}
                className="w-full p-3 border-4 border-black bg-white text-black font-bold outline-none"
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}번
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">닉네임</label>
              <input
                type="text"
                maxLength={10}
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임 입력 (최대 10자)"
                className="w-full p-3 border-4 border-black bg-white text-black font-bold outline-none"
              />
            </div>

            <button type="submit" className="w-full retro-btn retro-btn-primary py-4 text-lg">
              접속하기
            </button>
          </form>
        </div>
      )}

      {/* 2. TUTORIAL 화면 */}
      {gameState === "TUTORIAL" && (
        <div className="w-full bg-white dark:bg-slate-900 text-black dark:text-white p-6 retro-border rounded-lg flex flex-col items-center">
          <h3 className="text-xl font-bold mb-4 text-center text-yellow-500">
            튜토리얼: 조작 방법 익히기
          </h3>

          <p className="text-sm text-center mb-6 max-w-xl">
            직사각형 격자 위에서 지렁이의 <b>머리</b>를 터치/클릭한 채 드래그하여 방정식 해에 해당하는 숫자가 적힌 구멍 위에 놓아보세요!
          </p>

          {/* 튜토리얼용 격자판 */}
          <div className="relative border-4 border-black overflow-hidden max-w-full rounded-md shadow-lg mb-6 bg-slate-950">
            <svg
              ref={svgRef}
              viewBox="0 0 800 600"
              width="640"
              height="480"
              className="touch-none select-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* 바둑판 무늬 배경 */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* 튜토리얼 가이드 점선 화살표 */}
              {tutorialStep === 0 && tutorialWorm && tutorialHole && (
                <g>
                  <line
                    x1={tutorialWorm.segments[0].x * CELL_SIZE + 20}
                    y1={tutorialWorm.segments[0].y * CELL_SIZE + 20}
                    x2={tutorialHole.x * CELL_SIZE + 20}
                    y2={tutorialHole.y * CELL_SIZE + 20}
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeDasharray="6,6"
                  />
                  <polygon points="570,290 585,300 570,310" fill="#f59e0b" transform="rotate(-3, 580, 300)" />
                </g>
              )}

              {/* 1. 구멍 렌더링 */}
              {tutorialHole && (
                <g>
                  <circle
                    cx={tutorialHole.x * CELL_SIZE + 20}
                    cy={tutorialHole.y * CELL_SIZE + 20}
                    r="30"
                    fill="#1e293b"
                    stroke="#000000"
                    strokeWidth="3"
                  />
                  <circle
                    cx={tutorialHole.x * CELL_SIZE + 20}
                    cy={tutorialHole.y * CELL_SIZE + 20}
                    r="25"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={tutorialHole.x * CELL_SIZE + 20}
                    y={tutorialHole.y * CELL_SIZE + 26}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="18"
                    fontWeight="bold"
                  >
                    {tutorialHole.value}
                  </text>
                </g>
              )}

              {/* 2. 튜토리얼 지렁이 렌더링 */}
              {tutorialWorm && (
                <g>
                  {/* 지렁이 몸체 */}
                  {tutorialWorm.segments.slice(1).map((seg, idx) => (
                    <rect
                      key={idx}
                      x={seg.x * CELL_SIZE + 4}
                      y={seg.y * CELL_SIZE + 4}
                      width="32"
                      height="32"
                      fill={tutorialWorm.color}
                      stroke="#000000"
                      strokeWidth="2"
                      rx="4"
                    />
                  ))}
                  {/* 지렁이 머리 */}
                  {(() => {
                    const head = tutorialWorm.segments[0];
                    return (
                      <g>
                        <rect
                          x={head.x * CELL_SIZE + 2}
                          y={head.y * CELL_SIZE + 2}
                          width="36"
                          height="36"
                          fill={tutorialWorm.color}
                          stroke="#000000"
                          strokeWidth="3"
                          rx="6"
                          className={tutorialWorm.isDragging ? "" : "animate-pulse"}
                        />
                        {/* 눈 */}
                        <circle cx={head.x * CELL_SIZE + 12} cy={head.y * CELL_SIZE + 14} r="3" fill="#ffffff" />
                        <circle cx={head.x * CELL_SIZE + 12} cy={head.y * CELL_SIZE + 14} r="1.5" fill="#000000" />
                        <circle cx={head.x * CELL_SIZE + 24} cy={head.y * CELL_SIZE + 14} r="3" fill="#ffffff" />
                        <circle cx={head.x * CELL_SIZE + 24} cy={head.y * CELL_SIZE + 14} r="1.5" fill="#000000" />
                        {/* 미소 */}
                        <path
                          d={`M ${head.x * CELL_SIZE + 14} ${head.y * CELL_SIZE + 24} Q ${head.x * CELL_SIZE + 18} ${
                            head.y * CELL_SIZE + 28
                          } ${head.x * CELL_SIZE + 22} ${head.y * CELL_SIZE + 24}`}
                          fill="none"
                          stroke="#000000"
                          strokeWidth="2"
                        />
                        {/* 수식 라벨 */}
                        <g transform={`translate(${head.x * CELL_SIZE - 20}, ${head.y * CELL_SIZE - 20})`}>
                          <rect
                            width="76"
                            height="18"
                            fill="#ffffff"
                            stroke="#000000"
                            strokeWidth="2"
                            rx="3"
                          />
                          <text
                            x="38"
                            y="13"
                            textAnchor="middle"
                            fill="#000000"
                            fontSize="9"
                            fontWeight="bold"
                          >
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

          <div className="w-full text-center space-y-4">
            {tutorialStep === 0 ? (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 font-bold text-sm">
                💡 방정식 3x - 6 = 0 의 해는 2 입니다. 지렁이를 드래그해서 [2] 구멍에 넣어보세요!
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 font-bold text-sm animate-scale-up">
                  🎉 정답입니다! 쏙 들어갔어요!
                  <br />
                  <span className="text-xs font-normal">
                    방정식의 난이도(10점, 20점, 40점, 50점)에 따라 지렁이의 색상과 획득 점수가 다릅니다.
                  </span>
                </div>
                <button
                  onClick={() => {
                    playSound("click");
                    setGameState("PLAYING");
                  }}
                  className="retro-btn retro-btn-success py-3 px-8 text-lg animate-pulse"
                >
                  게임 시작!
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. PLAYING 화면 */}
      {gameState === "PLAYING" && (
        <div className="w-full bg-slate-900 border-4 border-black p-4 rounded-lg flex flex-col items-center">
          {/* HUD 대시보드 */}
          <div className="w-full flex flex-wrap justify-between items-center bg-black text-white p-3 border-b-4 border-black mb-4 font-retro select-none text-xs gap-3">
            <div className="flex gap-4">
              <span className="text-green-400">SCORE: {String(score).padStart(5, "0")}</span>
              <span className="text-cyan-400">TIME: {Math.floor(playTime / 60)}:{String(playTime % 60).padStart(2, "0")}</span>
            </div>
            
            {/* 지렁이 포화 상태 모니터 */}
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">WORMS:</span>
              <div className="w-32 bg-slate-800 border-2 border-black h-4 flex overflow-hidden">
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

          {/* 게임 보드판 SVG */}
          <div className="relative border-4 border-black overflow-hidden max-w-full rounded-md shadow-2xl bg-slate-950">
            <svg
              ref={svgRef}
              viewBox="0 0 800 600"
              width="720"
              height="540"
              className="touch-none select-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* 격자 무늬 */}
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* 1. 구멍(Holes) 렌더링 */}
              {holes.map((hole) => (
                <g key={hole.id}>
                  {/* 구멍 몸체 */}
                  <circle
                    cx={hole.x * CELL_SIZE + 20}
                    cy={hole.y * CELL_SIZE + 20}
                    r="28"
                    fill="#18181b"
                    stroke="#000"
                    strokeWidth="3"
                  />
                  <circle
                    cx={hole.x * CELL_SIZE + 20}
                    cy={hole.y * CELL_SIZE + 20}
                    r="24"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    className="animate-spin"
                    style={{ transformOrigin: `${hole.x * CELL_SIZE + 20}px ${hole.y * CELL_SIZE + 20}px`, animationDuration: "10s" }}
                  />
                  {/* 해 숫자 텍스트 */}
                  <text
                    x={hole.x * CELL_SIZE + 20}
                    y={hole.y * CELL_SIZE + 26}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="18"
                    fontWeight="bold"
                    className="font-retro retro-text-shadow-sm pointer-events-none"
                  >
                    {hole.value}
                  </text>
                </g>
              ))}

              {/* 2. 지렁이(Worms) 렌더링 */}
              {worms.map((worm) => (
                <g key={worm.id}>
                  {/* 몸통(Tail) */}
                  {worm.segments.slice(1).map((seg, idx) => {
                    const isRainbow = worm.color === "rainbow";
                    return (
                      <rect
                        key={idx}
                        x={seg.x * CELL_SIZE + 4}
                        y={seg.y * CELL_SIZE + 4}
                        width="32"
                        height="32"
                        className={isRainbow ? "bg-rainbow fill-transparent" : ""}
                        fill={isRainbow ? undefined : worm.color}
                        stroke="#000000"
                        strokeWidth="2"
                        rx="4"
                      />
                    );
                  })}
                  {/* 머리(Head) */}
                  {(() => {
                    const head = worm.segments[0];
                    const isRainbow = worm.color === "rainbow";
                    return (
                      <g>
                        <rect
                          x={head.x * CELL_SIZE + 2}
                          y={head.y * CELL_SIZE + 2}
                          width="36"
                          height="36"
                          className={isRainbow ? "bg-rainbow fill-transparent" : ""}
                          fill={isRainbow ? undefined : worm.color}
                          stroke="#000000"
                          strokeWidth="3"
                          rx="6"
                        />
                        {/* 삐죽거리는 지렁이 눈 */}
                        <circle cx={head.x * CELL_SIZE + 12} cy={head.y * CELL_SIZE + 14} r="3.5" fill="#ffffff" />
                        <circle cx={head.x * CELL_SIZE + 12} cy={head.y * CELL_SIZE + 14} r="1.5" fill="#000000" />
                        <circle cx={head.x * CELL_SIZE + 24} cy={head.y * CELL_SIZE + 14} r="3.5" fill="#ffffff" />
                        <circle cx={head.x * CELL_SIZE + 24} cy={head.y * CELL_SIZE + 14} r="1.5" fill="#000000" />
                        {/* 입 */}
                        <path
                          d={`M ${head.x * CELL_SIZE + 14} ${head.y * CELL_SIZE + 24} Q ${head.x * CELL_SIZE + 18} ${
                            head.y * CELL_SIZE + 27
                          } ${head.x * CELL_SIZE + 22} ${head.y * CELL_SIZE + 24}`}
                          fill="none"
                          stroke="#000"
                          strokeWidth="2.5"
                        />
                        {/* 방정식 말풍선 */}
                        <g transform={`translate(${head.x * CELL_SIZE - 20}, ${head.y * CELL_SIZE - 20})`}>
                          <rect
                            width="80"
                            height="18"
                            fill="#ffffff"
                            stroke="#000000"
                            strokeWidth="2"
                            rx="3"
                          />
                          <text
                            x="40"
                            y="13"
                            textAnchor="middle"
                            fill="#000000"
                            fontSize="8.5"
                            fontWeight="bold"
                            className="font-retro"
                          >
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

          {/* 설명 라벨 */}
          <div className="w-full text-center mt-3 text-xs text-slate-400 select-none">
            🟢 10점(x+a=b) | 🔵 20점(ax-b=c) | 🟣 40점(ax+b=cx+d) | 🌈 50점(복잡식, 무지개)
            <br />
            <span className="text-red-400 font-bold">⚠️ 지렁이가 {MAX_WORMS}마리가 되면 화면이 가득 차 게임 오버됩니다!</span>
          </div>
        </div>
      )}

      {/* 4. GAMEOVER 및 RANKING 화면 */}
      {gameState === "GAMEOVER" && (
        <div className="w-full max-w-2xl bg-white text-black dark:bg-slate-900 dark:text-white p-6 retro-border rounded-lg flex flex-col items-center">
          <h2 className="text-4xl text-center text-red-500 font-bold mb-2 animate-pulse retro-text-shadow">
            GAME OVER
          </h2>
          <p className="text-xl font-bold mb-6">
            최종 점수: <span className="text-yellow-500 text-2xl font-black">{score}점</span>
          </p>

          {/* 랭킹 탭 선택 */}
          <div className="flex w-full max-w-md border-b-4 border-black mb-6">
            <button
              onClick={() => {
                playSound("click");
                setRankTab("ALL");
              }}
              className={`flex-1 py-3 text-center font-bold text-sm ${
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
              className={`flex-1 py-3 text-center font-bold text-sm ${
                rankTab === "CLASS" ? "bg-yellow-300 text-black font-black" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              우리 반({className}반) 랭킹
            </button>
          </div>

          {/* 랭킹 리스트 테이블 */}
          <div className="w-full max-h-72 overflow-y-auto border-4 border-black bg-slate-950 p-2 mb-8 rounded">
            {isSubmittingScore ? (
              <p className="text-center py-8 text-cyan-400">점수 기록 중...</p>
            ) : rankingList.length === 0 ? (
              <p className="text-center py-8 text-slate-500">랭킹 정보가 없습니다.</p>
            ) : (
              <table className="w-full text-left font-retro text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-700 text-yellow-400">
                    <th className="py-2 px-2">순위</th>
                    <th className="py-2 px-2">학급</th>
                    <th className="py-2 px-2">닉네임</th>
                    <th className="py-2 px-2 text-right">점수</th>
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
                        <td className="py-2 px-2">
                          {index === 0 ? "🥇 1" : index === 1 ? "🥈 2" : index === 2 ? "🥉 3" : `${index + 1}`}
                        </td>
                        <td className="py-2 px-2">
                          {record.class_name}반 {record.number}번
                        </td>
                        <td className="py-2 px-2 truncate max-w-32">{record.nickname}</td>
                        <td className="py-2 px-2 text-right text-yellow-400">{record.score}</td>
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
              className="flex-1 retro-btn py-3 text-sm"
            >
              로비로 가기
            </button>
            <button onClick={handleRestart} className="flex-1 retro-btn retro-btn-primary py-3 text-sm">
              다시 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
