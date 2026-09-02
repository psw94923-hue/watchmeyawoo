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
}

const POLYGON_CONFIGS: Record<PolygonSides, {
  name: string;
  title: string;
  baseColor: string;
  pastelBg: string;
  shades: string[];
  strokeColor: string;
}> = {
  3: {
    name: "삼각형",
    title: "삼각형의 외각 부채꼴",
    baseColor: "#f97316",
    pastelBg: "#fff7ed",
    shades: ["#f97316", "#fb923c", "#ea580c"],
    strokeColor: "#c2410c",
  },
  4: {
    name: "사각형",
    title: "사각형의 외각 부채꼴",
    baseColor: "#06b6d4",
    pastelBg: "#ecfeff",
    shades: ["#06b6d4", "#22d3ee", "#0891b2", "#0e7490"],
    strokeColor: "#0f766e",
  },
  5: {
    name: "오각형",
    title: "오각형의 외각 부채꼴",
    baseColor: "#a855f7",
    pastelBg: "#faf5ff",
    shades: ["#a855f7", "#c084fc", "#9333ea", "#7e22ce", "#6b21a8"],
    strokeColor: "#581c87",
  },
  6: {
    name: "육각형",
    title: "육각형의 외각 부채꼴",
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const polygonCenterRef = useRef<Point>({ x: 300, y: 250 });
  const targetCenterRef = useRef<Point>({ x: 750, y: 250 });

  const verticesRef = useRef<Point[]>([]);
  const piecesRef = useRef<Piece[]>([]);

  const draggedPieceIndexRef = useRef<number>(-1);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const draggedVertexIndexRef = useRef<number>(-1);

  const animReqRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // Generate polygon vertices
  const generateVertices = useCallback((n: PolygonSides, width: number, height: number) => {
    const polyCenter = polygonCenterRef.current;
    const radius = Math.min(width, height) * 0.22;
    const newVerts: Point[] = [];
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < n; i++) {
      const angle = startAngle + (i * 2 * Math.PI) / n;
      let r = radius;
      if (n === 4 && i === 1) r *= 1.08;
      if (n === 5 && i === 2) r *= 0.95;
      if (n === 6 && i === 3) r *= 1.05;

      newVerts.push({
        x: polyCenter.x + r * Math.cos(angle),
        y: polyCenter.y + r * Math.sin(angle),
      });
    }

    verticesRef.current = newVerts;
    calculatePieces(newVerts, n);
  }, []);

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

      const pieceRadius = 54;
      const color = cfg.shades[i % cfg.shades.length];

      newPieces.push({
        id: i,
        vertex: { x: curr.x, y: curr.y },
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
      });

      cumulativeAngle += extAngle;
    }

    piecesRef.current = newPieces;
  };

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
    ctx.globalAlpha = 0.9;
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 1.0;
    ctx.stroke();

    const midAngle = (startAngle + endAngle) / 2;
    const textR = r * 0.58;
    const tx = cx + textR * Math.cos(midAngle);
    const ty = cy + textR * Math.sin(midAngle);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, tx, ty);

    ctx.restore();
  };

  const renderCanvas = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, pVal: number) => {
    ctx.clearRect(0, 0, width, height);

    // 1. Grid Background
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const targetCenter = targetCenterRef.current;
    const verts = verticesRef.current;
    const pieces = piecesRef.current;
    const cfg = POLYGON_CONFIGS[sides];

    // 2. Target Center Reference Circle & Crosshair
    ctx.save();
    ctx.beginPath();
    ctx.arc(targetCenter.x, targetCenter.y, 58, 0, Math.PI * 2);
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(targetCenter.x - 14, targetCenter.y); ctx.lineTo(targetCenter.x + 14, targetCenter.y);
    ctx.moveTo(targetCenter.x, targetCenter.y - 14); ctx.lineTo(targetCenter.x, targetCenter.y + 14);
    ctx.stroke();

    ctx.fillStyle = "#6b21a8";
    ctx.font = "bold 13px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎯 외각 모으기 기준점", targetCenter.x, targetCenter.y + 80);
    ctx.restore();

    if (verts.length < 3) return;

    // 3. Dotted extension lines
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    pieces.forEach((p) => {
      const extLen = 75;
      ctx.beginPath();
      ctx.moveTo(p.vertex.x, p.vertex.y);
      ctx.lineTo(
        p.vertex.x + extLen * Math.cos(p.angleIn),
        p.vertex.y + extLen * Math.sin(p.angleIn)
      );
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Polygon body
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = cfg.pastelBg;
    ctx.fill();
    ctx.strokeStyle = cfg.strokeColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Vertex drag handles (when pVal == 0)
    if (pVal === 0) {
      verts.forEach((v, idx) => {
        ctx.beginPath();
        ctx.arc(v.x, v.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = cfg.strokeColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 13px Pretendard, sans-serif";
        ctx.fillText(String.fromCharCode(65 + idx), v.x - 14, v.y - 14);
      });
    }

    // 4. Sector pieces
    pieces.forEach((p) => {
      let pos = { x: p.vertex.x, y: p.vertex.y };
      let startAng = p.angleIn;
      let endAng = p.angleIn + p.extAngle;

      if (pVal > 0 && draggedPieceIndexRef.current !== p.id && !p.snapped) {
        const t = pVal;
        pos = {
          x: (1 - t) * p.vertex.x + t * targetCenter.x,
          y: (1 - t) * p.vertex.y + t * targetCenter.y,
        };
        const rotOffset = t * (p.targetStartAngle - p.angleIn);
        startAng = p.angleIn + rotOffset;
        endAng = startAng + p.extAngle;
      } else if (p.snapped || pVal >= 0.99) {
        pos = targetCenter;
        startAng = p.targetStartAngle;
        endAng = p.targetEndAngle;
      } else if (draggedPieceIndexRef.current === p.id) {
        pos = p.currentPos;
      }

      drawSector(ctx, pos.x, pos.y, p.radius, startAng, endAng, p.color, `∠${String.fromCharCode(65 + p.id)}`);
    });
  }, [sides]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvas(ctx, canvas.width, canvas.height, progress);
  }, [progress, renderCanvas]);

  // Window resize handler
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      canvasRef.current.width = w;
      canvasRef.current.height = h;

      if (w > 768) {
        polygonCenterRef.current = { x: w * 0.32, y: h * 0.5 };
        targetCenterRef.current = { x: w * 0.74, y: h * 0.5 };
      } else {
        polygonCenterRef.current = { x: w * 0.5, y: h * 0.32 };
        targetCenterRef.current = { x: w * 0.5, y: h * 0.75 };
      }

      if (verticesRef.current.length === 0) {
        generateVertices(sides, w, h);
      } else {
        calculatePieces(verticesRef.current, sides);
      }
      render();
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [sides, generateVertices, render]);

  useEffect(() => {
    render();
  }, [progress, sides, render]);

  const handleSelectPolygon = (n: PolygonSides) => {
    setSides(n);
    setIsCut(false);
    setProgress(0);

    const canvas = canvasRef.current;
    if (canvas) {
      generateVertices(n, canvas.width, canvas.height);
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
    animateProgress(1.0, 750);
  };

  const handleReset = () => {
    setIsCut(false);
    setProgress(0);

    const canvas = canvasRef.current;
    if (canvas) {
      generateVertices(sides, canvas.width, canvas.height);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100;
    setProgress(val);
    if (val > 0) setIsCut(true);
  };

  // Pointer event handlers with Pointer Capture
  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (progress === 0) {
      const verts = verticesRef.current;
      for (let i = 0; i < verts.length; i++) {
        if (Math.hypot(pos.x - verts[i].x, pos.y - verts[i].y) < 26) {
          draggedVertexIndexRef.current = i;
          canvas.setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    if (isCut) {
      const pieces = piecesRef.current;
      const targetCenter = targetCenterRef.current;

      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        let piecePos = p.currentPos;
        if (progress > 0 && draggedPieceIndexRef.current !== i && !p.snapped) {
          const t = progress;
          piecePos = {
            x: (1 - t) * p.vertex.x + t * targetCenter.x,
            y: (1 - t) * p.vertex.y + t * targetCenter.y,
          };
        }

        if (Math.hypot(pos.x - piecePos.x, pos.y - piecePos.y) < p.radius + 14) {
          draggedPieceIndexRef.current = i;
          dragOffsetRef.current = { x: pos.x - piecePos.x, y: pos.y - piecePos.y };
          p.currentPos = piecePos;
          canvas.setPointerCapture(e.pointerId);
          return;
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (draggedVertexIndexRef.current >= 0) {
      verticesRef.current[draggedVertexIndexRef.current] = {
        x: Math.max(40, Math.min(canvas.width - 40, pos.x)),
        y: Math.max(40, Math.min(canvas.height - 40, pos.y)),
      };
      calculatePieces(verticesRef.current, sides);
      render();
      return;
    }

    if (draggedPieceIndexRef.current >= 0) {
      const p = piecesRef.current[draggedPieceIndexRef.current];
      p.currentPos = {
        x: pos.x - dragOffsetRef.current.x,
        y: pos.y - dragOffsetRef.current.y,
      };

      const targetCenter = targetCenterRef.current;
      const distToTarget = Math.hypot(p.currentPos.x - targetCenter.x, p.currentPos.y - targetCenter.y);
      if (distToTarget < 80) {
        p.snapped = true;
        p.currentPos = { x: targetCenter.x, y: targetCenter.y };
      } else {
        p.snapped = false;
      }

      if (piecesRef.current.every((pc) => pc.snapped)) {
        setProgress(1.0);
      }

      render();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    draggedVertexIndexRef.current = -1;
    draggedPieceIndexRef.current = -1;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const isCompleted = progress >= 0.98 || (piecesRef.current.length > 0 && piecesRef.current.every((p) => p.snapped));

  return (
    <div className="min-h-screen w-full flex flex-col font-sans select-none bg-slate-100 text-slate-900 overflow-x-hidden">
      {/* HEADER */}
      <header className="bg-white border-b-2 border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📐</span>
          <span className="text-xl font-black text-indigo-950 tracking-tight">
            다각형 <span className="text-purple-700">외각 탐구</span>
          </span>
          <span className="text-xs font-bold text-purple-900 bg-purple-100 px-3.5 py-1 rounded-full border border-purple-300">
            중1 수학 • 기하
          </span>
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4.5 py-2 rounded-full bg-white border-2 border-slate-300 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <span>🏠</span>
          <span>메인으로</span>
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {/* CONTROLS CARD */}
        <div className="bg-white border-2 border-slate-300 rounded-3xl p-4 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
          {/* TABS */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200">
            {( [3, 4, 5, 6] as PolygonSides[]).map((n) => (
              <button
                key={n}
                onClick={() => handleSelectPolygon(n)}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
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
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleCut}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>✂️</span> 외각 자르기
            </button>
            <button
              onClick={handleAssemble}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>✨</span> 한 점으로 모으기
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-700 font-black text-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔄</span> 초기화
            </button>
          </div>

          {/* SLIDER */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border-2 border-slate-200 min-w-[280px]">
            <span className="text-xs sm:text-sm font-black text-slate-700 whitespace-nowrap">
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
            <span className="text-sm font-black text-purple-800 w-12 text-right font-mono">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>

        {/* UNIFIED SINGLE WORKSPACE CARD */}
        <div className="bg-white border-2 border-slate-300 rounded-3xl shadow-lg flex flex-col overflow-hidden flex-1 min-h-[540px]">
          <div className="px-6 py-3.5 border-b-2 border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
            <div className="flex items-center gap-2 font-black text-base text-indigo-950">
              <span>🔷</span>
              <span>{POLYGON_CONFIGS[sides].title}</span>
            </div>
            <div className="text-xs font-bold text-slate-700 bg-white px-3.5 py-1 rounded-full border border-slate-300 shadow-sm">
              💡 꼭짓점을 드래그해 모양을 변경하거나, 외각 조각을 🎯 기준점으로 드래그해 모아보세요!
            </div>
          </div>

          {/* CANVAS WORKSPACE */}
          <div ref={containerRef} className="flex-1 w-full min-h-[460px] relative">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full touch-none cursor-default"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>

          {/* NON-OBSCURING RESULT SUMMARY BANNER AT BOTTOM */}
          <div
            className={`px-6 py-4 border-t-2 transition-all flex flex-wrap items-center justify-between gap-3 ${
              isCompleted
                ? "bg-purple-50 border-purple-300 opacity-100 shadow-md"
                : "bg-amber-50/70 border-amber-200 opacity-90"
            }`}
          >
            <div className="flex items-center gap-2 text-base font-black text-purple-950">
              <span>✨</span>
              <span>
                {isCompleted
                  ? "외각의 크기의 합 = 360° (완벽한 원 완성!)"
                  : isCut
                  ? "조각을 드래그하거나 모으기 버튼으로 🎯 기준점에 결합해보세요!"
                  : "꼭짓점을 드래그하여 다각형 모양을 조절해보세요!"}
              </span>
            </div>

            {isCompleted && (
              <div className="flex flex-wrap gap-2 items-center">
                {piecesRef.current.map((p, idx) => (
                  <span
                    key={p.id}
                    className="bg-white border-1.5 border-purple-300 text-purple-900 text-xs font-extrabold px-3 py-1 rounded-xl shadow-sm"
                  >
                    ∠{String.fromCharCode(65 + idx)} = {p.extAngleDeg}°
                  </span>
                ))}
                <span className="bg-purple-700 text-white text-xs font-black px-4 py-1.5 rounded-xl shadow-md">
                  합계 = 360°
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
