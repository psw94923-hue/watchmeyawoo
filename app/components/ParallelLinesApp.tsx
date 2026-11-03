"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface ParallelLinesAppProps {
  onBack?: () => void;
}

type MainTab = "board" | "a1" | "a2" | "b" | "drag";

interface Point {
  x: number;
  y: number;
}

// Color palette for ratio pairs
const COLOR_LEFT = "#2563eb"; // Blue (왼쪽 변 / AB:AD, AD:DB)
const COLOR_RIGHT = "#e11d48"; // Red (오른쪽 변 / AC:AE, AE:EC)
const COLOR_BASE = "#16a34a"; // Green (밑변·평행선 / BC:DE)

// ---------------------------------------------------------------------------
// GEOMETRY HELPERS (100% Exact Vector Math)
// ---------------------------------------------------------------------------
function lerpPt(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

function dist(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function unitVec(from: Point, to: Point): Point {
  const d = dist(from, to) || 1;
  return { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
}

// Interior angle bisector point at distance `r` from vertex `v` between rays `v->p1` and `v->p2`
function angleMarkerPos(v: Point, p1: Point, p2: Point, r: number): Point {
  const u1 = unitVec(v, p1);
  const u2 = unitVec(v, p2);
  const bx = u1.x + u2.x;
  const by = u1.y + u2.y;
  const bLen = Math.hypot(bx, by) || 1;
  return {
    x: v.x + (bx / bLen) * r,
    y: v.y + (by / bLen) * r,
  };
}

// Quadratic bezier arc path between p1 and p2 bowing out by `bulge` pixels
// Normal vector is (-u.y * side, u.x * side)
function makeArcPath(p1: Point, p2: Point, bulge: number, side: 1 | -1 = 1): string {
  const mid = lerpPt(p1, p2, 0.5);
  const u = unitVec(p1, p2);
  const nx = -u.y * side;
  const ny = u.x * side;
  const cx = mid.x + nx * bulge;
  const cy = mid.y + ny * bulge;
  return `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
}

// Midpoint of quadratic bezier at t=0.5 (0.25*p1 + 0.5*c + 0.25*p2)
function getArcLabelPos(p1: Point, p2: Point, bulge: number, side: 1 | -1 = 1, extraOffset = 0): Point {
  const mid = lerpPt(p1, p2, 0.5);
  const u = unitVec(p1, p2);
  const nx = -u.y * side;
  const ny = u.x * side;
  const peakOffset = bulge * 0.5 + extraOffset;
  return {
    x: mid.x + nx * peakOffset,
    y: mid.y + ny * peakOffset,
  };
}

// ---------------------------------------------------------------------------
// REUSABLE SVG PRIMITIVES
// (IMPORTANT: Outer <g> has SVG transform, inner <g> has CSS scale animation
// so CSS transform never overwrites SVG translate/rotate!)
// ---------------------------------------------------------------------------

// Parallel chevron symbol (`>` or `>>`) placed accurately at `t` along segment p1->p2
function ParallelChevron({
  p1,
  p2,
  t = 0.5,
  count = 1,
  color = "#1e293b",
  size = 6.5,
  strokeWidth = 2,
  bouncy = false,
}: {
  p1: Point;
  p2: Point;
  t?: number;
  count?: 1 | 2;
  color?: string;
  size?: number;
  strokeWidth?: number;
  bouncy?: boolean;
}) {
  const center = lerpPt(p1, p2, t);
  const angleDeg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  const offsets = count === 1 ? [0] : [-3.5, 3.5];

  return (
    <g transform={`translate(${center.x}, ${center.y}) rotate(${angleDeg})`}>
      <g className={bouncy ? "animate-pop-elastic" : ""}>
        {offsets.map((ox, i) => (
          <polyline
            key={i}
            points={`${ox - size * 0.7},${-size * 0.75} ${ox + size * 0.5},0 ${ox - size * 0.7},${size * 0.75}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </g>
  );
}

// Extended line through p1 and p2 with an optional right-end arrowhead
function ExtendedLine({
  p1,
  p2,
  extLeft = 28,
  extRight = 32,
  endArrow = true,
  stroke = "#1e293b",
  strokeWidth = 2,
}: {
  p1: Point;
  p2: Point;
  extLeft?: number;
  extRight?: number;
  endArrow?: boolean;
  stroke?: string;
  strokeWidth?: number;
}) {
  const u = unitVec(p1, p2);
  const start = { x: p1.x - u.x * extLeft, y: p1.y - u.y * extLeft };
  const end = { x: p2.x + u.x * extRight, y: p2.y + u.y * extRight };
  const angleDeg = (Math.atan2(u.y, u.x) * 180) / Math.PI;

  return (
    <g>
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {endArrow && (
        <g transform={`translate(${end.x}, ${end.y}) rotate(${angleDeg})`}>
          <polyline
            points="-6,-4 0,0 -6,4"
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth * 0.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </g>
  );
}

// Equal-length tick marks (`|` or `||`) on segment p1->p2
function CongruenceTicks({
  p1,
  p2,
  t = 0.5,
  count = 2,
  color = "#2563eb",
  size = 6,
  strokeWidth = 2.2,
  bouncy = false,
}: {
  p1: Point;
  p2: Point;
  t?: number;
  count?: 1 | 2;
  color?: string;
  size?: number;
  strokeWidth?: number;
  bouncy?: boolean;
}) {
  const center = lerpPt(p1, p2, t);
  const angleDeg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  const offsets = count === 1 ? [0] : [-3, 3];

  return (
    <g transform={`translate(${center.x}, ${center.y}) rotate(${angleDeg})`}>
      <g className={bouncy ? "animate-pop-elastic" : ""}>
        {offsets.map((ox, i) => (
          <line
            key={i}
            x1={ox}
            y1={-size}
            x2={ox}
            y2={size}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ))}
      </g>
    </g>
  );
}

// Angle Dot (`●`) inside vertex v between p1 and p2
function AngleDot({
  v,
  p1,
  p2,
  r = 16,
  color = "#ea580c",
  radius = 4,
}: {
  v: Point;
  p1: Point;
  p2: Point;
  r?: number;
  color?: string;
  radius?: number;
}) {
  const pos = angleMarkerPos(v, p1, p2, r);
  return (
    <g transform={`translate(${pos.x}, ${pos.y})`}>
      <g className="animate-pop-elastic">
        <circle r={radius + 3} fill={color} opacity={0.2} />
        <circle r={radius} fill={color} />
      </g>
    </g>
  );
}

// Angle Cross (`×`) inside vertex v between p1 and p2
function AngleCross({
  v,
  p1,
  p2,
  r = 17,
  color = "#2563eb",
  size = 4.2,
}: {
  v: Point;
  p1: Point;
  p2: Point;
  r?: number;
  color?: string;
  size?: number;
}) {
  const pos = angleMarkerPos(v, p1, p2, r);
  return (
    <g transform={`translate(${pos.x}, ${pos.y})`}>
      <g className="animate-pop-elastic">
        <circle r={size + 3.5} fill={color} opacity={0.15} />
        <line
          x1={-size}
          y1={-size}
          x2={size}
          y2={size}
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <line
          x1={size}
          y1={-size}
          x2={-size}
          y2={size}
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

// Color-coded bouncy ratio curve (Blue for left, Red for right, Green for base)
function RatioCurve({
  p1,
  p2,
  bulge,
  side = 1,
  delayMs = 0,
  color = COLOR_BASE,
}: {
  p1: Point;
  p2: Point;
  bulge: number;
  side?: 1 | -1;
  delayMs?: number;
  color?: string;
}) {
  const d = makeArcPath(p1, p2, bulge, side);
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={6.5}
        strokeLinecap="round"
        opacity={0.16}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        pathLength={100}
        className="curve-stroke-anim"
        style={{ animationDelay: `${delayMs}ms` }}
      />
    </g>
  );
}

// Thin dimension arc with label (and optional animated answer `= val`)
function DimensionArc({
  p1,
  p2,
  bulge,
  side = 1,
  label,
  answer,
  showAnswer = false,
  highlight = false,
  highlightColor = COLOR_BASE,
  labelOffset = 0,
}: {
  p1: Point;
  p2: Point;
  bulge: number;
  side?: 1 | -1;
  label: string;
  answer?: string;
  showAnswer?: boolean;
  highlight?: boolean;
  highlightColor?: string;
  labelOffset?: number;
}) {
  const d = makeArcPath(p1, p2, bulge, side);
  const labelPos = getArcLabelPos(p1, p2, bulge, side, labelOffset);

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={highlight ? highlightColor : "#475569"}
        strokeWidth={highlight ? 2.8 : 1.3}
        className="transition-all duration-300"
      />
      <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
        <rect
          x={showAnswer && answer ? -28 : -13}
          y={-11}
          width={showAnswer && answer ? 56 : 26}
          height={22}
          rx={8}
          fill="#ffffff"
          opacity={0.94}
        />
        {!showAnswer || !answer ? (
          <text
            x={0}
            y={5}
            textAnchor="middle"
            fontSize="15"
            fontWeight="800"
            fill={highlight ? highlightColor : "#0f172a"}
            fontStyle={label === "x" ? "italic" : "normal"}
          >
            {label}
          </text>
        ) : (
          <g className="animate-pop-elastic">
            <text x={0} y={5} textAnchor="middle" fontSize="16" fontWeight="900">
              <tspan fill="#1e293b" fontStyle="italic">
                {label}
              </tspan>
              <tspan fill={highlightColor} fontWeight="900">
                {" "}
                = {answer}
              </tspan>
            </text>
          </g>
        )}
      </g>
    </g>
  );
}

// Brown highlight polygon for similar triangles
function BrownTriangleHighlight({
  pts,
  color = "#b45309",
  delayMs = 0,
}: {
  pts: [Point, Point, Point];
  color?: string;
  delayMs?: number;
}) {
  const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <g className="animate-pop-soft" style={{ animationDelay: `${delayMs}ms` }}>
      <polygon
        points={pointsStr}
        fill={color}
        fillOpacity={0.07}
        stroke={color}
        strokeWidth={6.5}
        strokeLinejoin="round"
        opacity={0.45}
      />
      <polygon
        points={pointsStr}
        fill="none"
        stroke="#92400e"
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// SUB-DIAGRAM 1: A-1 INTERNAL (AB : AD = AC : AE = BC : DE)
// ---------------------------------------------------------------------------
function DiagramA1Internal({
  step,
  exStep,
  onStepChange,
  onExStepChange,
}: {
  step: number; // 0: base, 1: angles, 2: brown triangles, 3: color ratio curves
  exStep: number; // 0: problem, 1: ratio hint, 2: answer x=4
  onStepChange: (s: number) => void;
  onExStepChange: (s: number) => void;
}) {
  const [popOut, setPopOut] = useState(false);

  // Concept triangle coordinates
  const A: Point = { x: 145, y: 42 };
  const B: Point = { x: 65, y: 215 };
  const C: Point = { x: 215, y: 215 };
  const t = 0.52;
  const D = lerpPt(A, B, t);
  const E = lerpPt(A, C, t);

  // Example 1 triangle coordinates (exact 1:2 ratio, AD=3, AB=6, BC=8, DE=x=4)
  const EA: Point = { x: 155, y: 42 };
  const EB: Point = { x: 68, y: 215 };
  const EC: Point = { x: 242, y: 215 };
  const ED = lerpPt(EA, EB, 0.5);
  const EE = lerpPt(EA, EC, 0.5);

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header Formula (Color-coded when step >= 3) */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-lg font-black">★</span>
          <span className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
            평행 <span className="text-indigo-600 mx-0.5">⇒</span>{" "}
            <span style={{ color: step >= 3 ? COLOR_LEFT : undefined }}>
              <span className="overline decoration-2">AB</span> :{" "}
              <span className="overline decoration-2">AD</span>
            </span>{" "}
            ={" "}
            <span style={{ color: step >= 3 ? COLOR_RIGHT : undefined }}>
              <span className="overline decoration-2">AC</span> :{" "}
              <span className="overline decoration-2">AE</span>
            </span>{" "}
            ={" "}
            <span style={{ color: step >= 3 ? COLOR_BASE : undefined }}>
              <span className="overline decoration-2">BC</span> :{" "}
              <span className="overline decoration-2">DE</span>
            </span>
          </span>
        </div>

        {/* Step Controls */}
        <div className="flex items-center gap-1.5">
          {[
            { s: 1, label: "① 동위각" },
            { s: 2, label: "② 닮은 삼각형" },
            { s: 3, label: "③ 길이의 비" },
          ].map((btn) => (
            <button
              key={btn.s}
              onClick={() => onStepChange(step === btn.s ? btn.s - 1 : btn.s)}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                step >= btn.s
                  ? "bg-emerald-600 text-white shadow-xs scale-105"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
          {step >= 2 && (
            <button
              onClick={() => setPopOut(!popOut)}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                popOut
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
              }`}
              title="작은 삼각형 떼어내어 비교"
            >
              {popOut ? "포개기" : "분리 모션"}
            </button>
          )}
        </div>
      </div>

      {/* Two SVG Figures Side-by-Side (Concept Left, Example Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-center">
        {/* LEFT: CONCEPT FIGURE */}
        <div
          onClick={() => onStepChange(step < 3 ? step + 1 : 0)}
          className="relative bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 p-2 cursor-pointer transition-colors"
          title="클릭하면 다음 모션 단계가 진행됩니다"
        >
          <svg viewBox="0 0 280 260" className="w-full h-auto overflow-visible select-none">
            {/* Step 2: Brown Similar Triangles Highlight */}
            {step >= 2 && (
              <>
                <BrownTriangleHighlight pts={[A, B, C]} />
                <g
                  style={{
                    transform: popOut ? "translate(68px, -8px) scale(0.95)" : "translate(0px, 0px)",
                    transition: "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                  <BrownTriangleHighlight pts={[A, D, E]} delayMs={90} />
                  {popOut && (
                    <>
                      <AngleDot v={D} p1={A} p2={E} r={14} color="#ea580c" />
                      <AngleCross v={E} p1={A} p2={D} r={14} color="#2563eb" />
                    </>
                  )}
                </g>
              </>
            )}

            {/* Base Triangle ABC */}
            <polygon
              points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
              fill="none"
              stroke="#1e293b"
              strokeWidth={2.2}
              strokeLinejoin="round"
            />

            {/* Parallel Line DE with Extensions & Parallel Chevrons */}
            <ExtendedLine p1={D} p2={E} extLeft={26} extRight={30} endArrow />
            <ParallelChevron p1={D} p2={E} t={0.52} count={1} />
            <ParallelChevron p1={B} p2={C} t={0.52} count={1} />

            {/* Step 1: Corresponding Angles (Dot & Cross) */}
            {step >= 1 && (
              <>
                <AngleDot v={D} p1={A} p2={E} r={15} color="#ea580c" />
                <AngleDot v={B} p1={A} p2={C} r={17} color="#ea580c" />
                <AngleCross v={E} p1={A} p2={D} r={16} color="#2563eb" />
                <AngleCross v={C} p1={A} p2={B} r={18} color="#2563eb" />
              </>
            )}

            {/* Step 3: Color-coded Ratio Loops (Blue Left, Red Right, Green Bottom) */}
            {step >= 3 && (
              <>
                {/* Left (Blue): AB & AD */}
                <RatioCurve p1={A} p2={B} bulge={48} side={1} delayMs={0} color={COLOR_LEFT} />
                <RatioCurve p1={A} p2={D} bulge={26} side={1} delayMs={80} color={COLOR_LEFT} />
                {/* Right (Red): AC & AE */}
                <RatioCurve p1={A} p2={C} bulge={48} side={-1} delayMs={160} color={COLOR_RIGHT} />
                <RatioCurve p1={A} p2={E} bulge={26} side={-1} delayMs={240} color={COLOR_RIGHT} />
                {/* Bottom (Green, bowing downward with side=1): BC & DE */}
                <RatioCurve p1={B} p2={C} bulge={28} side={1} delayMs={320} color={COLOR_BASE} />
                <RatioCurve p1={D} p2={E} bulge={20} side={1} delayMs={400} color={COLOR_BASE} />
              </>
            )}

            {/* Vertex Labels */}
            <text x={A.x} y={A.y - 10} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              A
            </text>
            <text x={B.x - 14} y={B.y + 6} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              B
            </text>
            <text x={C.x + 14} y={C.y + 6} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              C
            </text>
            <text x={D.x - 13} y={D.y - 6} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              D
            </text>
            <text x={E.x + 13} y={E.y - 6} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              E
            </text>
          </svg>
        </div>

        {/* RIGHT: EXAMPLE 1 (3, 6, 8, x = 4) */}
        <div
          onClick={() => onExStepChange(exStep < 2 ? exStep + 1 : 0)}
          className="relative bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl border border-indigo-200/70 p-2 cursor-pointer transition-colors"
          title="클릭하면 예제 풀이가 나타납니다"
        >
          <div className="absolute top-2.5 right-2.5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExStepChange(exStep < 2 ? exStep + 1 : 0);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                exStep >= 2
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
              }`}
            >
              {exStep === 0 ? "예제 확인" : exStep === 1 ? "정답 보기" : "x = 4 완료"}
            </button>
          </div>

          <svg viewBox="0 0 280 260" className="w-full h-auto overflow-visible select-none">
            {/* Base Triangle */}
            <polygon
              points={`${EA.x},${EA.y} ${EB.x},${EB.y} ${EC.x},${EC.y}`}
              fill="none"
              stroke="#1e293b"
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
            <ExtendedLine p1={ED} p2={EE} extLeft={26} extRight={28} endArrow />
            <ParallelChevron p1={ED} p2={EE} t={0.5} count={1} />
            <ParallelChevron p1={EB} p2={EC} t={0.5} count={1} />

            {/* Dimension Arcs (Blue for Left 3 & 6, Green for Base x & 8 bowing downward with side=1) */}
            <DimensionArc
              p1={EA}
              p2={ED}
              bulge={26}
              side={1}
              label="3"
              highlight={exStep >= 1}
              highlightColor={COLOR_LEFT}
            />
            <DimensionArc
              p1={EA}
              p2={EB}
              bulge={54}
              side={1}
              label="6"
              highlight={exStep >= 1}
              highlightColor={COLOR_LEFT}
            />
            <DimensionArc
              p1={ED}
              p2={EE}
              bulge={22}
              side={1}
              label="x"
              answer="4"
              showAnswer={exStep >= 2}
              highlight={exStep >= 1}
              highlightColor={COLOR_BASE}
            />
            <DimensionArc
              p1={EB}
              p2={EC}
              bulge={28}
              side={1}
              label="8"
              highlight={exStep >= 1}
              highlightColor={COLOR_BASE}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-DIAGRAM 2: A-1 HOURGLASS (AB : AD = AC : AE = BC : DE)
// ---------------------------------------------------------------------------
function DiagramA1Hourglass({
  step,
  exStep,
  onStepChange,
  onExStepChange,
}: {
  step: number;
  exStep: number;
  onStepChange: (s: number) => void;
  onExStepChange: (s: number) => void;
}) {
  const [rotated, setRotated] = useState(false);

  // Concept Hourglass coordinates: A is intersection of BD and CE
  const A: Point = { x: 145, y: 120 };
  const B: Point = { x: 65, y: 218 };
  const C: Point = { x: 205, y: 218 };
  const t = 0.55;
  // D is top-right on extension of BA; E is top-left on extension of CA
  const D: Point = { x: A.x - (B.x - A.x) * t, y: A.y - (B.y - A.y) * t };
  const E: Point = { x: A.x - (C.x - A.x) * t, y: A.y - (C.y - A.y) * t };

  // Example 2 Hourglass coordinates (ED=4, BC=8, AB=10, AD=x=5)
  const EA: Point = { x: 155, y: 118 };
  const EB: Point = { x: 72, y: 218 };
  const EC: Point = { x: 215, y: 218 };
  const et = 0.5;
  const ED: Point = { x: EA.x - (EB.x - EA.x) * et, y: EA.y - (EB.y - EA.y) * et };
  const EE: Point = { x: EA.x - (EC.x - EA.x) * et, y: EA.y - (EC.y - EA.y) * et };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header Formula */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-lg font-black">★</span>
          <span className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
            평행 <span className="text-indigo-600 mx-0.5">⇒</span>{" "}
            <span style={{ color: step >= 3 ? COLOR_LEFT : undefined }}>
              <span className="overline decoration-2">AB</span> :{" "}
              <span className="overline decoration-2">AD</span>
            </span>{" "}
            ={" "}
            <span style={{ color: step >= 3 ? COLOR_RIGHT : undefined }}>
              <span className="overline decoration-2">AC</span> :{" "}
              <span className="overline decoration-2">AE</span>
            </span>{" "}
            ={" "}
            <span style={{ color: step >= 3 ? COLOR_BASE : undefined }}>
              <span className="overline decoration-2">BC</span> :{" "}
              <span className="overline decoration-2">DE</span>
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { s: 1, label: "① 엇각" },
            { s: 2, label: "② 닮은 삼각형" },
            { s: 3, label: "③ 길이의 비" },
          ].map((btn) => (
            <button
              key={btn.s}
              onClick={() => onStepChange(step === btn.s ? btn.s - 1 : btn.s)}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                step >= btn.s
                  ? "bg-emerald-600 text-white shadow-xs scale-105"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
          {step >= 2 && (
            <button
              onClick={() => setRotated(!rotated)}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                rotated
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
              }`}
              title="위쪽 삼각형을 180도 회전해 아래 삼각형과 방향 맞추기"
            >
              {rotated ? "원래대로" : "180° 회전 비교"}
            </button>
          )}
        </div>
      </div>

      {/* Two SVG Figures Side-by-Side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-center">
        {/* LEFT: CONCEPT HOURGLASS */}
        <div
          onClick={() => onStepChange(step < 3 ? step + 1 : 0)}
          className="relative bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 p-2 cursor-pointer transition-colors"
        >
          <svg viewBox="0 0 280 260" className="w-full h-auto overflow-visible select-none">
            {/* Step 2: Brown Similar Triangles */}
            {step >= 2 && (
              <>
                <BrownTriangleHighlight pts={[A, B, C]} />
                <g
                  style={{
                    transformOrigin: `${A.x}px ${A.y}px`,
                    transform: rotated ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                  <BrownTriangleHighlight pts={[A, D, E]} delayMs={90} />
                  {rotated && (
                    <>
                      <AngleDot v={D} p1={A} p2={E} r={14} color="#2563eb" />
                      <AngleCross v={E} p1={A} p2={D} r={14} color="#2563eb" />
                    </>
                  )}
                </g>
              </>
            )}

            {/* Top Parallel Line ED and Bottom BC */}
            <ExtendedLine p1={E} p2={D} extLeft={34} extRight={34} endArrow />
            <ExtendedLine p1={B} p2={C} extLeft={26} extRight={28} endArrow />
            <ParallelChevron p1={E} p2={D} t={0.5} count={1} />
            <ParallelChevron p1={B} p2={C} t={0.5} count={1} />

            {/* Diagonals BD and CE with small top extensions */}
            <ExtendedLine p1={B} p2={D} extLeft={0} extRight={18} endArrow={false} />
            <ExtendedLine p1={C} p2={E} extLeft={0} extRight={18} endArrow={false} />

            {/* Step 1: Alternate Interior Angles (Dot & Cross) */}
            {step >= 1 && (
              <>
                <AngleDot v={D} p1={A} p2={E} r={15} color="#ea580c" />
                <AngleDot v={B} p1={A} p2={C} r={17} color="#ea580c" />
                <AngleCross v={E} p1={A} p2={D} r={15} color="#2563eb" />
                <AngleCross v={C} p1={A} p2={B} r={17} color="#2563eb" />
              </>
            )}

            {/* Step 3: Color-coded Ratio Loops (Blue on BD, Red on CE, Green on BC & ED) */}
            {step >= 3 && (
              <>
                {/* Diagonal BD (Blue): AB & AD */}
                <RatioCurve p1={A} p2={B} bulge={26} side={1} delayMs={0} color={COLOR_LEFT} />
                <RatioCurve p1={D} p2={A} bulge={22} side={1} delayMs={80} color={COLOR_LEFT} />
                {/* Diagonal CE (Red): AC & AE */}
                <RatioCurve p1={A} p2={C} bulge={26} side={-1} delayMs={160} color={COLOR_RIGHT} />
                <RatioCurve p1={E} p2={A} bulge={22} side={-1} delayMs={240} color={COLOR_RIGHT} />
                {/* Parallel Bases (Green): BC (downward) & ED (upward) */}
                <RatioCurve p1={B} p2={C} bulge={28} side={1} delayMs={320} color={COLOR_BASE} />
                <RatioCurve p1={E} p2={D} bulge={22} side={-1} delayMs={400} color={COLOR_BASE} />
              </>
            )}

            {/* Vertex Labels */}
            <text x={E.x - 12} y={E.y + 18} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              E
            </text>
            <text x={D.x + 12} y={D.y + 18} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              D
            </text>
            <text x={A.x} y={A.y + 20} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              A
            </text>
            <text x={B.x - 14} y={B.y + 5} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              B
            </text>
            <text x={C.x + 14} y={C.y + 5} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              C
            </text>
          </svg>
        </div>

        {/* RIGHT: EXAMPLE 2 (4, 8, 10, x = 5) */}
        <div
          onClick={() => onExStepChange(exStep < 2 ? exStep + 1 : 0)}
          className="relative bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl border border-indigo-200/70 p-2 cursor-pointer transition-colors"
        >
          <div className="absolute top-2.5 right-2.5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExStepChange(exStep < 2 ? exStep + 1 : 0);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                exStep >= 2
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
              }`}
            >
              {exStep === 0 ? "예제 확인" : exStep === 1 ? "정답 보기" : "x = 5 완료"}
            </button>
          </div>

          <svg viewBox="0 0 280 260" className="w-full h-auto overflow-visible select-none">
            <ExtendedLine p1={EE} p2={ED} extLeft={34} extRight={34} endArrow />
            <ExtendedLine p1={EB} p2={EC} extLeft={22} extRight={24} endArrow />
            <ParallelChevron p1={EE} p2={ED} t={0.5} count={1} />
            <ParallelChevron p1={EB} p2={EC} t={0.5} count={1} />

            <ExtendedLine p1={EB} p2={ED} extLeft={0} extRight={18} endArrow={false} />
            <ExtendedLine p1={EC} p2={EE} extLeft={0} extRight={18} endArrow={false} />

            {/* Dimension Arcs: Green for parallel bases 4 (upward) & 8 (downward), Blue for diagonal 10 & x */}
            <DimensionArc
              p1={EE}
              p2={ED}
              bulge={24}
              side={-1}
              label="4"
              highlight={exStep >= 1}
              highlightColor={COLOR_BASE}
            />
            <DimensionArc
              p1={EB}
              p2={EC}
              bulge={26}
              side={1}
              label="8"
              highlight={exStep >= 1}
              highlightColor={COLOR_BASE}
            />
            <DimensionArc
              p1={EA}
              p2={EB}
              bulge={26}
              side={-1}
              label="10"
              highlight={exStep >= 1}
              highlightColor={COLOR_LEFT}
            />
            <DimensionArc
              p1={EA}
              p2={ED}
              bulge={26}
              side={1}
              label="x"
              answer="5"
              showAnswer={exStep >= 2}
              highlight={exStep >= 1}
              highlightColor={COLOR_LEFT}
              labelOffset={8}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-DIAGRAM 3: A-2 INTERNAL PARTIAL SIDES (AD : DB = AE : EC)
// ---------------------------------------------------------------------------
function DiagramA2Internal({
  step,
  exStep,
  onStepChange,
  onExStepChange,
}: {
  step: number; // 0: base, 1: aux line EF + slide DB->EF, 2: angles & brown triangles, 3: color snowman loops
  exStep: number; // 0: problem, 1: ratio hint, 2: x=3
  onStepChange: (s: number) => void;
  onExStepChange: (s: number) => void;
}) {
  // Concept triangle coordinates
  const A: Point = { x: 145, y: 42 };
  const B: Point = { x: 65, y: 215 };
  const C: Point = { x: 215, y: 215 };
  const t = 0.54;
  const D = lerpPt(A, B, t);
  const E = lerpPt(A, C, t);
  // F on BC such that EF || AB => vector EF = vector DB
  const F: Point = { x: E.x + (B.x - D.x), y: E.y + (B.y - D.y) };

  // Example 3 coordinates (10, 5, 6, x=3 => 2:1 ratio)
  const EA: Point = { x: 175, y: 46 };
  const EB: Point = { x: 52, y: 215 };
  const EC: Point = { x: 232, y: 215 };
  const et = 2 / 3;
  const ED = lerpPt(EA, EB, et);
  const EE = lerpPt(EA, EC, et);

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header Formula */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-lg font-black">★</span>
          <span className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
            평행 <span className="text-indigo-600 mx-0.5">⇒</span>{" "}
            <span style={{ color: step >= 3 ? COLOR_LEFT : undefined }}>
              <span className="overline decoration-2">AD</span> :{" "}
              <span className="overline decoration-2">DB</span>
            </span>{" "}
            ={" "}
            <span style={{ color: step >= 3 ? COLOR_RIGHT : undefined }}>
              <span className="overline decoration-2">AE</span> :{" "}
              <span className="overline decoration-2">EC</span>
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { s: 1, label: "① 보조선·평행이동" },
            { s: 2, label: "② 동위각·삼각형" },
            { s: 3, label: "③ 길이의 비" },
          ].map((btn) => (
            <button
              key={btn.s}
              onClick={() => onStepChange(step === btn.s ? btn.s - 1 : btn.s)}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                step >= btn.s
                  ? "bg-emerald-600 text-white shadow-xs scale-105"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-center">
        {/* LEFT: CONCEPT FIGURE */}
        <div
          onClick={() => onStepChange(step < 3 ? step + 1 : 0)}
          className="relative bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 p-2 cursor-pointer transition-colors"
        >
          <svg viewBox="0 0 280 260" className="w-full h-auto overflow-visible select-none">
            {/* Step 1: Parallelogram DBFE subtle fill */}
            {step >= 1 && (
              <polygon
                points={`${D.x},${D.y} ${B.x},${B.y} ${F.x},${F.y} ${E.x},${E.y}`}
                fill="#dbeafe"
                fillOpacity={0.45}
                className="animate-fade-in"
              />
            )}

            {/* Step 2: Brown Similar Triangles ADE and EFC */}
            {step >= 2 && (
              <>
                <BrownTriangleHighlight pts={[A, D, E]} />
                <BrownTriangleHighlight pts={[E, F, C]} delayMs={100} />
              </>
            )}

            {/* Base Triangle ABC */}
            <polygon
              points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
              fill="none"
              stroke="#1e293b"
              strokeWidth={2.2}
              strokeLinejoin="round"
            />

            {/* Parallel Line DE & BC */}
            <ExtendedLine p1={D} p2={E} extLeft={26} extRight={30} endArrow />
            <ParallelChevron p1={D} p2={E} t={0.46} count={1} />
            <ParallelChevron p1={B} p2={C} t={0.42} count={1} />

            {/* Auxiliary Line EF || AB */}
            <line
              x1={E.x}
              y1={E.y}
              x2={F.x}
              y2={F.y}
              stroke={step >= 1 ? "#1e293b" : "#94a3b8"}
              strokeWidth={step >= 1 ? 2.2 : 1.5}
              strokeDasharray={step >= 1 ? "none" : "4 3"}
            />
            <ParallelChevron p1={D} p2={B} t={0.48} count={1} />
            <ParallelChevron p1={E} p2={F} t={0.48} count={1} />

            {/* Step 1: Sliding segment DB -> EF & Blue Congruence Marks (`=`) */}
            {step >= 1 && (
              <>
                <line
                  x1={D.x}
                  y1={D.y}
                  x2={B.x}
                  y2={B.y}
                  stroke="#2563eb"
                  strokeWidth={4}
                  strokeLinecap="round"
                  className="slide-db-to-ef"
                  style={
                    {
                      "--dx": `${E.x - D.x}px`,
                      "--dy": `${E.y - D.y}px`,
                    } as React.CSSProperties
                  }
                />
                <CongruenceTicks p1={D} p2={B} t={0.72} count={2} color="#2563eb" bouncy />
                <CongruenceTicks p1={E} p2={F} t={0.72} count={2} color="#2563eb" bouncy />
              </>
            )}

            {/* Step 2: Corresponding Angles on ADE and EFC (Cross at A & E, Dot at E & C) */}
            {step >= 2 && (
              <>
                <AngleCross v={A} p1={D} p2={E} r={19} color="#2563eb" />
                <AngleCross v={E} p1={F} p2={C} r={19} color="#2563eb" />
                <AngleDot v={E} p1={A} p2={D} r={15} color="#ea580c" />
                <AngleDot v={C} p1={E} p2={F} r={17} color="#ea580c" />
              </>
            )}

            {/* Step 3: Color-coded Snowman Loops (Blue Left AD:DB, Red Right AE:EC) */}
            {step >= 3 && (
              <>
                <RatioCurve p1={A} p2={D} bulge={26} side={1} delayMs={0} color={COLOR_LEFT} />
                <RatioCurve p1={D} p2={B} bulge={24} side={1} delayMs={90} color={COLOR_LEFT} />
                <RatioCurve p1={A} p2={E} bulge={26} side={-1} delayMs={180} color={COLOR_RIGHT} />
                <RatioCurve p1={E} p2={C} bulge={24} side={-1} delayMs={270} color={COLOR_RIGHT} />
              </>
            )}

            {/* Vertex Labels */}
            <text x={A.x} y={A.y - 10} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              A
            </text>
            <text x={B.x - 14} y={B.y + 6} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              B
            </text>
            <text x={C.x + 14} y={C.y + 6} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              C
            </text>
            <text x={D.x - 13} y={D.y - 6} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              D
            </text>
            <text x={E.x + 13} y={E.y - 6} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              E
            </text>
            <text x={F.x} y={F.y + 18} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              F
            </text>
          </svg>
        </div>

        {/* RIGHT: EXAMPLE 3 (10, 5, 6, x = 3) */}
        <div
          onClick={() => onExStepChange(exStep < 2 ? exStep + 1 : 0)}
          className="relative bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl border border-indigo-200/70 p-2 cursor-pointer transition-colors"
        >
          <div className="absolute top-2.5 right-2.5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExStepChange(exStep < 2 ? exStep + 1 : 0);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                exStep >= 2
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
              }`}
            >
              {exStep === 0 ? "예제 확인" : exStep === 1 ? "정답 보기" : "x = 3 완료"}
            </button>
          </div>

          <svg viewBox="0 0 280 260" className="w-full h-auto overflow-visible select-none">
            <polygon
              points={`${EA.x},${EA.y} ${EB.x},${EB.y} ${EC.x},${EC.y}`}
              fill="none"
              stroke="#1e293b"
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
            <ExtendedLine p1={ED} p2={EE} extLeft={34} extRight={22} endArrow />
            <ParallelChevron p1={ED} p2={EE} t={0.5} count={1} />
            <ParallelChevron p1={EB} p2={EC} t={0.5} count={1} />

            {/* Dimension Arcs (Blue for Left 10 & 5, Red for Right 6 & x) */}
            <DimensionArc
              p1={EA}
              p2={ED}
              bulge={28}
              side={1}
              label="10"
              highlight={exStep >= 1}
              highlightColor={COLOR_LEFT}
            />
            <DimensionArc
              p1={ED}
              p2={EB}
              bulge={22}
              side={1}
              label="5"
              highlight={exStep >= 1}
              highlightColor={COLOR_LEFT}
            />
            <DimensionArc
              p1={EA}
              p2={EE}
              bulge={24}
              side={-1}
              label="6"
              highlight={exStep >= 1}
              highlightColor={COLOR_RIGHT}
            />
            <DimensionArc
              p1={EE}
              p2={EC}
              bulge={20}
              side={-1}
              label="x"
              answer="3"
              showAnswer={exStep >= 2}
              highlight={exStep >= 1}
              highlightColor={COLOR_RIGHT}
              labelOffset={6}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-DIAGRAM 4: A-2 HOURGLASS PARTIAL SIDES (AD : DB = AE : EC)
// ---------------------------------------------------------------------------
function DiagramA2Hourglass({
  step,
  exStep,
  onStepChange,
  onExStepChange,
}: {
  step: number;
  exStep: number;
  onStepChange: (s: number) => void;
  onExStepChange: (s: number) => void;
}) {
  // Concept Hourglass with auxiliary line DF || EC (F on BC extension)
  const A: Point = { x: 118, y: 118 };
  const B: Point = { x: 42, y: 218 };
  const C: Point = { x: 162, y: 218 };
  const t = 0.52;
  const D: Point = { x: A.x - (B.x - A.x) * t, y: A.y - (B.y - A.y) * t };
  const E: Point = { x: A.x - (C.x - A.x) * t, y: A.y - (C.y - A.y) * t };
  // F on horizontal line y=218 such that DF || EC => vector DF = vector EC
  const F: Point = { x: D.x + (C.x - E.x), y: C.y };

  // Example 4 coordinates (3, 4, 9, x=12)
  const EA: Point = { x: 162, y: 102 };
  const EB: Point = { x: 65, y: 218 };
  const EC: Point = { x: 215, y: 218 };
  const et = 0.36;
  const ED: Point = { x: EA.x - (EB.x - EA.x) * et, y: EA.y - (EB.y - EA.y) * et };
  const EE: Point = { x: EA.x - (EC.x - EA.x) * et, y: EA.y - (EC.y - EA.y) * et };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header Formula */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-lg font-black">★</span>
          <span className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
            평행 <span className="text-indigo-600 mx-0.5">⇒</span>{" "}
            <span style={{ color: step >= 3 ? COLOR_LEFT : undefined }}>
              <span className="overline decoration-2">AD</span> :{" "}
              <span className="overline decoration-2">DB</span>
            </span>{" "}
            ={" "}
            <span style={{ color: step >= 3 ? COLOR_RIGHT : undefined }}>
              <span className="overline decoration-2">AE</span> :{" "}
              <span className="overline decoration-2">EC</span>
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { s: 1, label: "① 보조선·평행이동" },
            { s: 2, label: "② 각·삼각형" },
            { s: 3, label: "③ 길이의 비" },
          ].map((btn) => (
            <button
              key={btn.s}
              onClick={() => onStepChange(step === btn.s ? btn.s - 1 : btn.s)}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                step >= btn.s
                  ? "bg-emerald-600 text-white shadow-xs scale-105"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-center">
        {/* LEFT: CONCEPT HOURGLASS WITH AUXILIARY DF */}
        <div
          onClick={() => onStepChange(step < 3 ? step + 1 : 0)}
          className="relative bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 p-2 cursor-pointer transition-colors"
        >
          <svg viewBox="0 0 280 260" className="w-full h-auto overflow-visible select-none">
            {/* Step 1: Parallelogram ECDF subtle fill */}
            {step >= 1 && (
              <polygon
                points={`${E.x},${E.y} ${C.x},${C.y} ${F.x},${F.y} ${D.x},${D.y}`}
                fill="#dbeafe"
                fillOpacity={0.4}
                className="animate-fade-in"
              />
            )}

            {/* Step 2: Brown Highlight matching Photo 2 */}
            {step >= 2 && (
              <>
                <BrownTriangleHighlight pts={[A, B, C]} />
                <BrownTriangleHighlight pts={[D, B, F]} delayMs={90} />
              </>
            )}

            {/* Parallel Lines ED and BC */}
            <ExtendedLine p1={E} p2={D} extLeft={28} extRight={24} endArrow />
            <ExtendedLine p1={B} p2={C} extLeft={12} extRight={8} endArrow />
            <ParallelChevron p1={E} p2={D} t={0.45} count={1} />
            <ParallelChevron p1={B} p2={C} t={0.48} count={1} />

            {/* Dashed extension C -> F and Auxiliary Line DF || EC */}
            <line
              x1={C.x}
              y1={C.y}
              x2={F.x + 14}
              y2={F.y}
              stroke="#475569"
              strokeWidth={1.6}
              strokeDasharray="4 4"
            />
            <line
              x1={D.x}
              y1={D.y}
              x2={F.x}
              y2={F.y}
              stroke="#1e293b"
              strokeWidth={2}
            />

            {/* Diagonals BD and CE */}
            <ExtendedLine p1={B} p2={D} extLeft={0} extRight={16} endArrow={false} />
            <ExtendedLine p1={C} p2={E} extLeft={0} extRight={16} endArrow={false} />

            {/* Parallel chevrons on AC and DF */}
            <ParallelChevron p1={A} p2={C} t={0.55} count={1} />
            <ParallelChevron p1={D} p2={F} t={0.52} count={1} />

            {/* Step 1: Sliding EC -> DF & Congruence Marks */}
            {step >= 1 && (
              <>
                <line
                  x1={E.x}
                  y1={E.y}
                  x2={C.x}
                  y2={C.y}
                  stroke="#2563eb"
                  strokeWidth={3.8}
                  strokeLinecap="round"
                  className="slide-db-to-ef"
                  style={
                    {
                      "--dx": `${D.x - E.x}px`,
                      "--dy": `${D.y - E.y}px`,
                    } as React.CSSProperties
                  }
                />
                <CongruenceTicks p1={A} p2={C} t={0.35} count={2} color="#2563eb" bouncy />
                <CongruenceTicks p1={D} p2={F} t={0.68} count={2} color="#2563eb" bouncy />
              </>
            )}

            {/* Step 2: Angles matching Photo 2 */}
            {step >= 2 && (
              <>
                <AngleDot v={D} p1={E} p2={A} r={15} color="#ea580c" />
                <AngleDot v={B} p1={D} p2={C} r={17} color="#ea580c" />
                <AngleCross v={E} p1={D} p2={A} r={14} color="#2563eb" />
                <AngleCross v={C} p1={A} p2={B} r={16} color="#2563eb" />
                <AngleCross v={F} p1={D} p2={B} r={16} color="#2563eb" />
              </>
            )}

            {/* Step 3: Color-coded Ratio Loops (Blue on BD, Red on EC) */}
            {step >= 3 && (
              <>
                <RatioCurve p1={D} p2={A} bulge={20} side={1} delayMs={0} color={COLOR_LEFT} />
                <RatioCurve p1={D} p2={B} bulge={42} side={1} delayMs={90} color={COLOR_LEFT} />
                <RatioCurve p1={E} p2={A} bulge={20} side={-1} delayMs={180} color={COLOR_RIGHT} />
                <RatioCurve p1={E} p2={C} bulge={42} side={-1} delayMs={270} color={COLOR_RIGHT} />
              </>
            )}

            {/* Vertex Labels */}
            <text x={E.x - 12} y={E.y + 18} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              E
            </text>
            <text x={D.x - 2} y={D.y + 19} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              D
            </text>
            <text x={A.x} y={A.y + 20} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
              A
            </text>
            <text x={B.x - 12} y={B.y + 5} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              B
            </text>
            <text x={C.x} y={C.y + 18} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              C
            </text>
            <text x={F.x + 2} y={F.y + 18} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
              F
            </text>
          </svg>
        </div>

        {/* RIGHT: EXAMPLE 4 (3, 4, 9, x = 12) */}
        <div
          onClick={() => onExStepChange(exStep < 2 ? exStep + 1 : 0)}
          className="relative bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl border border-indigo-200/70 p-2 cursor-pointer transition-colors"
        >
          <div className="absolute top-2.5 right-2.5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExStepChange(exStep < 2 ? exStep + 1 : 0);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                exStep >= 2
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
              }`}
            >
              {exStep === 0 ? "예제 확인" : exStep === 1 ? "정답 보기" : "x = 12 완료"}
            </button>
          </div>

          <svg viewBox="0 0 280 260" className="w-full h-auto overflow-visible select-none">
            <ExtendedLine p1={EE} p2={ED} extLeft={42} extRight={38} endArrow />
            <ExtendedLine p1={EB} p2={EC} extLeft={14} extRight={14} endArrow={false} />
            <ParallelChevron p1={EE} p2={ED} t={0.5} count={1} />
            <ParallelChevron p1={EB} p2={EC} t={0.5} count={1} />

            <ExtendedLine p1={EB} p2={ED} extLeft={0} extRight={18} endArrow={false} />
            <ExtendedLine p1={EC} p2={EE} extLeft={0} extRight={18} endArrow={false} />

            {/* Dimension Arcs (Red for 3 & 9 on EC, Blue for 4 & x=12 on BD) */}
            <DimensionArc
              p1={EE}
              p2={EA}
              bulge={18}
              side={-1}
              label="3"
              highlight={exStep >= 1}
              highlightColor={COLOR_RIGHT}
            />
            <DimensionArc
              p1={EA}
              p2={ED}
              bulge={18}
              side={-1}
              label="4"
              highlight={exStep >= 1}
              highlightColor={COLOR_LEFT}
            />
            <DimensionArc
              p1={EE}
              p2={EC}
              bulge={44}
              side={1}
              label="9"
              highlight={exStep >= 1}
              highlightColor={COLOR_RIGHT}
            />
            <DimensionArc
              p1={ED}
              p2={EB}
              bulge={42}
              side={1}
              label="x"
              answer="12"
              showAnswer={exStep >= 2}
              highlight={exStep >= 1}
              highlightColor={COLOR_LEFT}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-DIAGRAM 5: SECTION B (선분 길이의 비 일정 ⇒ 평행)
// ---------------------------------------------------------------------------
function DiagramSectionB({
  step,
  exStep,
  onStepChange,
  onExStepChange,
}: {
  step: number; // 0: ratio curves only, 1: green parallel lines & chevrons pop in!
  exStep: number; // 0: problem, 1: parallel mark, 2: y=60, 3: x=14
  onStepChange: (s: number) => void;
  onExStepChange: (s: number) => void;
}) {
  // Left concept figure
  const A1: Point = { x: 72, y: 36 };
  const B1: Point = { x: 24, y: 175 };
  const C1: Point = { x: 118, y: 175 };
  const D1 = lerpPt(A1, B1, 0.55);
  const E1 = lerpPt(A1, C1, 0.55);

  // Right concept figure
  const A2: Point = { x: 208, y: 36 };
  const B2: Point = { x: 160, y: 175 };
  const C2: Point = { x: 254, y: 175 };
  const D2 = lerpPt(A2, B2, 0.55);
  const E2 = lerpPt(A2, C2, 0.55);

  // Bottom Example 5 figure (y°=60°, DE=7, BC=x=14)
  const EA: Point = { x: 145, y: 24 };
  const EB: Point = { x: 64, y: 180 };
  const EC: Point = { x: 232, y: 180 };
  const ED = lerpPt(EA, EB, 0.5);
  const EE = lerpPt(EA, EC, 0.5);

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between h-full">
      {/* Header Formulas */}
      <div className="pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500 text-lg font-black">★</span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              <span style={{ color: COLOR_LEFT }}>
                <span className="overline decoration-2">AB</span> :{" "}
                <span className="overline decoration-2">AD</span>
              </span>{" "}
              ={" "}
              <span style={{ color: COLOR_RIGHT }}>
                <span className="overline decoration-2">AC</span> :{" "}
                <span className="overline decoration-2">AE</span>
              </span>{" "}
              <span className="text-emerald-600 mx-0.5">⇒</span>{" "}
              <span className="text-emerald-700">평행</span>
            </span>
          </div>
          <button
            onClick={() => onStepChange(step === 0 ? 1 : 0)}
            className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              step >= 1
                ? "bg-emerald-600 text-white shadow-xs scale-105"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {step >= 1 ? "✅ 평행 표시 완료" : "▶ 평행 기호 켜기"}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-500 text-lg font-black">★</span>
          <span className="text-base sm:text-lg font-black text-slate-900">
            <span style={{ color: COLOR_LEFT }}>
              <span className="overline decoration-2">AD</span> :{" "}
              <span className="overline decoration-2">DB</span>
            </span>{" "}
            ={" "}
            <span style={{ color: COLOR_RIGHT }}>
              <span className="overline decoration-2">AE</span> :{" "}
              <span className="overline decoration-2">EC</span>
            </span>{" "}
            <span className="text-emerald-600 mx-0.5">⇒</span>{" "}
            <span className="text-emerald-700">평행</span>
          </span>
        </div>
      </div>

      {/* Top Concept Diagrams (2 Triangles) */}
      <div
        onClick={() => onStepChange(step === 0 ? 1 : 0)}
        className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 p-2 mb-3 cursor-pointer transition-colors"
      >
        <svg viewBox="0 0 280 198" className="w-full h-auto overflow-visible select-none">
          {/* LEFT TRIANGLE: AB:AD = AC:AE */}
          <polygon
            points={`${A1.x},${A1.y} ${B1.x},${B1.y} ${C1.x},${C1.y}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth={2}
          />
          <ExtendedLine p1={D1} p2={E1} extLeft={18} extRight={20} endArrow />
          {/* Color-coded ratio arcs (Blue Left, Red Right) */}
          <path d={makeArcPath(A1, D1, 18, 1)} fill="none" stroke={COLOR_LEFT} strokeWidth={1.8} />
          <path d={makeArcPath(A1, B1, 34, 1)} fill="none" stroke={COLOR_LEFT} strokeWidth={1.8} />
          <path d={makeArcPath(A1, E1, 18, -1)} fill="none" stroke={COLOR_RIGHT} strokeWidth={1.8} />
          <path d={makeArcPath(A1, C1, 34, -1)} fill="none" stroke={COLOR_RIGHT} strokeWidth={1.8} />

          {/* Green Parallel Highlight on Step 1 */}
          {step >= 1 && (
            <g>
              <line
                x1={D1.x}
                y1={D1.y}
                x2={E1.x}
                y2={E1.y}
                stroke={COLOR_BASE}
                strokeWidth={4.5}
                strokeLinecap="round"
              />
              <line
                x1={B1.x}
                y1={B1.y}
                x2={C1.x}
                y2={C1.y}
                stroke={COLOR_BASE}
                strokeWidth={4.5}
                strokeLinecap="round"
              />
              <ParallelChevron p1={D1} p2={E1} t={0.52} count={1} color={COLOR_BASE} size={9} strokeWidth={3.2} bouncy />
              <ParallelChevron p1={B1} p2={C1} t={0.52} count={1} color={COLOR_BASE} size={9} strokeWidth={3.2} bouncy />
            </g>
          )}

          <text x={A1.x} y={A1.y - 8} textAnchor="middle" fontSize="13" fontWeight="800" fill="#0f172a">A</text>
          <text x={B1.x - 10} y={B1.y + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#0f172a">B</text>
          <text x={C1.x + 10} y={C1.y + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#0f172a">C</text>
          <text x={D1.x - 10} y={D1.y - 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0f172a">D</text>
          <text x={E1.x + 10} y={E1.y - 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0f172a">E</text>

          {/* RIGHT TRIANGLE: AD:DB = AE:EC */}
          <polygon
            points={`${A2.x},${A2.y} ${B2.x},${B2.y} ${C2.x},${C2.y}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth={2}
          />
          <ExtendedLine p1={D2} p2={E2} extLeft={18} extRight={20} endArrow />
          {/* Color-coded ratio arcs (Blue Left, Red Right) */}
          <path d={makeArcPath(A2, D2, 18, 1)} fill="none" stroke={COLOR_LEFT} strokeWidth={1.8} />
          <path d={makeArcPath(D2, B2, 16, 1)} fill="none" stroke={COLOR_LEFT} strokeWidth={1.8} />
          <path d={makeArcPath(A2, E2, 18, -1)} fill="none" stroke={COLOR_RIGHT} strokeWidth={1.8} />
          <path d={makeArcPath(E2, C2, 16, -1)} fill="none" stroke={COLOR_RIGHT} strokeWidth={1.8} />

          {/* Green Parallel Highlight on Step 1 */}
          {step >= 1 && (
            <g>
              <line
                x1={D2.x}
                y1={D2.y}
                x2={E2.x}
                y2={E2.y}
                stroke={COLOR_BASE}
                strokeWidth={4.5}
                strokeLinecap="round"
              />
              <line
                x1={B2.x}
                y1={B2.y}
                x2={C2.x}
                y2={C2.y}
                stroke={COLOR_BASE}
                strokeWidth={4.5}
                strokeLinecap="round"
              />
              <ParallelChevron p1={D2} p2={E2} t={0.52} count={1} color={COLOR_BASE} size={9} strokeWidth={3.2} bouncy />
              <ParallelChevron p1={B2} p2={C2} t={0.52} count={1} color={COLOR_BASE} size={9} strokeWidth={3.2} bouncy />
            </g>
          )}

          <text x={A2.x} y={A2.y - 8} textAnchor="middle" fontSize="13" fontWeight="800" fill="#0f172a">A</text>
          <text x={B2.x - 10} y={B2.y + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#0f172a">B</text>
          <text x={C2.x + 10} y={C2.y + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#0f172a">C</text>
          <text x={D2.x - 10} y={D2.y - 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0f172a">D</text>
          <text x={E2.x + 10} y={E1.y - 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0f172a">E</text>
        </svg>
      </div>

      {/* Bottom Example 5 (y° = 60°, x = 14) */}
      <div
        onClick={() => onExStepChange(exStep < 3 ? exStep + 1 : 0)}
        className="relative bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl border border-indigo-200/70 p-2 cursor-pointer transition-colors"
      >
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-xs font-extrabold text-indigo-900">예제 탐구</span>
          <div className="flex items-center gap-1">
            {[
              { s: 1, label: "① 평행" },
              { s: 2, label: "② y°=60°" },
              { s: 3, label: "③ x=14" },
            ].map((b) => (
              <button
                key={b.s}
                onClick={(e) => {
                  e.stopPropagation();
                  onExStepChange(exStep === b.s ? b.s - 1 : b.s);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  exStep >= b.s
                    ? "bg-blue-600 text-white"
                    : "bg-white text-indigo-700 border border-indigo-200"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 280 225" className="w-full h-auto overflow-visible select-none">
          <polygon
            points={`${EA.x},${EA.y} ${EB.x},${EB.y} ${EC.x},${EC.y}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <ExtendedLine p1={ED} p2={EE} extLeft={26} extRight={28} endArrow />

          {/* Equal-length tick marks on AD, DB (Blue 1 tick) and AE, EC (Red 2 ticks) */}
          <CongruenceTicks p1={EA} p2={ED} t={0.5} count={1} color={COLOR_LEFT} size={5.5} />
          <CongruenceTicks p1={ED} p2={EB} t={0.5} count={1} color={COLOR_LEFT} size={5.5} />
          <CongruenceTicks p1={EA} p2={EE} t={0.5} count={2} color={COLOR_RIGHT} size={5.5} />
          <CongruenceTicks p1={EE} p2={EC} t={0.5} count={2} color={COLOR_RIGHT} size={5.5} />

          {/* Step 1: Parallel Chevrons pop onto DE and BC */}
          {exStep >= 1 && (
            <g>
              <ParallelChevron p1={ED} p2={EE} t={0.62} count={1} color={COLOR_BASE} size={8} strokeWidth={3} bouncy />
              <ParallelChevron p1={EB} p2={EC} t={0.62} count={1} color={COLOR_BASE} size={8} strokeWidth={3} bouncy />
            </g>
          )}

          {/* Angle 60° at B and y° at D */}
          <text x={EB.x + 26} y={EB.y - 8} fontSize="14" fontWeight="800" fill="#0f172a">
            60°
          </text>
          {exStep < 2 ? (
            <text x={ED.x + 24} y={ED.y - 7} fontSize="14" fontWeight="800" fill="#0f172a" fontStyle="italic">
              y°
            </text>
          ) : (
            <g transform={`translate(${ED.x + 38}, ${ED.y - 7})`}>
              <g className="animate-pop-elastic">
                <text x={0} y={0} textAnchor="middle" fontSize="14" fontWeight="900">
                  <tspan fill="#0f172a" fontStyle="italic">y°</tspan>
                  <tspan fill="#2563eb"> = 60°</tspan>
                </text>
              </g>
            </g>
          )}

          {/* Dimension Arcs for DE=7 and BC=x=14 (bowing downward with side=1) */}
          <DimensionArc
            p1={ED}
            p2={EE}
            bulge={20}
            side={1}
            label="7"
            highlight={exStep >= 3}
            highlightColor={COLOR_BASE}
          />
          <DimensionArc
            p1={EB}
            p2={EC}
            bulge={26}
            side={1}
            label="x"
            answer="14"
            showAnswer={exStep >= 3}
            highlight={exStep >= 3}
            highlightColor={COLOR_BASE}
          />
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// INTERACTIVE DRAG LAB: CONTINUOUS PARALLEL LINE DRAGGING (INTERNAL <-> HOURGLASS)
// ---------------------------------------------------------------------------
function InteractiveDragLab() {
  const [t, setT] = useState<number>(0.5);
  const [ratioMode, setRatioMode] = useState<"whole" | "part">("whole");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef(false);

  const A: Point = { x: 320, y: 155 };
  const B: Point = { x: 160, y: 385 };
  const C: Point = { x: 470, y: 385 };

  const D = lerpPt(A, B, t);
  const E = lerpPt(A, C, t);

  const absT = Math.abs(t);
  const isHourglass = t < 0;

  const lenAB = 10;
  const lenAC = 12;
  const lenBC = 14;
  const lenAD = +(lenAB * absT).toFixed(1);
  const lenAE = +(lenAC * absT).toFixed(1);
  const lenDE = +(lenBC * absT).toFixed(1);
  const lenDB = +(isHourglass ? lenAB + lenAD : lenAB - lenAD).toFixed(1);
  const lenEC = +(isHourglass ? lenAC + lenAE : lenAC - lenAE).toFixed(1);

  const updateTFromClientY = useCallback((clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgY = ((clientY - rect.top) / rect.height) * 440;
    let rawT = (svgY - A.y) / (B.y - A.y);
    if (rawT >= 0 && rawT < 0.18) rawT = 0.18;
    if (rawT < 0 && rawT > -0.18) rawT = -0.18;
    rawT = Math.max(-0.75, Math.min(0.88, rawT));
    for (const snap of [-0.5, 0.25, 0.5, 0.75]) {
      if (Math.abs(rawT - snap) < 0.03) {
        rawT = snap;
        break;
      }
    }
    setT(Math.round(rawT * 100) / 100);
  }, [A.y, B.y]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      updateTFromClientY(e.clientY);
    };
    const onUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateTFromClientY]);

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      {/* LEFT 7 COLS: INTERACTIVE DRAG SVG */}
      <div className="lg:col-span-7 bg-slate-50 rounded-3xl border border-slate-200 p-4 relative select-none">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-600 text-white">
              {isHourglass ? "⏳ 모래시계형 (위쪽 연장선)" : "📐 기본 삼각형 내부"}
            </span>
            <span className="text-xs font-bold text-slate-500">
              평행선 DE를 위·아래로 드래그해보세요!
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setT(0.5)}
              className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                t === 0.5 ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              내부 1:2
            </button>
            <button
              onClick={() => setT(-0.5)}
              className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                t === -0.5 ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              모래시계 1:2
            </button>
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 640 440"
          className="w-full h-auto overflow-visible cursor-ns-resize"
          onMouseDown={(e) => {
            isDraggingRef.current = true;
            updateTFromClientY(e.clientY);
          }}
        >
          {/* Extended side lines above A for hourglass */}
          <line
            x1={B.x}
            y1={B.y}
            x2={A.x - (B.x - A.x) * 0.85}
            y2={A.y - (B.y - A.y) * 0.85}
            stroke="#cbd5e1"
            strokeWidth={2}
            strokeDasharray="6 6"
          />
          <line
            x1={C.x}
            y1={C.y}
            x2={A.x - (C.x - A.x) * 0.85}
            y2={A.y - (C.y - A.y) * 0.85}
            stroke="#cbd5e1"
            strokeWidth={2}
            strokeDasharray="6 6"
          />

          {/* Similar Triangles Fill */}
          <polygon
            points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
            fill="#f1f5f9"
            stroke="#1e293b"
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <polygon
            points={`${A.x},${A.y} ${D.x},${D.y} ${E.x},${E.y}`}
            fill="#fef3c7"
            fillOpacity={0.65}
            stroke="#b45309"
            strokeWidth={3.5}
            strokeLinejoin="round"
          />

          {/* Base BC parallel chevron */}
          <ExtendedLine p1={B} p2={C} extLeft={40} extRight={45} endArrow />
          <ParallelChevron p1={B} p2={C} t={0.5} count={1} color={COLOR_BASE} size={9} strokeWidth={3} />

          {/* Draggable Parallel Line DE */}
          <ExtendedLine
            p1={isHourglass ? E : D}
            p2={isHourglass ? D : E}
            extLeft={55}
            extRight={55}
            endArrow
            stroke={COLOR_BASE}
            strokeWidth={3.5}
          />
          <ParallelChevron
            p1={isHourglass ? E : D}
            p2={isHourglass ? D : E}
            t={0.5}
            count={1}
            color={COLOR_BASE}
            size={9}
            strokeWidth={3}
          />

          {/* Angles */}
          <AngleDot v={D} p1={A} p2={E} r={20} color="#ea580c" radius={5} />
          <AngleDot v={B} p1={A} p2={C} r={22} color="#ea580c" radius={5} />
          <AngleCross v={E} p1={A} p2={D} r={20} color="#2563eb" size={5} />
          <AngleCross v={C} p1={A} p2={B} r={22} color="#2563eb" size={5} />

          {/* Color-coded Ratio Curves based on selected mode */}
          {ratioMode === "whole" ? (
            <>
              <RatioCurve p1={A} p2={B} bulge={58} side={1} color={COLOR_LEFT} />
              <RatioCurve p1={A} p2={D} bulge={30} side={1} color={COLOR_LEFT} />
              <RatioCurve p1={A} p2={C} bulge={58} side={-1} color={COLOR_RIGHT} />
              <RatioCurve p1={A} p2={E} bulge={30} side={-1} color={COLOR_RIGHT} />
              <RatioCurve p1={B} p2={C} bulge={32} side={1} color={COLOR_BASE} />
              <RatioCurve
                p1={isHourglass ? E : D}
                p2={isHourglass ? D : E}
                bulge={24}
                side={isHourglass ? -1 : 1}
                color={COLOR_BASE}
              />
            </>
          ) : (
            <>
              <RatioCurve p1={A} p2={D} bulge={30} side={1} color={COLOR_LEFT} />
              <RatioCurve p1={D} p2={B} bulge={30} side={1} color={COLOR_LEFT} />
              <RatioCurve p1={A} p2={E} bulge={30} side={-1} color={COLOR_RIGHT} />
              <RatioCurve p1={E} p2={C} bulge={30} side={-1} color={COLOR_RIGHT} />
            </>
          )}

          {/* Drag Handle Pill on DE */}
          <g transform={`translate(${(D.x + E.x) / 2}, ${D.y})`}>
            <rect
              x={-44}
              y={-15}
              width={88}
              height={30}
              rx={15}
              fill={COLOR_BASE}
              stroke="#ffffff"
              strokeWidth={2.5}
            />
            <text x={0} y={5} textAnchor="middle" fontSize="12" fontWeight="900" fill="#ffffff">
              ↕ 드래그
            </text>
          </g>

          {/* Vertex Points & Labels */}
          <circle cx={D.x} cy={D.y} r={6} fill={COLOR_LEFT} stroke="#fff" strokeWidth={2} />
          <circle cx={E.x} cy={E.y} r={6} fill={COLOR_RIGHT} stroke="#fff" strokeWidth={2} />
          <text x={A.x + (isHourglass ? 18 : 0)} y={A.y - 12} textAnchor="middle" fontSize="17" fontWeight="900" fill="#0f172a">
            A
          </text>
          <text x={B.x - 18} y={B.y + 6} textAnchor="middle" fontSize="17" fontWeight="900" fill="#0f172a">
            B
          </text>
          <text x={C.x + 18} y={C.y + 6} textAnchor="middle" fontSize="17" fontWeight="900" fill="#0f172a">
            C
          </text>
          <text x={D.x + (isHourglass ? 18 : -18)} y={D.y - 8} textAnchor="middle" fontSize="16" fontWeight="900" fill={COLOR_LEFT}>
            D
          </text>
          <text x={E.x + (isHourglass ? -18 : 18)} y={E.y - 8} textAnchor="middle" fontSize="16" fontWeight="900" fill={COLOR_RIGHT}>
            E
          </text>
        </svg>
      </div>

      {/* RIGHT 5 COLS: LIVE RATIO DASHBOARD */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRatioMode("whole")}
            className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${
              ratioMode === "whole"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            AB : AD = AC : AE = BC : DE
          </button>
          <button
            onClick={() => setRatioMode("part")}
            className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${
              ratioMode === "part"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            AD : DB = AE : EC
          </button>
        </div>

        {ratioMode === "whole" ? (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-5 flex flex-col gap-4">
            <div className="text-center">
              <span className="text-xs font-extrabold text-slate-700 bg-slate-200/80 px-3 py-1 rounded-full">
                일정한 닮음비 유지
              </span>
              <div className="text-3xl font-black text-slate-900 mt-2">
                1 : {absT.toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-blue-50/80 rounded-2xl p-3 border-2 border-blue-200">
                <div className="text-xs font-extrabold text-blue-700 mb-1">왼쪽 변 (AB : AD)</div>
                <div className="text-lg font-black text-blue-700">
                  {lenAB} : {lenAD}
                </div>
              </div>
              <div className="bg-rose-50/80 rounded-2xl p-3 border-2 border-rose-200">
                <div className="text-xs font-extrabold text-rose-600 mb-1">오른쪽 변 (AC : AE)</div>
                <div className="text-lg font-black text-rose-600">
                  {lenAC} : {lenAE}
                </div>
              </div>
              <div className="bg-emerald-50/80 rounded-2xl p-3 border-2 border-emerald-200">
                <div className="text-xs font-extrabold text-emerald-700 mb-1">밑변 (BC : DE)</div>
                <div className="text-lg font-black text-emerald-700">
                  {lenBC} : {lenDE}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-5 flex flex-col gap-4">
            <div className="text-center">
              <span className="text-xs font-extrabold text-slate-700 bg-slate-200/80 px-3 py-1 rounded-full">
                양변의 부분 비 일치
              </span>
              <div className="text-3xl font-black text-slate-900 mt-2">
                {absT.toFixed(2)} : {(isHourglass ? 1 + absT : 1 - absT).toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-blue-50/80 rounded-2xl p-3.5 border-2 border-blue-200">
                <div className="text-xs font-extrabold text-blue-700 mb-1">왼쪽 변 (AD : DB)</div>
                <div className="text-xl font-black text-blue-700">
                  {lenAD} : {lenDB}
                </div>
              </div>
              <div className="bg-rose-50/80 rounded-2xl p-3.5 border-2 border-rose-200">
                <div className="text-xs font-extrabold text-rose-600 mb-1">오른쪽 변 (AE : EC)</div>
                <div className="text-xl font-black text-rose-600">
                  {lenAE} : {lenEC}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT: PARALLEL LINES & SEGMENT RATIOS IN TRIANGLES
// ---------------------------------------------------------------------------
export default function ParallelLinesApp({ onBack }: ParallelLinesAppProps) {
  const [activeTab, setActiveTab] = useState<MainTab>("board");

  // Individual animation states for the 5 sections matching Photo 2
  const [sA1Top, setSA1Top] = useState(0);
  const [exA1Top, setExA1Top] = useState(0);

  const [sA1Bot, setSA1Bot] = useState(0);
  const [exA1Bot, setExA1Bot] = useState(0);

  const [sA2Top, setSA2Top] = useState(0);
  const [exA2Top, setExA2Top] = useState(0);

  const [sA2Bot, setSA2Bot] = useState(0);
  const [exA2Bot, setExA2Bot] = useState(0);

  const [sB, setSB] = useState(0);
  const [exB, setExB] = useState(0);

  const isAllRevealed =
    sA1Top === 3 &&
    exA1Top === 2 &&
    sA1Bot === 3 &&
    exA1Bot === 2 &&
    sA2Top === 3 &&
    exA2Top === 2 &&
    sA2Bot === 3 &&
    exA2Bot === 2 &&
    sB === 1 &&
    exB === 3;

  const handleToggleAll = () => {
    if (isAllRevealed) {
      setSA1Top(0);
      setExA1Top(0);
      setSA1Bot(0);
      setExA1Bot(0);
      setSA2Top(0);
      setExA2Top(0);
      setSA2Bot(0);
      setExA2Bot(0);
      setSB(0);
      setExB(0);
    } else {
      setSA1Top(3);
      setExA1Top(2);
      setSA1Bot(3);
      setExA1Bot(2);
      setSA2Top(3);
      setExA2Top(2);
      setSA2Bot(3);
      setExA2Bot(2);
      setSB(1);
      setExB(3);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col font-sans select-none">
      {/* Bouncy & Elastic Keyframe Styles */}
      <style>{`
        @keyframes popElastic {
          0% {
            opacity: 0;
            transform: scale(0.2);
          }
          60% {
            opacity: 1;
            transform: scale(1.24);
          }
          82% {
            transform: scale(0.92);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes popSoft {
          0% {
            opacity: 0;
            transform: scale(0.92);
          }
          65% {
            opacity: 1;
            transform: scale(1.03);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes drawCurveStroke {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
        }
        @keyframes slideSegment {
          0% {
            transform: translate(0px, 0px);
            opacity: 1;
          }
          75% {
            transform: translate(var(--dx), var(--dy));
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx), var(--dy));
            opacity: 0.25;
          }
        }
        .animate-pop-elastic {
          animation: popElastic 0.52s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          transform-box: fill-box;
          transform-origin: center;
        }
        .animate-pop-soft {
          animation: popSoft 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          transform-box: fill-box;
          transform-origin: center;
        }
        .curve-stroke-anim {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawCurveStroke 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .slide-db-to-ef {
          animation: slideSegment 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* TOP CLASSROOM HEADER BAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap shadow-2xs">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>⬅</span>
              <span>목록으로</span>
            </button>
          )}
          <div className="flex items-baseline gap-2.5">
            <span className="text-base sm:text-lg font-extrabold text-slate-600">
              삼각형에서 평행선과
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              선분 길이의 비
            </h1>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: "board", label: "📋 전체 칠판 보기" },
            { id: "a1", label: "A-1. 전체변의 비" },
            { id: "a2", label: "A-2. 부분변의 비" },
            { id: "b", label: "B. 길이의 비 ⇒ 평행" },
            { id: "drag", label: "🎛️ 평행선 드래그 실험" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainTab)}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-sm scale-105"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="h-6 w-[1px] bg-slate-200 mx-1" />

          <button
            onClick={handleToggleAll}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer border ${
              isAllRevealed
                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                : "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm"
            }`}
          >
            {isAllRevealed ? "🔄 전체 초기화" : "✨ 전체 결과 한 번에 켜기"}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6">
        {/* TAB 1: FULL BOARD VIEW (100% MATCH TO 2ND PHOTO LAYOUT) */}
        {activeTab === "board" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* LEFT 8 COLUMNS: SECTION A (평행 ⇒ 선분 길이의 비 일정) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border-2 border-slate-800 px-5 py-3 flex items-center justify-between shadow-2xs flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-base flex items-center justify-center">
                    A
                  </span>
                  <span className="text-lg sm:text-xl font-black text-slate-900">
                    평행 <span className="text-indigo-600 mx-1">⇒</span>{" "}
                    <span className="underline decoration-amber-400 decoration-4 underline-offset-4">
                      선분 길이의 비 일정
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-extrabold">
                  <span className="flex items-center gap-1 text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> 왼쪽 변의 비
                  </span>
                  <span className="flex items-center gap-1 text-rose-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> 오른쪽 변의 비
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> 밑변(평행선)의 비
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Col 1: AB : AD = AC : AE = BC : DE */}
                <div className="flex flex-col gap-4">
                  <DiagramA1Internal
                    step={sA1Top}
                    exStep={exA1Top}
                    onStepChange={setSA1Top}
                    onExStepChange={setExA1Top}
                  />
                  <DiagramA1Hourglass
                    step={sA1Bot}
                    exStep={exA1Bot}
                    onStepChange={setSA1Bot}
                    onExStepChange={setExA1Bot}
                  />
                </div>

                {/* Col 2: AD : DB = AE : EC */}
                <div className="flex flex-col gap-4">
                  <DiagramA2Internal
                    step={sA2Top}
                    exStep={exA2Top}
                    onStepChange={setSA2Top}
                    onExStepChange={setExA2Top}
                  />
                  <DiagramA2Hourglass
                    step={sA2Bot}
                    exStep={exA2Bot}
                    onStepChange={setSA2Bot}
                    onExStepChange={setExA2Bot}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT 4 COLUMNS: SECTION B (선분 길이의 비 일정 ⇒ 평행) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border-2 border-slate-800 px-5 py-3 flex items-center gap-2.5 shadow-2xs">
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-base flex items-center justify-center">
                  B
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-900">
                  선분 길이의 비 일정 <span className="text-emerald-600 mx-1">⇒</span> 평행
                </span>
              </div>

              <div className="flex-1">
                <DiagramSectionB
                  step={sB}
                  exStep={exB}
                  onStepChange={setSB}
                  onExStepChange={setExB}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ZOOMED A-1 VIEW */}
        {activeTab === "a1" && (
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <DiagramA1Internal
              step={sA1Top}
              exStep={exA1Top}
              onStepChange={setSA1Top}
              onExStepChange={setExA1Top}
            />
            <DiagramA1Hourglass
              step={sA1Bot}
              exStep={exA1Bot}
              onStepChange={setSA1Bot}
              onExStepChange={setExA1Bot}
            />
          </div>
        )}

        {/* TAB 3: ZOOMED A-2 VIEW */}
        {activeTab === "a2" && (
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <DiagramA2Internal
              step={sA2Top}
              exStep={exA2Top}
              onStepChange={setSA2Top}
              onExStepChange={setExA2Top}
            />
            <DiagramA2Hourglass
              step={sA2Bot}
              exStep={exA2Bot}
              onStepChange={setSA2Bot}
              onExStepChange={setExA2Bot}
            />
          </div>
        )}

        {/* TAB 4: ZOOMED B VIEW */}
        {activeTab === "b" && (
          <div className="max-w-3xl mx-auto">
            <DiagramSectionB
              step={sB}
              exStep={exB}
              onStepChange={setSB}
              onExStepChange={setExB}
            />
          </div>
        )}

        {/* TAB 5: INTERACTIVE DRAG LAB */}
        {activeTab === "drag" && (
          <div className="max-w-6xl mx-auto">
            <InteractiveDragLab />
          </div>
        )}
      </main>
    </div>
  );
}
