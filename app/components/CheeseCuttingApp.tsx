"use client";

import React, { useState, useMemo, useEffect } from "react";

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
type PolygonType = 5 | 6;

interface Point {
  x: number;
  y: number;
}

interface NodeItem {
  id: number;
  type: "vertex" | "midpoint" | "center";
  x: number;
  y: number;
  name: string;
  vertexIndex?: number;
}

interface EdgeItem {
  id: string;
  from: number;
  to: number;
  isCut: boolean;
}

interface SubFace {
  id: string;
  nodeIds: number[];
  points: Point[];
  cornerPoints: Point[];
  isTriangle: boolean;
  centroid: Point;
  offsetVector: Point; // Shift vector for pull-apart slice separation
}

interface ExtraAngleGroup {
  id: string;
  nodeId: number;
  type: "midpoint" | "center";
  deducted: boolean;
  degValue: number;
  x: number;
  y: number;
  name: string;
}

interface SliceEffectParticle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  r: number;
  color: string;
}

interface SliceEffect {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  particles: SliceEffectParticle[];
}

// ----------------------------------------------------------------------
// Geometry Helpers
// ----------------------------------------------------------------------
function ccw(p1: Point, p2: Point, p3: Point): number {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  if (
    (a.x === c.x && a.y === c.y) ||
    (a.x === d.x && a.y === d.y) ||
    (b.x === c.x && b.y === c.y) ||
    (b.x === d.x && b.y === d.y)
  ) {
    return false;
  }

  const ccw1 = ccw(a, b, c);
  const ccw2 = ccw(a, b, d);
  const ccw3 = ccw(c, d, a);
  const ccw4 = ccw(c, d, b);

  return ccw1 * ccw2 < 0 && ccw3 * ccw4 < 0;
}

function getCentroid(pts: Point[]): Point {
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

// Simplify face vertices by removing collinear intermediate points on straight lines (cross-product ~ 0)
function simplifyCollinearPoints(pts: Point[]): Point[] {
  if (pts.length <= 3) return pts;
  const result: Point[] = [];
  const n = pts.length;

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];

    const cp = Math.abs(ccw(prev, curr, next));
    const distPrevNext = Math.hypot(next.x - prev.x, next.y - prev.y);

    // If cross product is very small relative to edge length, point is collinear
    if (cp > 20.0 || distPrevNext < 1.0) {
      result.push(curr);
    }
  }

  return result.length >= 3 ? result : pts;
}

// Sub-polygon Face Splitter
function computeSubFaces(
  nodes: NodeItem[],
  polygonSides: PolygonType,
  userCuts: EdgeItem[]
): SubFace[] {
  const nodeMap = new Map<number, NodeItem>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const n = polygonSides;

  // Initial outer face cycle: V0 - M0 - V1 - M1 ... Vn-1 - Mn-1
  let currentFaceCycles: number[][] = [[]];
  for (let i = 0; i < n; i++) {
    currentFaceCycles[0].push(i); // Vi
    currentFaceCycles[0].push(n + i); // Mi
  }

  // Iteratively split faces along user cuts
  userCuts.forEach((cut) => {
    const u = cut.from;
    const v = cut.to;
    const nextCycles: number[][] = [];

    let splitDone = false;

    currentFaceCycles.forEach((cycle) => {
      if (splitDone) {
        nextCycles.push(cycle);
        return;
      }

      const idxU = cycle.indexOf(u);
      const idxV = cycle.indexOf(v);

      if (idxU !== -1 && idxV !== -1 && Math.abs(idxU - idxV) > 1) {
        // Split cycle into two sub-cycles
        const minIdx = Math.min(idxU, idxV);
        const maxIdx = Math.max(idxU, idxV);

        const sub1: number[] = [];
        for (let i = minIdx; i <= maxIdx; i++) {
          sub1.push(cycle[i]);
        }

        const sub2: number[] = [];
        for (let i = maxIdx; i < cycle.length; i++) {
          sub2.push(cycle[i]);
        }
        for (let i = 0; i <= minIdx; i++) {
          sub2.push(cycle[i]);
        }

        nextCycles.push(sub1);
        nextCycles.push(sub2);
        splitDone = true;
      } else {
        nextCycles.push(cycle);
      }
    });

    currentFaceCycles = nextCycles;
  });

  // Construct SubFace objects
  return currentFaceCycles.map((cycle, idx) => {
    const pts = cycle.map((id) => {
      const node = nodeMap.get(id)!;
      return { x: node.x, y: node.y };
    });

    const corners = simplifyCollinearPoints(pts);
    const centroid = getCentroid(corners);

    // Pull-apart vector from center (200, 200)
    const dx = centroid.x - 200;
    const dy = centroid.y - 200;
    const dist = Math.hypot(dx, dy) || 1;

    // Shift 9px outward when triangulated
    const offsetVector = {
      x: (dx / dist) * 9,
      y: (dy / dist) * 9,
    };

    return {
      id: `face-${idx}-${cycle.join("-")}`,
      nodeIds: cycle,
      points: pts,
      cornerPoints: corners,
      isTriangle: corners.length === 3,
      centroid,
      offsetVector,
    };
  });
}

// ----------------------------------------------------------------------
// Component Implementation
// ----------------------------------------------------------------------
export default function CheeseCuttingApp({ onBack }: { onBack: () => void }) {
  const [polygonSides, setPolygonSides] = useState<PolygonType>(5);
  const [selectedStartNode, setSelectedStartNode] = useState<number | null>(
    null
  );
  const [userCuts, setUserCuts] = useState<EdgeItem[]>([]);
  const [activeSlices, setActiveSlices] = useState<SliceEffect[]>([]);

  // App Workflow Steps
  const [appStep, setAppStep] = useState<
    "cut" | "step1" | "step2" | "complete"
  >("cut");

  const [clickedTriangles, setClickedTriangles] = useState<Set<string>>(
    new Set()
  );
  const [deductedExtraAngles, setDeductedExtraAngles] = useState<Set<string>>(
    new Set()
  );

  // Generate nodes for selected polygon
  const { nodes, outerEdges, boundaryCycle } = useMemo(() => {
    const n = polygonSides;
    const center = { x: 200, y: 200 };
    const radius = 140;

    const nodeList: NodeItem[] = [];
    const vertices: Point[] = [];

    // 1. Original Vertices (0 to n-1)
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      vertices.push({ x, y });
      nodeList.push({
        id: i,
        type: "vertex",
        x,
        y,
        name: `꼭짓점 ${i + 1}`,
        vertexIndex: i,
      });
    }

    // 2. Edge Midpoints (n to 2n-1)
    for (let i = 0; i < n; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % n];
      const mx = (v1.x + v2.x) / 2;
      const my = (v1.y + v2.y) / 2;
      nodeList.push({
        id: n + i,
        type: "midpoint",
        x: mx,
        y: my,
        name: `변의 중심 ${i + 1}`,
        vertexIndex: i,
      });
    }

    // 3. Polygon Center (2n)
    nodeList.push({
      id: 2 * n,
      type: "center",
      x: center.x,
      y: center.y,
      name: "정중앙",
    });

    const edgeList: EdgeItem[] = [];
    const bCycle: number[] = [];

    for (let i = 0; i < n; i++) {
      const vCurr = i;
      const mCurr = n + i;
      const vNext = (i + 1) % n;

      bCycle.push(vCurr);
      bCycle.push(mCurr);

      edgeList.push({
        id: `outer-${vCurr}-${mCurr}`,
        from: vCurr,
        to: mCurr,
        isCut: false,
      });
      edgeList.push({
        id: `outer-${mCurr}-${vNext}`,
        from: mCurr,
        to: vNext,
        isCut: false,
      });
    }

    return { nodes: nodeList, outerEdges: edgeList, boundaryCycle: bCycle };
  }, [polygonSides]);

  // Combine all edges (outer boundary + user cuts)
  const allEdges = useMemo(() => {
    return [...outerEdges, ...userCuts];
  }, [outerEdges, userCuts]);

  // Compute Sub-polygon Faces
  const subFaces = useMemo(() => {
    return computeSubFaces(nodes, polygonSides, userCuts);
  }, [nodes, polygonSides, userCuts]);

  // Check if every sub-face is a triangle
  const isTriangulated = useMemo(() => {
    if (userCuts.length === 0) return false;
    return subFaces.length > 1 && subFaces.every((f) => f.isTriangle);
  }, [subFaces, userCuts]);

  // Reset when polygon shape changes
  const handlePolygonChange = (sides: PolygonType) => {
    setPolygonSides(sides);
    setSelectedStartNode(null);
    setUserCuts([]);
    setActiveSlices([]);
    setAppStep("cut");
    setClickedTriangles(new Set());
    setDeductedExtraAngles(new Set());
  };

  // Reset current cutting
  const handleResetCuts = () => {
    setSelectedStartNode(null);
    setUserCuts([]);
    setActiveSlices([]);
    setAppStep("cut");
    setClickedTriangles(new Set());
    setDeductedExtraAngles(new Set());
  };

  // SMART DYNAMIC NODE HIDING LOGIC
  // When a start node is selected, hide all invalid target nodes!
  const validTargetNodes = useMemo(() => {
    if (selectedStartNode === null) return new Set<number>();

    const validSet = new Set<number>();
    const startNode = nodes.find((n) => n.id === selectedStartNode)!;
    const centerId = 2 * polygonSides;

    nodes.forEach((targetNode) => {
      if (targetNode.id === selectedStartNode) return;

      // RULE 1: If start node is NOT center, hide center node unless explicitly starting from center!
      // (User request: "정중앙은 정중앙을 시작점으로 누르지 않는 이상 사라지게 해버리는게 좋을 거 같은데")
      if (selectedStartNode !== centerId && targetNode.id === centerId) {
        return;
      }

      // RULE 2: Cannot re-cut an edge that already exists
      const edgeExists = allEdges.some(
        (e) =>
          (e.from === startNode.id && e.to === targetNode.id) ||
          (e.from === targetNode.id && e.to === startNode.id)
      );
      if (edgeExists) return;

      // RULE 3: Cannot connect if segment intersects an existing cut line
      let intersects = false;
      for (const e of userCuts) {
        const eFrom = nodes.find((n) => n.id === e.from)!;
        const eTo = nodes.find((n) => n.id === e.to)!;

        if (
          segmentsIntersect(
            { x: startNode.x, y: startNode.y },
            { x: targetNode.x, y: targetNode.y },
            { x: eFrom.x, y: eFrom.y },
            { x: eTo.x, y: eTo.y }
          )
        ) {
          intersects = true;
          break;
        }
      }
      if (intersects) return;

      // RULE 4: Both start and target node must share at least one untriangulated sub-face
      const sharedFace = subFaces.find(
        (f) =>
          !f.isTriangle &&
          f.nodeIds.includes(startNode.id) &&
          f.nodeIds.includes(targetNode.id)
      );

      if (sharedFace) {
        // Cannot cut adjacent boundary neighbors in that face
        const idxStart = sharedFace.nodeIds.indexOf(startNode.id);
        const idxTarget = sharedFace.nodeIds.indexOf(targetNode.id);
        const len = sharedFace.nodeIds.length;

        const isAdjacent =
          (idxStart + 1) % len === idxTarget ||
          (idxTarget + 1) % len === idxStart;

        if (!isAdjacent) {
          validSet.add(targetNode.id);
        }
      }
    });

    return validSet;
  }, [selectedStartNode, nodes, allEdges, userCuts, subFaces, polygonSides]);

  // Handle Node Selection & Cutting
  const handleNodeClick = (nodeId: number) => {
    if (appStep !== "cut") return;

    if (selectedStartNode === null) {
      setSelectedStartNode(nodeId);
    } else if (selectedStartNode === nodeId) {
      setSelectedStartNode(null);
    } else {
      if (!validTargetNodes.has(nodeId)) return;

      const fromNode = nodes.find((n) => n.id === selectedStartNode)!;
      const toNode = nodes.find((n) => n.id === nodeId)!;

      const newEdge: EdgeItem = {
        id: `cut-${fromNode.id}-${toNode.id}`,
        from: fromNode.id,
        to: toNode.id,
        isCut: true,
      };

      // Fruit-Ninja Slice Effect Animation
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      const particles: SliceEffectParticle[] = [];
      const particleColors = [
        "#f59e0b",
        "#fbbf24",
        "#d97706",
        "#ffffff",
        "#fef3c7",
      ];

      for (let i = 0; i < 8; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const dist = 25 + Math.random() * 35;
        const pDx = (nx * side + (Math.random() - 0.5) * 0.5) * dist;
        const pDy = (ny * side + (Math.random() - 0.5) * 0.5) * dist;
        particles.push({
          id: i,
          x: midX + (Math.random() - 0.5) * 20,
          y: midY + (Math.random() - 0.5) * 20,
          dx: pDx,
          dy: pDy,
          r: 2.5 + Math.random() * 3.5,
          color: particleColors[i % particleColors.length],
        });
      }

      const sliceEffect: SliceEffect = {
        id: `slice-${Date.now()}`,
        x1: fromNode.x,
        y1: fromNode.y,
        x2: toNode.x,
        y2: toNode.y,
        midX,
        midY,
        particles,
      };

      setActiveSlices((prev) => [...prev, sliceEffect]);
      setTimeout(() => {
        setActiveSlices((prev) => prev.filter((s) => s.id !== sliceEffect.id));
      }, 600);

      setUserCuts((prev) => [...prev, newEdge]);
      setSelectedStartNode(null);
    }
  };

  const handleStartStep1 = () => {
    if (!isTriangulated) return;
    setAppStep("step1");
  };

  const handleTriangleClick = (faceId: string) => {
    if (appStep !== "step1") return;

    setClickedTriangles((prev) => {
      const next = new Set(prev);
      if (!next.has(faceId)) {
        next.add(faceId);
      }
      return next;
    });
  };

  const actualInteriorAngleSum = (polygonSides - 2) * 180;
  const clickedTriangleCount = clickedTriangles.size;
  const totalTriangleCount = subFaces.length;

  const extraAngleGroups = useMemo<ExtraAngleGroup[]>(() => {
    const list: ExtraAngleGroup[] = [];
    const usedNodes = new Set<number>();
    userCuts.forEach((c) => {
      usedNodes.add(c.from);
      usedNodes.add(c.to);
    });

    usedNodes.forEach((nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      if (node.type === "midpoint") {
        list.push({
          id: `extra-mid-${node.id}`,
          nodeId: node.id,
          type: "midpoint",
          deducted: false,
          degValue: 180,
          x: node.x,
          y: node.y,
          name: node.name,
        });
      } else if (node.type === "center") {
        list.push({
          id: `extra-center-${node.id}`,
          nodeId: node.id,
          type: "center",
          deducted: false,
          degValue: 360,
          x: node.x,
          y: node.y,
          name: node.name,
        });
      }
    });

    return list;
  }, [userCuts, nodes]);

  const rawPieceSum = clickedTriangleCount * 180;
  const deductedSum = Array.from(deductedExtraAngles).reduce((acc, id) => {
    const group = extraAngleGroups.find((g) => g.id === id);
    return acc + (group ? group.degValue : 0);
  }, 0);
  const currentPieceAngleSum = rawPieceSum - deductedSum;

  const allTrianglesClicked =
    clickedTriangleCount === totalTriangleCount && totalTriangleCount > 0;
  const hasAngleMismatch =
    allTrianglesClicked && rawPieceSum !== actualInteriorAngleSum;

  const handleStartStep2 = () => {
    setAppStep("step2");
  };

  const handleExtraAngleClick = (groupId: string) => {
    if (appStep !== "step2") return;

    setDeductedExtraAngles((prev) => {
      const next = new Set(prev);
      next.add(groupId);

      const allDeducted = extraAngleGroups.every((g) => next.has(g.id));
      if (allDeducted) {
        setTimeout(() => {
          setAppStep("complete");
        }, 500);
      }

      return next;
    });
  };

  useEffect(() => {
    if (
      appStep === "step1" &&
      allTrianglesClicked &&
      rawPieceSum === actualInteriorAngleSum
    ) {
      const timer = setTimeout(() => {
        setAppStep("complete");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [appStep, allTrianglesClicked, rawPieceSum, actualInteriorAngleSum]);

  // Guidance Banner Text
  const currentPromptMessage = useMemo(() => {
    if (appStep === "cut") {
      if (selectedStartNode === null) {
        return "👉 꼭짓점을 선택하세요!";
      } else {
        return "🔪 다른 점들을 눌러 잘라보세요!";
      }
    } else if (appStep === "step1") {
      return "💡 삼각형들을 눌러보세요!";
    } else if (appStep === "step2") {
      return "❓ 내각에 해당하지 않는 각을 모두 눌러보세요.";
    }
    return null;
  }, [appStep, selectedStartNode]);

  return (
    <div
      className={`min-h-screen w-full bg-[#fdfbf7] flex flex-col font-sans select-none relative overflow-x-hidden ${
        selectedStartNode !== null ? "cursor-crosshair" : ""
      }`}
    >
      {/* HEADER NAVIGATION */}
      <header className="bg-amber-100/80 backdrop-blur-md border-b border-amber-200/80 px-4 py-3 flex items-center justify-between shadow-sm z-30">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-50 active:scale-95 transition-all"
        >
          <span>🏠</span>
          <span>메인으로</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-amber-950">
            🧀 치즈 커팅 : 다각형 내각의 합
          </span>
        </div>

        <button
          onClick={handleResetCuts}
          className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600 active:scale-95 transition-all"
        >
          🔄 초기화
        </button>
      </header>

      {/* DYNAMIC GUIDANCE PROMPT BANNER */}
      {currentPromptMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-amber-900/90 backdrop-blur-md text-amber-100 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full shadow-lg border border-amber-400/40 flex items-center gap-2">
            <span>{currentPromptMessage}</span>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-3 sm:p-6 gap-6 max-w-5xl mx-auto w-full">
        {/* LEFT / TOP PANEL */}
        <div className="flex-1 flex flex-col items-center w-full max-w-lg">
          {/* POLYGON SELECTOR: 5-gon & 6-gon ONLY */}
          <div className="bg-white/90 backdrop-blur-md border border-amber-200 rounded-2xl p-2 shadow-sm w-full mb-4 flex items-center justify-center gap-4">
            {[5, 6].map((s) => (
              <button
                key={s}
                onClick={() => handlePolygonChange(s as PolygonType)}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1 ${
                  polygonSides === s
                    ? "bg-amber-500 text-white shadow-md scale-105"
                    : "bg-amber-50 text-amber-900 hover:bg-amber-100"
                }`}
              >
                <span>{s}각형</span>
              </button>
            ))}
          </div>

          {/* CUTTING BOARD CONTAINER */}
          <div className="relative w-full aspect-square max-w-[400px] rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-900/30 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-95"
              style={{ backgroundImage: "url('/images/cutting_board.png')" }}
            />
            <div className="absolute inset-0 bg-amber-950/10 pointer-events-none" />

            {/* SVG INTERACTIVE CANVASES */}
            <svg
              viewBox="0 0 400 400"
              className="relative z-10 w-full h-full touch-none select-none"
            >
              <defs>
                <style>{`
                  @keyframes bladeFlash {
                    0% { stroke-dashoffset: 300; opacity: 1; stroke-width: 9px; }
                    50% { opacity: 1; stroke-width: 6px; }
                    100% { stroke-dashoffset: 0; opacity: 0; stroke-width: 1px; }
                  }
                  @keyframes shockwavePulse {
                    0% { r: 6px; opacity: 1; stroke-width: 4px; }
                    100% { r: 35px; opacity: 0; stroke-width: 1px; }
                  }
                  .animate-blade-slash {
                    stroke-dasharray: 300;
                    animation: bladeFlash 0.5s ease-out forwards;
                  }
                  .animate-shockwave {
                    animation: shockwavePulse 0.45s cubic-bezier(0, 0.7, 0.1, 1) forwards;
                  }
                `}</style>

                {/* Cheese Pattern Fill */}
                <pattern
                  id="cheesePattern"
                  patternUnits="userSpaceOnUse"
                  width="400"
                  height="400"
                >
                  <image
                    href="/images/cheese.jpg"
                    x="0"
                    y="0"
                    width="400"
                    height="400"
                    preserveAspectRatio="xMidYMid slice"
                  />
                </pattern>

                <filter
                  id="nodeGlow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter
                  id="bladeGlow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 1. BASE POLYGON SHAPE (Rendered underneath) */}
              <polygon
                points={nodes
                  .filter((n) => n.type === "vertex")
                  .map((n) => `${n.x},${n.y}`)
                  .join(" ")}
                fill="url(#cheesePattern)"
                stroke="#d97706"
                strokeWidth="4"
                strokeLinejoin="round"
                className="drop-shadow-md opacity-40"
              />

              {/* 2. SUB-POLYGONS (CHEESE PIECES WITH PULL-APART SLICE SEPARATION EFFECT) */}
              {subFaces.map((face) => {
                const isClicked = clickedTriangles.has(face.id);
                // When triangulated or in step 1/2, shift sub-polygon outward slightly to show pull-apart separation!
                const isSeparated = isTriangulated || appStep !== "cut";
                const transformStr = isSeparated
                  ? `translate(${face.offsetVector.x}px, ${face.offsetVector.y}px)`
                  : "translate(0px, 0px)";

                return (
                  <g
                    key={face.id}
                    style={{
                      transform: transformStr,
                      transition: "transform 0.45s cubic-bezier(0.17, 0.67, 0.83, 0.67)",
                    }}
                  >
                    <polygon
                      points={face.points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="url(#cheesePattern)"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      className={
                        appStep === "step1"
                          ? "cursor-pointer hover:opacity-90 transition-opacity"
                          : ""
                      }
                      onClick={() => handleTriangleClick(face.id)}
                    />

                    {/* Step 1 Overlay Highlight */}
                    {appStep === "step1" && isClicked && (
                      <polygon
                        points={face.points.map((p) => `${p.x},${p.y}`).join(" ")}
                        fill="rgba(251, 191, 36, 0.35)"
                        stroke="#b45309"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        className="pointer-events-none"
                      />
                    )}

                    {/* Step 1 & 2: 180° Interior Angle Arcs & Centroid Label */}
                    {(appStep === "step1" ||
                      appStep === "step2" ||
                      appStep === "complete") &&
                      isClicked && (
                        <g className="pointer-events-none">
                          <g
                            transform={`translate(${face.centroid.x}, ${face.centroid.y})`}
                          >
                            <circle
                              r="16"
                              fill="#fff"
                              stroke="#d97706"
                              strokeWidth="2"
                              className="shadow-md"
                            />
                            <text
                              textAnchor="middle"
                              dy="4"
                              fontSize="11"
                              fontWeight="bold"
                              fill="#78350f"
                            >
                              180°
                            </text>
                          </g>

                          {/* Render corner angle arcs */}
                          {face.cornerPoints.map((pt, pIdx) => {
                            const prevPt =
                              face.cornerPoints[
                                (pIdx + 2) % face.cornerPoints.length
                              ];
                            const nextPt =
                              face.cornerPoints[
                                (pIdx + 1) % face.cornerPoints.length
                              ];
                            const a1 = Math.atan2(
                              prevPt.y - pt.y,
                              prevPt.x - pt.x
                            );
                            const a2 = Math.atan2(
                              nextPt.y - pt.y,
                              nextPt.x - pt.x
                            );

                            const r = 22;
                            const x1 = pt.x + r * Math.cos(a1);
                            const y1 = pt.y + r * Math.sin(a1);
                            const x2 = pt.x + r * Math.cos(a2);
                            const y2 = pt.y + r * Math.sin(a2);

                            let turn = a2 - a1;
                            while (turn < 0) turn += 2 * Math.PI;
                            const sweepFlag = turn < Math.PI ? 1 : 0;

                            return (
                              <path
                                key={pIdx}
                                d={`M ${x1} ${y1} A ${r} ${r} 0 0 ${sweepFlag} ${x2} ${y2} L ${pt.x} ${pt.y} Z`}
                                fill="rgba(217, 119, 6, 0.3)"
                                stroke="#b45309"
                                strokeWidth="1.5"
                              />
                            );
                          })}
                        </g>
                      )}
                  </g>
                );
              })}

              {/* 3. USER DRAWN CUT LINES */}
              {userCuts.map((cut) => {
                const nFrom = nodes.find((n) => n.id === cut.from)!;
                const nTo = nodes.find((n) => n.id === cut.to)!;
                return (
                  <line
                    key={cut.id}
                    x1={nFrom.x}
                    y1={nFrom.y}
                    x2={nTo.x}
                    y2={nTo.y}
                    stroke="#78350f"
                    strokeWidth="3.5"
                    strokeDasharray="6 3"
                    strokeLinecap="round"
                  />
                );
              })}

              {/* 4. FRUIT-NINJA SLICE EFFECT OVERLAY */}
              {activeSlices.map((slice) => (
                <g key={slice.id} className="pointer-events-none z-40">
                  <circle
                    cx={slice.midX}
                    cy={slice.midY}
                    fill="none"
                    stroke="#fbbf24"
                    className="animate-shockwave"
                  />

                  <line
                    x1={slice.x1}
                    y1={slice.y1}
                    x2={slice.x2}
                    y2={slice.y2}
                    stroke="#ffffff"
                    strokeLinecap="round"
                    filter="url(#bladeGlow)"
                    className="animate-blade-slash"
                  />
                  <line
                    x1={slice.x1}
                    y1={slice.y1}
                    x2={slice.x2}
                    y2={slice.y2}
                    stroke="#f59e0b"
                    strokeLinecap="round"
                    className="animate-blade-slash"
                  />

                  {slice.particles.map((p) => (
                    <circle
                      key={p.id}
                      cx={p.x}
                      cy={p.y}
                      r={p.r}
                      fill={p.color}
                      className="shadow-sm"
                      style={{
                        transform: `translate(${p.dx}px, ${p.dy}px)`,
                        opacity: 0,
                        transition: "all 0.55s cubic-bezier(0.1, 0.8, 0.3, 1)",
                      }}
                    />
                  ))}
                </g>
              ))}

              {/* 5. STEP 2: CLICKABLE EXTRA ANGLE BADGES */}
              {(appStep === "step2" || appStep === "complete") &&
                extraAngleGroups.map((group) => {
                  const isDeducted = deductedExtraAngles.has(group.id);
                  return (
                    <g
                      key={group.id}
                      className="cursor-pointer transition-all active:scale-110"
                      onClick={() => handleExtraAngleClick(group.id)}
                    >
                      <circle
                        cx={group.x}
                        cy={group.y}
                        r="18"
                        fill={isDeducted ? "#ef4444" : "#f59e0b"}
                        stroke="#fff"
                        strokeWidth="2.5"
                        className="shadow-lg animate-pulse"
                      />
                      <text
                        x={group.x}
                        y={group.y + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="extrabold"
                        fill="#fff"
                      >
                        {isDeducted ? `-${group.degValue}°` : `? ${group.degValue}°`}
                      </text>
                    </g>
                  );
                })}

              {/* 6. SMART DYNAMIC NODES (HIDES INVALID TARGET NODES AUTOMATICALLY) */}
              {appStep === "cut" &&
                nodes.map((node) => {
                  const isSelected = selectedStartNode === node.id;
                  const isTargetPhase = selectedStartNode !== null;

                  // If in target selection phase, HIDE any node that is NOT in validTargetNodes!
                  if (isTargetPhase && !isSelected && !validTargetNodes.has(node.id)) {
                    return null;
                  }

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer group"
                      onClick={() => handleNodeClick(node.id)}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isSelected ? "14" : "10"}
                        fill={
                          isSelected
                            ? "#ef4444"
                            : node.type === "vertex"
                            ? "#d97706"
                            : node.type === "midpoint"
                            ? "#f59e0b"
                            : "#3b82f6"
                        }
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        filter={isSelected ? "url(#nodeGlow)" : undefined}
                        className="transition-all duration-200 group-hover:scale-125"
                      />

                      {isSelected && (
                        <text
                          x={node.x + 12}
                          y={node.y - 12}
                          fontSize="22"
                          className="animate-bounce pointer-events-none"
                        >
                          🔪
                        </text>
                      )}

                      <text
                        x={node.x}
                        y={node.y + (node.y > 200 ? 18 : -12)}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#78350f"
                        className="pointer-events-none opacity-80 group-hover:opacity-100"
                      >
                        {node.type === "vertex"
                          ? `꼭짓점`
                          : node.type === "midpoint"
                          ? `중심`
                          : `정중앙`}
                      </text>
                    </g>
                  );
                })}
            </svg>
          </div>
        </div>

        {/* RIGHT / BOTTOM PANEL */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="bg-white/90 backdrop-blur-md border border-amber-200 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-amber-950 flex items-center gap-2 border-b border-amber-100 pb-3">
              <span>📊</span>
              <span>내각의 합 실시간 현황</span>
            </h2>

            <div className="flex flex-col gap-3">
              <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 flex flex-col">
                <span className="text-xs font-bold text-amber-800 mb-1">
                  📐 조각 내각의 합 (합산 값)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-amber-600">
                    {currentPieceAngleSum}°
                  </span>
                  <span className="text-xs font-semibold text-amber-700">
                    ({clickedTriangleCount} 조각 × 180°
                    {deductedSum > 0 ? ` - ${deductedSum}°` : ""})
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 flex flex-col">
                <span className="text-xs font-bold text-emerald-800 mb-1">
                  🎯 실제 다각형 내각의 합 (정답 값)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-600">
                    {actualInteriorAngleSum}°
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    ({polygonSides} - 2) × 180°
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {appStep === "cut" && (
                <button
                  onClick={handleStartStep1}
                  disabled={!isTriangulated}
                  className={`w-full py-3.5 rounded-2xl font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                    isTriangulated
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 active:scale-98 cursor-pointer animate-pulse"
                      : "bg-amber-200/60 text-amber-800/60 cursor-not-allowed"
                  }`}
                >
                  <span>내각의 합 알아보기</span>
                  <span>➔</span>
                </button>
              )}

              {appStep === "step1" && hasAngleMismatch && (
                <button
                  onClick={handleStartStep2}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-extrabold text-sm shadow-md hover:from-rose-600 hover:to-rose-700 active:scale-98 transition-all animate-bounce flex items-center justify-center gap-2"
                >
                  <span>❓ 왜 내각의 합이 다르지?</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-amber-100/60 border border-amber-200 rounded-3xl p-4 text-xs font-medium text-amber-900 leading-relaxed">
            <div className="font-extrabold text-amber-950 mb-1 flex items-center gap-1">
              <span>💡</span>
              <span>다각형 내각의 합 원리</span>
            </div>
            {polygonSides}각형의 한 꼭짓점에서 대각선을 그어 만들 수 있는 삼각형의 개수는{" "}
            <strong>{polygonSides - 2}개</strong>입니다. 따라서 내각의 총합은{" "}
            <strong>({polygonSides} - 2) × 180° = {actualInteriorAngleSum}°</strong>가 됩니다!
          </div>
        </div>
      </main>

      {/* VICTORY MODAL */}
      {appStep === "complete" && (
        <div className="fixed inset-0 z-50 bg-amber-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-scale-up flex flex-col items-center">
            <div className="text-5xl mb-3 animate-bounce">🎉</div>
            <h3 className="text-xl font-black text-amber-950 mb-2">
              탐구 완수! 축하합니다!
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 mb-6 leading-relaxed">
              {extraAngleGroups.length > 0 ? (
                <>
                  변의 중심점이나 내부 점을 통과하여 생긴 필요없는 각(180° /
                  360°)을 제외하니, 원래 {polygonSides}각형의 내각의 합{" "}
                  <strong>{actualInteriorAngleSum}°</strong>와 정확히
                  일치함을 알아냈어요!
                </>
              ) : (
                <>
                  한 꼭짓점에서만 잘라 {polygonSides - 2}개의 삼각형을 만들어{" "}
                  {polygonSides}각형 내각의 합{" "}
                  <strong>{actualInteriorAngleSum}°</strong>를 완벽하게 도출했습니다!
                </>
              )}
            </p>
            <button
              onClick={handleResetCuts}
              className="w-full py-3 rounded-2xl bg-amber-500 text-white font-extrabold text-sm shadow-md hover:bg-amber-600 active:scale-95 transition-all"
            >
              다른 다각형 자르기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
