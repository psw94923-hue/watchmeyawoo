"use client";

import React, { useState, useMemo, useEffect } from "react";

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
type PolygonType = 5 | 6 | 7 | 8;

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
  vertexIndex?: number; // original vertex or midpoint index
}

interface EdgeItem {
  id: string;
  from: number; // node id
  to: number; // node id
  isCut: boolean; // true if created by user cut, false if outer boundary
}

interface TriangleFace {
  id: string;
  nodeIds: [number, number, number];
  points: [Point, Point, Point];
  centroid: Point;
  clicked: boolean;
  angles: [number, number, number]; // in degrees
}

interface ExtraAngleGroup {
  id: string;
  nodeId: number;
  type: "midpoint" | "center";
  deducted: boolean;
  degValue: number; // 180 for midpoint, 360 for center
  x: number;
  y: number;
  name: string;
}

// ----------------------------------------------------------------------
// Geometry Utility Functions
// ----------------------------------------------------------------------
function ccw(p1: Point, p2: Point, p3: Point): number {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  // If sharing endpoint, return false (not interior intersection)
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

function getAngleDegrees(p1: Point, pVertex: Point, p2: Point): number {
  const v1 = { x: p1.x - pVertex.x, y: p1.y - pVertex.y };
  const v2 = { x: p2.x - pVertex.x, y: p2.y - pVertex.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;
  let cosTheta = dot / (mag1 * mag2);
  cosTheta = Math.max(-1, Math.min(1, cosTheta));
  return Math.round((Math.acos(cosTheta) * 180) / Math.PI);
}

// Planar Graph Face Extraction
function extractFaces(nodes: NodeItem[], edges: EdgeItem[]): TriangleFace[] {
  const nodeMap = new Map<number, NodeItem>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const adj = new Map<number, number[]>();
  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((e) => {
    adj.get(e.from)?.push(e.to);
    adj.get(e.to)?.push(e.from);
  });

  // Directed edge tracker for face traversal
  const visitedEdges = new Set<string>();
  const facesPoints: number[][] = [];

  nodes.forEach((uNode) => {
    const u = uNode.id;
    const neighbors = adj.get(u) || [];

    neighbors.forEach((v) => {
      const edgeKey = `${u}->${v}`;
      if (visitedEdges.has(edgeKey)) return;

      const facePath: number[] = [u];
      let currU = u;
      let currV = v;

      while (!visitedEdges.has(`${currU}->${currV}`)) {
        visitedEdges.add(`${currU}->${currV}`);
        facePath.push(currV);

        // Find next node w from currV making smallest counter-clockwise turn
        const nextCandidates = adj.get(currV) || [];
        const ptU = nodeMap.get(currU)!;
        const ptV = nodeMap.get(currV)!;
        const inAngle = Math.atan2(ptU.y - ptV.y, ptU.x - ptV.x);

        let bestW = -1;
        let minTurn = Infinity;

        nextCandidates.forEach((w) => {
          if (w === currU && nextCandidates.length > 1) return; // avoid immediate backtrack if possible
          const ptW = nodeMap.get(w)!;
          const outAngle = Math.atan2(ptW.y - ptV.y, ptW.x - ptV.x);

          let turn = outAngle - inAngle;
          while (turn <= 0) turn += 2 * Math.PI;

          if (turn < minTurn) {
            minTurn = turn;
            bestW = w;
          }
        });

        if (bestW === -1) break;
        currU = currV;
        currV = bestW;

        if (currV === u) {
          visitedEdges.add(`${currU}->${currV}`);
          break;
        }
      }

      if (facePath.length >= 3) {
        // Calculate signed area to filter out outer face (outer face has negative area in CCW)
        let area = 0;
        for (let i = 0; i < facePath.length; i++) {
          const p1 = nodeMap.get(facePath[i])!;
          const p2 = nodeMap.get(facePath[(i + 1) % facePath.length])!;
          area += p1.x * p2.y - p2.x * p1.y;
        }

        if (area > 0) {
          facesPoints.push(facePath);
        }
      }
    });
  });

  const triangles: TriangleFace[] = [];

  facesPoints.forEach((cycle, idx) => {
    // Distinct nodes in cycle
    const uniqueNodes = Array.from(new Set(cycle));
    if (uniqueNodes.length === 3) {
      const n0 = nodeMap.get(uniqueNodes[0])!;
      const n1 = nodeMap.get(uniqueNodes[1])!;
      const n2 = nodeMap.get(uniqueNodes[2])!;

      const p0 = { x: n0.x, y: n0.y };
      const p1 = { x: n1.x, y: n1.y };
      const p2 = { x: n2.x, y: n2.y };

      const centroid = getCentroid([p0, p1, p2]);

      const a0 = getAngleDegrees(p1, p0, p2);
      const a1 = getAngleDegrees(p0, p1, p2);
      const a2 = getAngleDegrees(p0, p2, p1);

      triangles.push({
        id: `tri-${uniqueNodes.sort().join("-")}`,
        nodeIds: [uniqueNodes[0], uniqueNodes[1], uniqueNodes[2]],
        points: [p0, p1, p2],
        centroid,
        clicked: false,
        angles: [a0, a1, a2],
      });
    }
  });

  return triangles;
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // App Workflow Steps
  // 'cut': cutting phase
  // 'step1': angle sum discovery phase
  // 'step2': error finding phase
  // 'complete': victory phase
  const [appStep, setAppStep] = useState<
    "cut" | "step1" | "step2" | "complete"
  >("cut");

  const [clickedTriangles, setClickedTriangles] = useState<Set<string>>(
    new Set()
  );
  const [deductedExtraAngles, setDeductedExtraAngles] = useState<Set<string>>(
    new Set()
  );

  // Show temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

    // Outer boundary edges: V0 - M0 - V1 - M1 ... Vn-1 - Mn-1 - V0
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

  // Reset when polygon shape changes
  const handlePolygonChange = (sides: PolygonType) => {
    setPolygonSides(sides);
    setSelectedStartNode(null);
    setUserCuts([]);
    setAppStep("cut");
    setClickedTriangles(new Set());
    setDeductedExtraAngles(new Set());
  };

  // Reset current cutting
  const handleResetCuts = () => {
    setSelectedStartNode(null);
    setUserCuts([]);
    setAppStep("cut");
    setClickedTriangles(new Set());
    setDeductedExtraAngles(new Set());
  };

  // Adjacent boundary neighbor lookup for node A
  const disabledNeighborNodes = useMemo(() => {
    if (selectedStartNode === null) return new Set<number>();

    const disabled = new Set<number>();
    const idxInCycle = boundaryCycle.indexOf(selectedStartNode);

    if (idxInCycle !== -1) {
      const len = boundaryCycle.length;
      // Immediately adjacent nodes along outer boundary
      const prevNode = boundaryCycle[(idxInCycle - 1 + len) % len];
      const nextNode = boundaryCycle[(idxInCycle + 1) % len];
      disabled.add(prevNode);
      disabled.add(nextNode);
    }

    return disabled;
  }, [selectedStartNode, boundaryCycle]);

  // Combine all edges (outer boundary + user cuts)
  const allEdges = useMemo(() => {
    return [...outerEdges, ...userCuts];
  }, [outerEdges, userCuts]);

  // Extract faces (sub-triangles) from current edges
  const triangleFaces = useMemo(() => {
    return extractFaces(nodes, allEdges);
  }, [nodes, allEdges]);

  // Check if triangulation is complete
  const isTriangulated = useMemo(() => {
    if (userCuts.length === 0) return false;
    // Check total area of triangles matches polygon area
    const totalTriArea = triangleFaces.reduce((acc, tf) => {
      const [p0, p1, p2] = tf.points;
      const area = Math.abs(
        0.5 * (p0.x * (p1.y - p2.y) + p1.x * (p2.y - p0.y) + p2.x * (p0.y - p1.y))
      );
      return acc + area;
    }, 0);

    // Main polygon area
    const n = polygonSides;
    const radius = 140;
    const mainPolyArea = 0.5 * n * radius * radius * Math.sin((2 * Math.PI) / n);

    return (
      triangleFaces.length >= n - 2 &&
      Math.abs(totalTriArea - mainPolyArea) < 1.0
    );
  }, [triangleFaces, polygonSides, userCuts]);

  // Handle node selection & cutting
  const handleNodeClick = (nodeId: number) => {
    if (appStep !== "cut") return;

    if (selectedStartNode === null) {
      // First selection: set start node
      setSelectedStartNode(nodeId);
    } else if (selectedStartNode === nodeId) {
      // Deselect
      setSelectedStartNode(null);
    } else {
      // Attempt cut between start node and clicked node
      const fromNode = nodes.find((n) => n.id === selectedStartNode)!;
      const toNode = nodes.find((n) => n.id === nodeId)!;

      // Rule 1: Cannot cut adjacent edge along boundary
      if (disabledNeighborNodes.has(nodeId)) {
        showToast("이웃하는 변은 자를 수 없습니다!");
        setSelectedStartNode(null);
        return;
      }

      // Rule 2: Cannot cut line that already exists
      const edgeExists = allEdges.some(
        (e) =>
          (e.from === fromNode.id && e.to === toNode.id) ||
          (e.from === toNode.id && e.to === fromNode.id)
      );
      if (edgeExists) {
        showToast("이미 자른 선입니다!");
        setSelectedStartNode(null);
        return;
      }

      // Rule 3: Check line intersection with existing edges
      let intersects = false;
      for (const e of userCuts) {
        const eFrom = nodes.find((n) => n.id === e.from)!;
        const eTo = nodes.find((n) => n.id === e.to)!;

        if (
          segmentsIntersect(
            { x: fromNode.x, y: fromNode.y },
            { x: toNode.x, y: toNode.y },
            { x: eFrom.x, y: eFrom.y },
            { x: eTo.x, y: eTo.y }
          )
        ) {
          intersects = true;
          break;
        }
      }

      if (intersects) {
        showToast("기존에 잘린 선과 교차할 수 없습니다!");
        setSelectedStartNode(null);
        return;
      }

      // Valid cut line created!
      const newEdge: EdgeItem = {
        id: `cut-${fromNode.id}-${toNode.id}`,
        from: fromNode.id,
        to: toNode.id,
        isCut: true,
      };

      setUserCuts((prev) => [...prev, newEdge]);
      setSelectedStartNode(null);
    }
  };

  // Transition to Step 1
  const handleStartStep1 = () => {
    if (!isTriangulated) {
      showToast("삼각형 모양으로 다 잘라주세요!");
      return;
    }
    setAppStep("step1");
    showToast("삼각형들을 눌러보세요!");
  };

  // Step 1: Click triangle sub-polygon
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

  // Calculation values
  const actualInteriorAngleSum = (polygonSides - 2) * 180;
  const clickedTriangleCount = clickedTriangles.size;
  const totalTriangleCount = triangleFaces.length;

  // Extra non-interior angles present in cuts
  const extraAngleGroups = useMemo<ExtraAngleGroup[]>(() => {
    const list: ExtraAngleGroup[] = [];

    // Find all midpoints or center nodes used in user cuts
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

  // Current Piece Angle Sum computation
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

  // Transition to Step 2
  const handleStartStep2 = () => {
    setAppStep("step2");
    showToast("내각에 해당하지 않는 각을 모두 눌러보세요.");
  };

  // Step 2: Click extra angle marker
  const handleExtraAngleClick = (groupId: string) => {
    if (appStep !== "step2") return;

    setDeductedExtraAngles((prev) => {
      const next = new Set(prev);
      next.add(groupId);

      // Check if all extra angles deducted
      const allDeducted = extraAngleGroups.every((g) => next.has(g.id));
      if (allDeducted) {
        setTimeout(() => {
          setAppStep("complete");
        }, 500);
      }

      return next;
    });
  };

  // Handle immediate victory if no midpoint/center node was used
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

  return (
    <div
      className={`min-h-screen w-full bg-[#fdfbf7] flex flex-col font-sans select-none relative overflow-x-hidden ${
        selectedStartNode !== null ? "cursor-crosshair" : ""
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* HEADER NAVIGATION */}
      {/* ------------------------------------------------------------- */}
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

      {/* ------------------------------------------------------------- */}
      {/* TOAST MESSAGE BANNER */}
      {/* ------------------------------------------------------------- */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-amber-900/90 backdrop-blur-md text-amber-100 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full shadow-lg border border-amber-400/40 flex items-center gap-2">
            <span>💡</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN LAYOUT CONTAINER */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-3 sm:p-6 gap-6 max-w-5xl mx-auto w-full">
        {/* LEFT / TOP PANEL: POLYGON SELECTION & INTERACTIVE CANVAS */}
        <div className="flex-1 flex flex-col items-center w-full max-w-lg">
          {/* POLYGON SELECTION BUTTONS */}
          <div className="bg-white/90 backdrop-blur-md border border-amber-200 rounded-2xl p-2 shadow-sm w-full mb-4 flex items-center justify-around">
            {[5, 6, 7, 8].map((s) => (
              <button
                key={s}
                onClick={() => handlePolygonChange(s as PolygonType)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-1 ${
                  polygonSides === s
                    ? "bg-amber-500 text-white shadow-md scale-105"
                    : "bg-amber-50 text-amber-900 hover:bg-amber-100"
                }`}
              >
                <span>{s}각형</span>
              </button>
            ))}
          </div>

          {/* CUTTING BOARD CONTAINER WITH REAL WOOD IMAGE BACKGROUND */}
          <div className="relative w-full aspect-square max-w-[400px] rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-900/30 flex items-center justify-center">
            {/* Wooden Cutting Board Image Background */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-95"
              style={{ backgroundImage: "url('/images/cutting_board.png')" }}
            />
            {/* Subtle board overlay */}
            <div className="absolute inset-0 bg-amber-950/10 pointer-events-none" />

            {/* SVG INTERACTIVE CANVASES */}
            <svg
              viewBox="0 0 400 400"
              className="relative z-10 w-full h-full touch-none select-none"
            >
              <defs>
                {/* Cheese Pattern Fill using cheese.jpg */}
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
                {/* Glow Filter for Active Nodes */}
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
              </defs>

              {/* 1. BASE POLYGON SHAPE WITH CHEESE PATTERN FILL */}
              <polygon
                points={nodes
                  .filter((n) => n.type === "vertex")
                  .map((n) => `${n.x},${n.y}`)
                  .join(" ")}
                fill="url(#cheesePattern)"
                stroke="#d97706"
                strokeWidth="4"
                strokeLinejoin="round"
                className="drop-shadow-md"
              />

              {/* 2. TRIANGLE SUB-POLYGONS & STEP 1 / STEP 2 VISUAL MARKERS */}
              {triangleFaces.map((face) => {
                const isClicked = clickedTriangles.has(face.id);
                return (
                  <g key={face.id}>
                    {/* Clickable Triangle Polygon Area in Step 1 */}
                    <polygon
                      points={face.points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill={
                        appStep === "step1" && isClicked
                          ? "rgba(251, 191, 36, 0.35)"
                          : appStep === "step2" || appStep === "complete"
                          ? "rgba(252, 211, 77, 0.25)"
                          : "transparent"
                      }
                      stroke={appStep !== "cut" ? "#b45309" : "transparent"}
                      strokeWidth="2"
                      strokeDasharray={appStep !== "cut" ? "4 3" : undefined}
                      className={
                        appStep === "step1"
                          ? "cursor-pointer hover:fill-amber-300/40 transition-colors"
                          : ""
                      }
                      onClick={() => handleTriangleClick(face.id)}
                    />

                    {/* Step 1 & 2: 180° Interior Angle Arcs & Centroid Label */}
                    {(appStep === "step1" ||
                      appStep === "step2" ||
                      appStep === "complete") &&
                      isClicked && (
                        <g className="pointer-events-none">
                          {/* Centroid 180° Badge */}
                          <g transform={`translate(${face.centroid.x}, ${face.centroid.y})`}>
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

                          {/* Corner Angle Arcs */}
                          {face.points.map((pt, pIdx) => {
                            const prevPt =
                              face.points[(pIdx + 2) % 3];
                            const nextPt =
                              face.points[(pIdx + 1) % 3];
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

              {/* 4. STEP 2: CLICKABLE EXTRA ANGLE BADGES */}
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

              {/* 5. INTERACTIVE NODES (POINTS) */}
              {appStep === "cut" &&
                nodes.map((node) => {
                  const isSelected = selectedStartNode === node.id;
                  const isDisabled = disabledNeighborNodes.has(node.id);

                  // If node is disabled (neighbor of active start node), hide/dim it
                  if (isDisabled) return null;

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer group"
                      onClick={() => handleNodeClick(node.id)}
                    >
                      {/* Outer pulse target area */}
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

                      {/* Mini Knife Icon on Selected Start Node */}
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

                      {/* Node Label Tooltip */}
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

        {/* RIGHT / BOTTOM PANEL: REAL-TIME ANGLE SUM & CONTROL BOARD */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* CONTROL CARD */}
          <div className="bg-white/90 backdrop-blur-md border border-amber-200 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-amber-950 flex items-center gap-2 border-b border-amber-100 pb-3">
              <span>📊</span>
              <span>내각의 합 실시간 현황</span>
            </h2>

            {/* STEP 1: READOUT PANELS */}
            <div className="flex flex-col gap-3">
              {/* 조각 내각의 합 */}
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

              {/* 실제 내각의 합 */}
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

            {/* ACTION BUTTONS BASED ON STEP */}
            <div className="flex flex-col gap-2 pt-2">
              {/* STEP 0 -> STEP 1 BUTTON */}
              {appStep === "cut" && (
                <button
                  onClick={handleStartStep1}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold text-sm shadow-md hover:from-amber-600 hover:to-amber-700 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <span>내각의 합 알아보기</span>
                  <span>➔</span>
                </button>
              )}

              {/* STEP 1 -> STEP 2 BUTTON (Shown if mismatch detected) */}
              {appStep === "step1" && hasAngleMismatch && (
                <button
                  onClick={handleStartStep2}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-extrabold text-sm shadow-md hover:from-rose-600 hover:to-rose-700 active:scale-98 transition-all animate-bounce flex items-center justify-center gap-2"
                >
                  <span>❓ 왜 내각의 합이 다르지?</span>
                </button>
              )}

              {/* STEP 2 INSTRUCTION */}
              {appStep === "step2" && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 text-center leading-relaxed">
                  💡 주황색 <strong>?</strong> 표시된 각을 클릭하여 필요 없는
                  각도(180° / 360°)를 빼보세요!
                </div>
              )}
            </div>
          </div>

          {/* FORMULA EXPLORER CARD */}
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

      {/* ------------------------------------------------------------- */}
      {/* STEP 3: VICTORY CELEBRATION MODAL */}
      {/* ------------------------------------------------------------- */}
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
