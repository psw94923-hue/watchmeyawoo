"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface ExteriorAngleAppProps {
  onBack: () => void;
}

type PolygonSides = 3 | 4 | 5 | 6;

interface Point {
  x: number;
  y: number;
}

interface Piece {
  id: number;
  vertex: Point;
  angleIn: number;
  angleOut: number;
  extAngle: number;
  extAngleDeg: number;
  radius: number;
  color: string;
  targetStartAngle: number;
  targetEndAngle: number;
  snapped: boolean;
  currentPos: Point;
  currentCanvas: "left" | "right";
}

const POLYGON_CONFIGS: Record<PolygonSides, {
  name: string;
  baseColor: string;
  pastelBg: string;
  shades: string[];
  strokeColor: string;
}> = {
  3: {
    name: "삼각형",
    baseColor: "#f97316",
    pastelBg: "#fff7ed",
    shades: ["#f97316", "#fb923c", "#ea580c"],
    strokeColor: "#c2410c",
  },
  4: {
    name: "사각형",
    baseColor: "#06b6d4",
    pastelBg: "#ecfeff",
    shades: ["#06b6d4", "#22d3ee", "#0891b2", "#0e7490"],
    strokeColor: "#0f766e",
  },
  5: {
    name: "오각형",
    baseColor: "#a855f7",
    pastelBg: "#faf5ff",
    shades: ["#a855f7", "#c084fc", "#9333ea", "#7e22ce", "#6b21a8"],
    strokeColor: "#581c87",
  },
  6: {
    name: "육각형",
    baseColor: "#eab308",
    pastelBg: "#fefce8",
    shades: ["#eab308", "#facc15", "#d97706", "#ca8a04", "#a16207", "#854d0e"],
    strokeColor: "#854d0e",
  },
};

export default function ExteriorAngleApp({ onBack }: ExteriorAngleAppProps) {
  const [sides, setSides] = useState<PolygonSides>(3);
  const [progress, setProgress] = useState<number>(0); // 0 to 1
  const [isCut, setIsCut] = useState<boolean>(false);
  const [showCompletion, setShowCompletion] = useState<boolean>(false);

  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const leftContainerRef = useRef<HTMLDivElement | null>(null);
  const rightContainerRef = useRef<HTMLDivElement | null>(null);

  const verticesRef = useRef<Point[]>([]);
  const piecesRef = useRef<Piece[]>([]);

  const draggedPieceIndexRef = useRef<number>(-1);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const draggedVertexIndexRef = useRef<number>(-1);

  const animReqRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // Helper to generate convex polygon vertices
  const generateVertices = useCallback((n: PolygonSides, width: number, height: number) => {
    const center = { x: width / 2, y: height / 2 };
    const radius = Math.min(width, height) * 0.28;
    const newVerts: Point[] = [];
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < n; i++) {
      const angle = startAngle + (i * 2 * Math.PI) / n;
      let r = radius;
      if (n === 4 && i === 1) r *= 1.08;
      if (n === 5 && i === 2) r *= 0.95;
      if (n === 6 && i === 3) r *= 1.05;

      newVerts.push({
        x: center.x + r * Math.cos(angle),
        y: center.y + r * Math.sin(angle),
      });
    }

    verticesRef.current = newVerts;
    calculatePieces(newVerts, n);
  }, []);

  // Calculate exterior angles and sector metadata
  const calculatePieces = (verts: Point[], n: PolygonSides) => {
    const cfg = POLYGON_CONFIGS[n];
    const newPieces: Piece[] = [];
    let cumulativeAngle = 0;

    for (let i = 0; i < n; i++) {
      const prev = verts[(i - 1 + n) % n];
      const curr = verts[i];
      const next = verts[(i + 1) % n];

      const vIn = { x: curr.x - prev.x, y: curr.y - prev.y };
      const angleIn = Math.atan2(vIn.y, vIn.x);

      const vOut = { x: next.x - curr.x, y: next.y - curr.y };
      const angleOut = Math.atan2(vOut.y, vOut.x);

      let extAngle = angleOut - angleIn;
      while (extAngle <= 0) extAngle += Math.PI * 2;
      while (extAngle > Math.PI * 2) extAngle -= Math.PI * 2;

      const pieceRadius = 48;
      const color = cfg.shades[i % cfg.shades.length];

      newPieces.push({
        id: i,
        vertex: curr,
        angleIn,
        angleOut,
        extAngle,
        extAngleDeg: Math.round((extAngle * 180) / Math.PI),
        radius: pieceRadius,
        color,
        targetStartAngle: cumulativeAngle,
        targetEndAngle: cumulativeAngle + extAngle,
        snapped: false,
        currentPos: { x: curr.x, y: curr.y },
        currentCanvas: "left",
      });

      cumulativeAngle += extAngle;
    }

    piecesRef.current = newPieces;
  };

  // Canvas drawing routines
  const renderLeftCanvas = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, pVal: number) => {
    const cfg = POLYGON_CONFIGS[sides];
    ctx.clearRect(0, 0, width, height);

    // Subtle background grid lines
    ctx.strokeStyle = "rgba(203, 213, 225, 0.3)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const verts = verticesRef.current;
    const pieces = piecesRef.current;
    if (verts.length < 3) return;

    // 1. Dotted extension lines
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    pieces.forEach((p) => {
      const extLen = 70;
      ctx.beginPath();
      ctx.moveTo(p.vertex.x, p.vertex.y);
      ctx.lineTo(
        p.vertex.x + extLen * Math.cos(p.angleIn),
        p.vertex.y + extLen * Math.sin(p.angleIn)
      );
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // 2. Polygon base body
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = cfg.pastelBg;
    ctx.fill();
    ctx.strokeStyle = cfg.strokeColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 3. Render Sector pieces on Left
    pieces.forEach((p) => {
      if (p.snapped || p.currentCanvas === "right") return;

      let renderPos = { x: p.vertex.x, y: p.vertex.y };
      const renderStartAngle = p.angleIn;
      const renderEndAngle = p.angleIn + p.extAngle;

      if (pVal > 0) {
        if (draggedPieceIndexRef.current === p.id) {
          renderPos = p.currentPos;
        } else {
          const bisect = p.angleIn + p.extAngle / 2;
          const shiftDist = pVal * 35;
          renderPos = {
            x: p.vertex.x + shiftDist * Math.cos(bisect),
            y: p.vertex.y + shiftDist * Math.sin(bisect),
          };
        }
      }

      drawSector(ctx, renderPos.x, renderPos.y, p.radius, renderStartAngle, renderEndAngle, p.color, `∠${String.fromCharCode(65 + p.id)}`);
    });

    // 4. Vertex Drag Handles
    if (pVal === 0) {
      verts.forEach((v, idx) => {
        ctx.beginPath();
        ctx.arc(v.x, v.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = cfg.strokeColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = "#1e1b4b";
        ctx.font = "bold 12px Pretendard, sans-serif";
        ctx.fillText(String.fromCharCode(65 + idx), v.x - 12, v.y - 12);
      });
    }
  }, [sides]);

  const renderRightCanvas = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, pVal: number) => {
    const target = { x: width / 2, y: height / 2 };
    ctx.clearRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = "rgba(203, 213, 225, 0.3)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Reference Target Circle & Crosshair
    ctx.beginPath();
    ctx.arc(target.x, target.y, 50, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(139, 92, 246, 0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(target.x - 12, target.y); ctx.lineTo(target.x + 12, target.y);
    ctx.moveTo(target.x, target.y - 12); ctx.lineTo(target.x, target.y + 12);
    ctx.stroke();

    // Render Assembly Pieces
    const pieces = piecesRef.current;
    pieces.forEach((p) => {
      let shouldDraw = false;
      let pos = { x: target.x, y: target.y };
      let startAng = p.targetStartAngle;
      let endAng = p.targetEndAngle;

      if (pVal > 0 && draggedPieceIndexRef.current !== p.id) {
        shouldDraw = true;
        const t = pVal;
        const startPos = p.vertex;
        pos = {
          x: (1 - t) * startPos.x + t * target.x,
          y: (1 - t) * startPos.y + t * target.y,
        };

        const rotOffset = (1 - t) * 0 + t * (p.targetStartAngle - p.angleIn);
        startAng = p.angleIn + rotOffset;
        endAng = startAng + p.extAngle;
      } else if (p.currentCanvas === "right" || p.snapped) {
        shouldDraw = true;
        pos = p.currentPos;
        if (p.snapped) {
          pos = target;
          startAng = p.targetStartAngle;
          endAng = p.targetEndAngle;
        } else {
          startAng = p.angleIn;
          endAng = p.angleIn + p.extAngle;
        }
      }

      if (shouldDraw) {
        drawSector(ctx, pos.x, pos.y, p.radius, startAng, endAng, p.color, `∠${String.fromCharCode(65 + p.id)}`);
      }
    });
  }, []);

  const drawSector = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number,
    color: string,
    label: string
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.88;
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1.0;
    ctx.stroke();

    const midAngle = (startAngle + endAngle) / 2;
    const textR = r * 0.58;
    const tx = cx + textR * Math.cos(midAngle);
    const ty = cy + textR * Math.sin(midAngle);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, tx, ty);

    ctx.restore();
  };

  const render = useCallback(() => {
    const lCanvas = leftCanvasRef.current;
    const rCanvas = rightCanvasRef.current;
    if (!lCanvas || !rCanvas) return;

    const lCtx = lCanvas.getContext("2d");
    const rCtx = rCanvas.getContext("2d");
    if (!lCtx || !rCtx) return;

    renderLeftCanvas(lCtx, lCanvas.width, lCanvas.height, progress);
    renderRightCanvas(rCtx, rCanvas.width, rCanvas.height, progress);
  }, [progress, renderLeftCanvas, renderRightCanvas]);

  // Window resize handler
  useEffect(() => {
    const updateSizes = () => {
      if (!leftContainerRef.current || !rightContainerRef.current) return;
      if (!leftCanvasRef.current || !rightCanvasRef.current) return;

      const lw = leftContainerRef.current.clientWidth;
      const lh = leftContainerRef.current.clientHeight;
      leftCanvasRef.current.width = lw;
      leftCanvasRef.current.height = lh;

      const rw = rightContainerRef.current.clientWidth;
      const rh = rightContainerRef.current.clientHeight;
      rightCanvasRef.current.width = rw;
      rightCanvasRef.current.height = rh;

      if (verticesRef.current.length === 0) {
        generateVertices(sides, lw, lh);
      }
      render();
    };

    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, [sides, generateVertices, render]);

  // Sync canvas render when state changes
  useEffect(() => {
    render();
  }, [progress, sides, render]);

  // Handle polygon side selection
  const handleSelectPolygon = (n: PolygonSides) => {
    setSides(n);
    setIsCut(false);
    setProgress(0);
    setShowCompletion(false);

    const lCanvas = leftCanvasRef.current;
    if (lCanvas) {
      generateVertices(n, lCanvas.width, lCanvas.height);
    }
  };

  const handleCut = () => {
    setIsCut(true);
    if (progress === 0) {
      setProgress(0.15);
    }
  };

  const animateProgress = (targetVal: number, duration: number) => {
    if (isAnimatingRef.current && animReqRef.current) {
      cancelAnimationFrame(animReqRef.current);
    }

    const startVal = progress;
    const startTime = performance.now();
    isAnimatingRef.current = true;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      const cur = startVal + (targetVal - startVal) * ease;

      setProgress(cur);

      if (cur >= 0.99) {
        setShowCompletion(true);
      }

      if (p < 1) {
        animReqRef.current = requestAnimationFrame(step);
      } else {
        isAnimatingRef.current = false;
      }
    };

    animReqRef.current = requestAnimationFrame(step);
  };

  const handleAssemble = () => {
    setIsCut(true);
    animateProgress(1.0, 800);
  };

  const handleReset = () => {
    setIsCut(false);
    setProgress(0);
    setShowCompletion(false);

    piecesRef.current.forEach((pc) => {
      pc.snapped = false;
      pc.currentCanvas = "left";
      pc.currentPos = { x: pc.vertex.x, y: pc.vertex.y };
    });

    const lCanvas = leftCanvasRef.current;
    if (lCanvas) {
      generateVertices(sides, lCanvas.width, lCanvas.height);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100;
    setProgress(val);
    if (val > 0) setIsCut(true);

    if (val >= 0.99) {
      setShowCompletion(true);
    } else {
      setShowCompletion(false);
    }
  };

  // Touch & Mouse Pointer Event Handling
  const handlePointerDown = (canvasType: "left" | "right") => (e: React.PointerEvent) => {
    const lCanvas = leftCanvasRef.current;
    const rCanvas = rightCanvasRef.current;
    if (!lCanvas || !rCanvas) return;

    const rectL = lCanvas.getBoundingClientRect();
    const rectR = rCanvas.getBoundingClientRect();

    const posL = { x: e.clientX - rectL.left, y: e.clientY - rectL.top };
    const posR = { x: e.clientX - rectR.left, y: e.clientY - rectR.top };

    // 1. Vertex drag on Left (progress == 0)
    if (progress === 0 && canvasType === "left") {
      const verts = verticesRef.current;
      for (let i = 0; i < verts.length; i++) {
        if (Math.hypot(posL.x - verts[i].x, posL.y - verts[i].y) < 22) {
          draggedVertexIndexRef.current = i;
          return;
        }
      }
    }

    // 2. Piece drag
    if (isCut) {
      const pieces = piecesRef.current;
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const checkPos = p.currentCanvas === "right" ? posR : posL;
        if (Math.hypot(checkPos.x - p.currentPos.x, checkPos.y - p.currentPos.y) < p.radius + 10) {
          draggedPieceIndexRef.current = i;
          dragOffsetRef.current = {
            x: checkPos.x - p.currentPos.x,
            y: checkPos.y - p.currentPos.y,
          };
          return;
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const lCanvas = leftCanvasRef.current;
    const rCanvas = rightCanvasRef.current;
    if (!lCanvas || !rCanvas) return;

    if (draggedVertexIndexRef.current >= 0) {
      const rectL = lCanvas.getBoundingClientRect();
      verticesRef.current[draggedVertexIndexRef.current] = {
        x: Math.max(30, Math.min(lCanvas.width - 30, e.clientX - rectL.left)),
        y: Math.max(30, Math.min(lCanvas.height - 30, e.clientY - rectL.top)),
      };
      calculatePieces(verticesRef.current, sides);
      render();
      return;
    }

    if (draggedPieceIndexRef.current >= 0) {
      const rectR = rCanvas.getBoundingClientRect();
      const rectL = lCanvas.getBoundingClientRect();

      const isOverRight = e.clientX >= rectR.left && e.clientX <= rectR.right;
      const p = piecesRef.current[draggedPieceIndexRef.current];

      const targetCenter = { x: rCanvas.width / 2, y: rCanvas.height / 2 };

      if (isOverRight) {
        p.currentCanvas = "right";
        p.currentPos = {
          x: e.clientX - rectR.left - dragOffsetRef.current.x,
          y: e.clientY - rectR.top - dragOffsetRef.current.y,
        };

        const distToTarget = Math.hypot(p.currentPos.x - targetCenter.x, p.currentPos.y - targetCenter.y);
        if (distToTarget < 75) {
          p.snapped = true;
          p.currentPos = { x: targetCenter.x, y: targetCenter.y };
        } else {
          p.snapped = false;
        }
      } else {
        p.currentCanvas = "left";
        p.currentPos = {
          x: e.clientX - rectL.left - dragOffsetRef.current.x,
          y: e.clientY - rectL.top - dragOffsetRef.current.y,
        };
        p.snapped = false;
      }

      if (piecesRef.current.every((pc) => pc.snapped)) {
        setProgress(1.0);
        setShowCompletion(true);
      }

      render();
    }
  };

  const handlePointerUp = () => {
    draggedVertexIndexRef.current = -1;
    draggedPieceIndexRef.current = -1;
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col font-sans select-none overflow-x-hidden"
      style={{
        background: "linear-gradient(135deg, #fdfbf7 0%, #f4effa 50%, #eef6ff 100%)",
        color: "#1e1b4b",
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">📐</span>
          <span className="text-lg font-black text-indigo-950 tracking-tight">
            다각형 <span className="text-purple-600">외각 탐구</span>
          </span>
          <span className="text-xs font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
            중1 수학 • 기하
          </span>
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-300 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <span>🏠</span>
          <span>메인으로</span>
        </button>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {/* CONTROLS CARD */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-lg flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* TABS */}
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
              {([3, 4, 5, 6] as PolygonSides[]).map((n) => (
                <button
                  key={n}
                  onClick={() => handleSelectPolygon(n)}
                  className={`px-4 py-2 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
                    sides === n
                      ? "bg-white text-purple-900 shadow-md"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {POLYGON_CONFIGS[n].name}
                </button>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCut}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>✂️</span> 외각 자르기
              </button>
              <button
                onClick={handleAssemble}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>✨</span> 한 점으로 모으기
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-extrabold text-xs sm:text-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔄</span> 초기화
              </button>
            </div>
          </div>

          {/* PROGRESS SLIDER */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200">
            <span className="text-xs sm:text-sm font-extrabold text-slate-700 whitespace-nowrap">
              🎚️ 모으기 진행률
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(progress * 100)}
              onChange={handleSliderChange}
              className="flex-1 h-2 accent-purple-600 cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-black text-purple-700 w-12 text-right font-mono">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>

        {/* WORKSPACE SPLIT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[460px]">
          {/* LEFT PANEL: POLYGON VIEW */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-lg flex flex-col overflow-hidden relative">
            <div className="px-5 py-3 border-b border-slate-200/80 flex items-center justify-between bg-white/60">
              <div className="flex items-center gap-2 font-extrabold text-sm text-indigo-950">
                <span>🔷</span>
                <span>{POLYGON_CONFIGS[sides].name}와 외각 부채꼴</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                💡 꼭짓점을 드래그하여 모양 변경 가능
              </span>
            </div>
            <div ref={leftContainerRef} className="flex-1 w-full min-h-[360px] relative">
              <canvas
                ref={leftCanvasRef}
                className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                onPointerDown={handlePointerDown("left")}
              />
            </div>
          </div>

          {/* RIGHT PANEL: ASSEMBLY VIEW */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-lg flex flex-col overflow-hidden relative">
            <div className="px-5 py-3 border-b border-slate-200/80 flex items-center justify-between bg-white/60">
              <div className="flex items-center gap-2 font-extrabold text-sm text-indigo-950">
                <span>🎯</span>
                <span>외각 결합 기준점</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                ✋ 조각을 기준점 근처로 드래그하면 자동 결합
              </span>
            </div>
            <div ref={rightContainerRef} className="flex-1 w-full min-h-[360px] relative">
              <canvas
                ref={rightCanvasRef}
                className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                onPointerDown={handlePointerDown("right")}
              />

              {/* COMPLETION BADGE OVERLAY */}
              {showCompletion && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md border-2 border-purple-500 rounded-3xl p-6 shadow-2xl text-center z-40 max-w-sm w-[90%] animate-fade-in-up">
                  <h3 className="text-xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                    ✨ 외각의 크기의 합 = 360° ✨
                  </h3>
                  <p className="text-xs font-bold text-slate-600 mb-3">
                    모든 다각형의 외각 조각을 모으면 완벽한 360° 원이 완성됩니다!
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {piecesRef.current.map((p, idx) => (
                      <span
                        key={p.id}
                        className="bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-extrabold px-2.5 py-1 rounded-lg"
                      >
                        ∠{String.fromCharCode(65 + idx)} = {p.extAngleDeg}°
                      </span>
                    ))}
                    <span className="bg-purple-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                      합계 = 360°
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
