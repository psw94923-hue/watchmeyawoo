"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
type PolygonType = 5 | 6;
type AppMode = "practice" | "explore";

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

interface FreeCutLine {
  id: string;
  p1: Point;
  p2: Point;
}

interface FreePolygonPiece {
  id: string;
  points: Point[];
  centroid: Point;
  offset: Point;
}

interface SubFace {
  id: string;
  nodeIds: number[];
  points: Point[];
  cornerPoints: Point[];
  isTriangle: boolean;
  centroid: Point;
  offsetVector: Point;
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

function segmentIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-6) return null;
  const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;

  if (u >= -0.01 && u <= 1.01 && v >= -0.01 && v <= 1.01) {
    return { x: p1.x + u * (p2.x - p1.x), y: p1.y + u * (p2.y - p1.y) };
  }
  return null;
}

function getCentroid(pts: Point[]): Point {
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / (pts.length || 1), y: sum.y / (pts.length || 1) };
}

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

    if (cp > 20.0 || distPrevNext < 1.0) {
      result.push(curr);
    }
  }

  return result.length >= 3 ? result : pts;
}

// Line-Polygon Splitter for Practice Drag Cutting
function splitPolygonByLine(
  poly: Point[],
  p1: Point,
  p2: Point
): Point[][] | null {
  const n = poly.length;
  const intersections: { idx: number; pt: Point }[] = [];

  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const hit = segmentIntersection(p1, p2, a, b);
    if (hit) {
      intersections.push({ idx: i, pt: hit });
    }
  }

  if (intersections.length < 2) return null;

  const hit1 = intersections[0];
  let hit2 = intersections[1];
  for (let i = 1; i < intersections.length; i++) {
    if (
      Math.hypot(
        intersections[i].pt.x - hit1.pt.x,
        intersections[i].pt.y - hit1.pt.y
      ) > 5
    ) {
      hit2 = intersections[i];
      break;
    }
  }

  if (
    Math.hypot(hit2.pt.x - hit1.pt.x, hit2.pt.y - hit1.pt.y) < 5 ||
    hit1.idx === hit2.idx
  ) {
    return null;
  }

  const minHit = hit1.idx < hit2.idx ? hit1 : hit2;
  const maxHit = hit1.idx < hit2.idx ? hit2 : hit1;

  const sub1: Point[] = [minHit.pt];
  for (let i = minHit.idx + 1; i <= maxHit.idx; i++) {
    sub1.push(poly[i]);
  }
  sub1.push(maxHit.pt);

  const sub2: Point[] = [maxHit.pt];
  for (let i = maxHit.idx + 1; i < n; i++) {
    sub2.push(poly[i]);
  }
  for (let i = 0; i <= minHit.idx; i++) {
    sub2.push(poly[i]);
  }
  sub2.push(minHit.pt);

  return [sub1, sub2];
}

// Robust Sub-polygon Face Splitter for Formal Math Exploration
function computeSubFaces(
  nodes: NodeItem[],
  polygonSides: PolygonType,
  userCuts: EdgeItem[]
): SubFace[] {
  const nodeMap = new Map<number, NodeItem>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const n = polygonSides;
  const centerId = 2 * n;

  // Check if cuts involve center node C
  const centerCuts = userCuts.filter(
    (c) => c.from === centerId || c.to === centerId
  );
  const outerCuts = userCuts.filter(
    (c) => c.from !== centerId && c.to !== centerId
  );

  if (centerCuts.length > 0) {
    // Collect outer nodes connected to center
    const connectedOuterIds = Array.from(
      new Set(
        centerCuts.map((c) => (c.from === centerId ? c.to : c.from))
      )
    );

    // Sort connected outer nodes CCW by polar angle around center (200, 200)
    connectedOuterIds.sort((idA, idB) => {
      const nA = nodeMap.get(idA)!;
      const nB = nodeMap.get(idB)!;
      const angA = Math.atan2(nA.y - 200, nA.x - 200);
      const angB = Math.atan2(nB.y - 200, nB.x - 200);
      return angA - angB;
    });

    const perimeterCycle: number[] = [];
    for (let i = 0; i < n; i++) {
      perimeterCycle.push(i);
      perimeterCycle.push(n + i);
    }
    const pLen = perimeterCycle.length;

    let currentSectors: number[][] = [];
    const k = connectedOuterIds.length;

    for (let i = 0; i < k; i++) {
      const u = connectedOuterIds[i];
      const v = connectedOuterIds[(i + 1) % k];

      const idxU = perimeterCycle.indexOf(u);
      const idxV = perimeterCycle.indexOf(v);

      const sectorArc: number[] = [];
      let idx = idxU;
      while (idx !== idxV) {
        sectorArc.push(perimeterCycle[idx]);
        idx = (idx + 1) % pLen;
      }
      sectorArc.push(v);
      sectorArc.push(centerId);

      currentSectors.push(sectorArc);
    }

    outerCuts.forEach((cut) => {
      const u = cut.from;
      const v = cut.to;
      const nextSectors: number[][] = [];
      let splitDone = false;

      currentSectors.forEach((cycle) => {
        if (splitDone) {
          nextSectors.push(cycle);
          return;
        }

        const idxU = cycle.indexOf(u);
        const idxV = cycle.indexOf(v);

        if (idxU !== -1 && idxV !== -1 && Math.abs(idxU - idxV) > 1) {
          const minIdx = Math.min(idxU, idxV);
          const maxIdx = Math.max(idxU, idxV);

          const sub1: number[] = [];
          for (let i = minIdx; i <= maxIdx; i++) sub1.push(cycle[i]);

          const sub2: number[] = [];
          for (let i = maxIdx; i < cycle.length; i++) sub2.push(cycle[i]);
          for (let i = 0; i <= minIdx; i++) sub2.push(cycle[i]);

          nextSectors.push(sub1);
          nextSectors.push(sub2);
          splitDone = true;
        } else {
          nextSectors.push(cycle);
        }
      });

      currentSectors = nextSectors;
    });

    return currentSectors.map((cycle, idx) => {
      const pts = cycle.map((id) => {
        const node = nodeMap.get(id)!;
        return { x: node.x, y: node.y };
      });
      const corners = simplifyCollinearPoints(pts);
      const centroid = getCentroid(corners);
      const dx = centroid.x - 200;
      const dy = centroid.y - 200;
      const dist = Math.hypot(dx, dy) || 1;

      return {
        id: `face-center-${idx}-${cycle.join("-")}`,
        nodeIds: cycle,
        points: pts,
        cornerPoints: corners,
        isTriangle: corners.length === 3,
        centroid,
        offsetVector: { x: (dx / dist) * 12, y: (dy / dist) * 12 },
      };
    });
  }

  // Standard Planar Cycle Splitter for outer-only cuts
  let currentFaceCycles: number[][] = [[]];
  for (let i = 0; i < n; i++) {
    currentFaceCycles[0].push(i);
    currentFaceCycles[0].push(n + i);
  }

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
        const minIdx = Math.min(idxU, idxV);
        const maxIdx = Math.max(idxU, idxV);

        const sub1: number[] = [];
        for (let i = minIdx; i <= maxIdx; i++) sub1.push(cycle[i]);

        const sub2: number[] = [];
        for (let i = maxIdx; i < cycle.length; i++) sub2.push(cycle[i]);
        for (let i = 0; i <= minIdx; i++) sub2.push(cycle[i]);

        nextCycles.push(sub1);
        nextCycles.push(sub2);
        splitDone = true;
      } else {
        nextCycles.push(cycle);
      }
    });

    currentFaceCycles = nextCycles;
  });

  return currentFaceCycles.map((cycle, idx) => {
    const pts = cycle.map((id) => {
      const node = nodeMap.get(id)!;
      return { x: node.x, y: node.y };
    });

    const corners = simplifyCollinearPoints(pts);
    const centroid = getCentroid(corners);

    const dx = centroid.x - 200;
    const dy = centroid.y - 200;
    const dist = Math.hypot(dx, dy) || 1;

    return {
      id: `face-${idx}-${cycle.join("-")}`,
      nodeIds: cycle,
      points: pts,
      cornerPoints: corners,
      isTriangle: corners.length === 3,
      centroid,
      offsetVector: { x: (dx / dist) * 12, y: (dy / dist) * 12 },
    };
  });
}

// ----------------------------------------------------------------------
// Component Implementation
// ----------------------------------------------------------------------
export default function CheeseCuttingApp({ onBack }: { onBack: () => void }) {
  // INITIAL ENTRY STARTS AT STEP 1: 🖐️ 자유자르기 (PRACTICE MODE)
  const [appMode, setAppMode] = useState<AppMode>("practice");
  const [polygonSides, setPolygonSides] = useState<PolygonType>(5);
  const [selectedStartNode, setSelectedStartNode] = useState<number | null>(
    null
  );
  const [userCuts, setUserCuts] = useState<EdgeItem[]>([]);
  const [activeSlices, setActiveSlices] = useState<SliceEffect[]>([]);

  // 3-STAGE PEDAGOGICAL CONTROL:
  // Step 1: Practice Mode (appMode = 'practice') -> Free drag slicing warm-up.
  // Step 2: Guided Mode (appMode = 'explore', isFirstGuidedStage = true) -> Outer vertices ONLY.
  // Step 3: Advanced Mode (appMode = 'explore', isFirstGuidedStage = false) -> Center & Midpoints unlocked with strict target rules!
  const [isFirstGuidedStage, setIsFirstGuidedStage] = useState<boolean>(true);

  // Free Drag Slicing Pieces (Practice Mode)
  const [freePieces, setFreePieces] = useState<FreePolygonPiece[]>([]);
  const [freeCuts, setFreeCuts] = useState<FreeCutLine[]>([]);
  const [dragCurrentPath, setDragCurrentPath] = useState<Point[] | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // App Workflow Steps (Explore Mode)
  const [appStep, setAppStep] = useState<
    "cut" | "step1" | "step2" | "complete"
  >("cut");

  // Delayed Victory Modal Control
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);

  const [clickedTriangles, setClickedTriangles] = useState<Set<string>>(
    new Set()
  );
  const [deductedExtraAngles, setDeductedExtraAngles] = useState<Set<string>>(
    new Set()
  );

  // Generate nodes & initial base vertices for selected polygon
  const { nodes, outerEdges, baseVertices } = useMemo(() => {
    const n = polygonSides;
    const center = { x: 200, y: 200 };
    const radius = 140;

    const nodeList: NodeItem[] = [];
    const vertices: Point[] = [];

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

    nodeList.push({
      id: 2 * n,
      type: "center",
      x: center.x,
      y: center.y,
      name: "정중앙",
    });

    const edgeList: EdgeItem[] = [];
    for (let i = 0; i < n; i++) {
      const vCurr = i;
      const mCurr = n + i;
      const vNext = (i + 1) % n;

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

    return { nodes: nodeList, outerEdges: edgeList, baseVertices: vertices };
  }, [polygonSides]);

  // Initialize Free Polygon Pieces whenever polygon shape resets
  useEffect(() => {
    const initialCentroid = getCentroid(baseVertices);
    setFreePieces([
      {
        id: `piece-init-${polygonSides}`,
        points: baseVertices,
        centroid: initialCentroid,
        offset: { x: 0, y: 0 },
      },
    ]);
    setFreeCuts([]);
  }, [baseVertices, polygonSides]);

  const allEdges = useMemo(() => {
    return [...outerEdges, ...userCuts];
  }, [outerEdges, userCuts]);

  const subFaces = useMemo(() => {
    return computeSubFaces(nodes, polygonSides, userCuts);
  }, [nodes, polygonSides, userCuts]);

  const isTriangulated = useMemo(() => {
    if (userCuts.length === 0) return false;
    return subFaces.length > 1 && subFaces.every((f) => f.isTriangle);
  }, [subFaces, userCuts]);

  // AUTOMATIC TRANSITION TO STEP1 (ANGLE EXPLORATION) UPON TRIANGULATION
  useEffect(() => {
    if (appStep === "cut" && isTriangulated) {
      const timer = setTimeout(() => {
        setAppStep("step1");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [appStep, isTriangulated]);

  // PERMANENT NODE HIDING CALCULATION & EXACT CENTER NODE TARGET RULES
  const permanentlyHiddenNodeIds = useMemo(() => {
    const hiddenSet = new Set<number>();
    const centerId = 2 * polygonSides;
    const hasUntriangulatedFace = subFaces.some((f) => !f.isTriangle);

    nodes.forEach((nodeX) => {
      // In Guided Stage (Step 2), hide ALL midpoints and center node C!
      if (isFirstGuidedStage && (nodeX.type === "midpoint" || nodeX.type === "center")) {
        hiddenSet.add(nodeX.id);
        return;
      }

      // CRITICAL RULE: If an outer vertex/midpoint is picked as start node (selectedStartNode !== centerId),
      // HIDE center node C immediately so student cannot make invalid single-slit cuts!
      if (nodeX.id === centerId) {
        if (!hasUntriangulatedFace || (selectedStartNode !== null && selectedStartNode !== centerId)) {
          hiddenSet.add(centerId);
        }
        return;
      }

      const activeFaces = subFaces.filter(
        (f) => !f.isTriangle && f.nodeIds.includes(nodeX.id)
      );

      if (activeFaces.length === 0) {
        hiddenSet.add(nodeX.id);
        return;
      }

      let hasValidTarget = false;
      for (const face of activeFaces) {
        const len = face.nodeIds.length;
        const idxX = face.nodeIds.indexOf(nodeX.id);

        for (let i = 0; i < len; i++) {
          const targetId = face.nodeIds[i];
          if (targetId === nodeX.id) continue;

          const isAdjacent =
            (idxX + 1) % len === i || (i + 1) % len === idxX;
          if (isAdjacent) continue;

          const edgeExists = allEdges.some(
            (e) =>
              (e.from === nodeX.id && e.to === targetId) ||
              (e.from === targetId && e.to === nodeX.id)
          );
          if (edgeExists) continue;

          const targetNode = nodes.find((n) => n.id === targetId)!;
          let intersects = false;
          for (const e of userCuts) {
            const eFrom = nodes.find((n) => n.id === e.from)!;
            const eTo = nodes.find((n) => n.id === e.to)!;
            if (
              segmentsIntersect(
                { x: nodeX.x, y: nodeX.y },
                { x: targetNode.x, y: targetNode.y },
                { x: eFrom.x, y: eFrom.y },
                { x: eTo.x, y: eTo.y }
              )
            ) {
              intersects = true;
              break;
            }
          }

          if (!intersects) {
            hasValidTarget = true;
            break;
          }
        }
        if (hasValidTarget) break;
      }

      if (!hasValidTarget) {
        hiddenSet.add(nodeX.id);
      }
    });

    return hiddenSet;
  }, [nodes, subFaces, allEdges, userCuts, polygonSides, isFirstGuidedStage, selectedStartNode]);

  // TARGET NODES VISIBLE WHEN A START NODE IS SELECTED
  const validTargetNodes = useMemo(() => {
    if (selectedStartNode === null) return new Set<number>();

    const validSet = new Set<number>();
    const startNode = nodes.find((n) => n.id === selectedStartNode)!;
    const centerId = 2 * polygonSides;

    nodes.forEach((targetNode) => {
      if (targetNode.id === selectedStartNode) return;

      // In Guided Stage, allow ONLY outer vertex targets
      if (isFirstGuidedStage && (targetNode.type === "midpoint" || targetNode.type === "center")) {
        return;
      }

      // CRITICAL RULE: If start node is an outer vertex/midpoint (selectedStartNode !== centerId),
      // DO NOT allow center node C as a target!
      if (selectedStartNode !== centerId && targetNode.id === centerId) {
        return;
      }

      const edgeExists = allEdges.some(
        (e) =>
          (e.from === startNode.id && e.to === targetNode.id) ||
          (e.from === targetNode.id && e.to === startNode.id)
      );
      if (edgeExists) return;

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

      // If start node IS center node C, allow all outer vertices/midpoints as targets!
      if (selectedStartNode === centerId) {
        validSet.add(targetNode.id);
        return;
      }

      const sharedFace = subFaces.find(
        (f) =>
          !f.isTriangle &&
          f.nodeIds.includes(startNode.id) &&
          f.nodeIds.includes(targetNode.id)
      );

      if (sharedFace) {
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
  }, [selectedStartNode, nodes, allEdges, userCuts, subFaces, polygonSides, isFirstGuidedStage]);

  // UNLOCK ADVANCED STAGE WHEN SWITCHING SHAPES
  const handleSwitchToShape = (sides: PolygonType, isAdvanced: boolean = true) => {
    setPolygonSides(sides);
    setSelectedStartNode(null);
    setUserCuts([]);
    setFreeCuts([]);
    setActiveSlices([]);
    setAppStep("cut");
    setAppMode("explore");
    setIsFirstGuidedStage(!isAdvanced); // Unlock center node & midpoints for advanced mode!
    setShowVictoryModal(false);
    setClickedTriangles(new Set());
    setDeductedExtraAngles(new Set());

    const center = { x: 200, y: 200 };
    const radius = 140;
    const newVertices: Point[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / sides;
      newVertices.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      });
    }

    const initialCentroid = getCentroid(newVertices);
    setFreePieces([
      {
        id: `piece-init-${sides}-${Date.now()}`,
        points: newVertices,
        centroid: initialCentroid,
        offset: { x: 0, y: 0 },
      },
    ]);
  };

  const handleSwitchToPractice = () => {
    setSelectedStartNode(null);
    setUserCuts([]);
    setFreeCuts([]);
    setActiveSlices([]);
    setAppStep("cut");
    setAppMode("practice");
    setShowVictoryModal(false);
    setClickedTriangles(new Set());
    setDeductedExtraAngles(new Set());

    const initialCentroid = getCentroid(baseVertices);
    setFreePieces([
      {
        id: `piece-init-${polygonSides}-${Date.now()}`,
        points: baseVertices,
        centroid: initialCentroid,
        offset: { x: 0, y: 0 },
      },
    ]);
  };

  const handleResetCuts = () => {
    setSelectedStartNode(null);
    setUserCuts([]);
    setFreeCuts([]);
    setActiveSlices([]);
    setAppStep("cut");
    setShowVictoryModal(false);
    setClickedTriangles(new Set());
    setDeductedExtraAngles(new Set());

    const initialCentroid = getCentroid(baseVertices);
    setFreePieces([
      {
        id: `piece-init-${polygonSides}-${Date.now()}`,
        points: baseVertices,
        centroid: initialCentroid,
        offset: { x: 0, y: 0 },
      },
    ]);
  };

  // FREE DRAG SLICING INTERACTION (Practice Mode)
  const getSVGPoint = (e: React.PointerEvent): Point | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 400;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (appMode !== "practice") return;
    const pt = getSVGPoint(e);
    if (pt) {
      setDragCurrentPath([pt]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (appMode !== "practice" || !dragCurrentPath) return;
    const pt = getSVGPoint(e);
    if (pt) {
      setDragCurrentPath((prev) => (prev ? [...prev, pt] : [pt]));
    }
  };

  const handlePointerUp = () => {
    if (appMode !== "practice" || !dragCurrentPath) return;
    if (dragCurrentPath.length >= 2) {
      const p1 = dragCurrentPath[0];
      const p2 = dragCurrentPath[dragCurrentPath.length - 1];

      if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 15) {
        const newFreeCut: FreeCutLine = {
          id: `free-${Date.now()}`,
          p1,
          p2,
        };
        setFreeCuts((prev) => [...prev, newFreeCut]);

        setFreePieces((prevPieces) => {
          const nextPieces: FreePolygonPiece[] = [];

          prevPieces.forEach((piece, pIdx) => {
            const splitResult = splitPolygonByLine(piece.points, p1, p2);
            if (splitResult && splitResult.length === 2) {
              splitResult.forEach((pts, subIdx) => {
                const centroid = getCentroid(pts);
                const dx = centroid.x - 200;
                const dy = centroid.y - 200;
                const dist = Math.hypot(dx, dy) || 1;

                const offset = {
                  x: (dx / dist) * 16,
                  y: (dy / dist) * 16,
                };

                nextPieces.push({
                  id: `piece-${Date.now()}-${pIdx}-${subIdx}`,
                  points: pts,
                  centroid,
                  offset,
                });
              });
            } else {
              nextPieces.push(piece);
            }
          });

          return nextPieces;
        });

        // Trigger Fruit-Ninja Slice Effect Animation
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
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
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          midX,
          midY,
          particles,
        };

        setActiveSlices((prev) => [...prev, sliceEffect]);
        setTimeout(() => {
          setActiveSlices((prev) =>
            prev.filter((s) => s.id !== sliceEffect.id)
          );
        }, 600);
      }
    }
    setDragCurrentPath(null);
  };

  // FORMAL MATH EXPLORATION CUTTING (Explore Mode)
  const handleNodeClick = (nodeId: number) => {
    if (appMode !== "explore" || appStep !== "cut") return;

    if (selectedStartNode === null) {
      if (permanentlyHiddenNodeIds.has(nodeId)) return;
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
        setAppStep("complete");
        setTimeout(() => {
          setShowVictoryModal(true);
        }, 1800);
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
      setAppStep("complete");
      const timer = setTimeout(() => {
        setShowVictoryModal(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [appStep, allTrianglesClicked, rawPieceSum, actualInteriorAngleSum]);

  // Dynamic Banner Prompt Text
  const currentPromptMessage = useMemo(() => {
    if (appMode === "practice") {
      return "🖐️ 자유롭게 치즈를 잘라봅시다!";
    }
    if (appStep === "complete" && !showVictoryModal) {
      return "🎉 탐구 완수! 잘라낸 치즈와 내각을 더 관찰해보세요!";
    }
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
  }, [appMode, appStep, selectedStartNode, showVictoryModal]);

  return (
    <div
      className={`min-h-screen w-full bg-[#fdfbf7] flex flex-col font-sans select-none relative overflow-x-hidden ${
        selectedStartNode !== null ? "cursor-crosshair" : ""
      }`}
    >
      {/* HEADER NAVIGATION */}
      <header className="bg-amber-100/80 backdrop-blur-md border-b border-amber-200/80 px-4 py-3 flex items-center justify-between shadow-sm z-30">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-50 active:scale-95 transition-all cursor-pointer"
        >
          <span>🏠</span>
          <span>메인으로</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-amber-950">
            🧀 치즈 커팅 : {polygonSides}각형 (
            {appMode === "practice"
              ? "자유 연습"
              : isFirstGuidedStage
              ? "기본 꼭짓점 연습"
              : "고급 자유탐구"}
            )
          </span>
        </div>

        <button
          type="button"
          onClick={handleResetCuts}
          className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600 active:scale-95 transition-all cursor-pointer"
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
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 gap-5 max-w-4xl mx-auto w-full">
        {/* CUTTING BOARD CONTAINER */}
        <div className="relative w-full aspect-square max-w-[400px] rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-900/30 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-95"
            style={{ backgroundImage: "url('/images/cutting_board.png')" }}
          />
          <div className="absolute inset-0 bg-amber-950/10 pointer-events-none" />

          {/* SVG INTERACTIVE CANVASES */}
          <svg
            ref={svgRef}
            viewBox="0 0 400 400"
            className="relative z-10 w-full h-full touch-none select-none cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
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

              <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="bladeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* BASE POLYGON SHAPE */}
            <polygon
              points={baseVertices.map((n) => `${n.x},${n.y}`).join(" ")}
              fill="url(#cheesePattern)"
              stroke="#d97706"
              strokeWidth="4"
              strokeLinejoin="round"
              className="drop-shadow-md opacity-30"
            />

            {/* PRACTICE MODE: DYNAMIC SPLIT FREE POLYGON PIECES */}
            {appMode === "practice" &&
              freePieces.map((piece) => (
                <g
                  key={piece.id}
                  style={{
                    transform: `translate(${piece.offset.x}px, ${piece.offset.y}px)`,
                    transition: "transform 0.4s ease-out",
                  }}
                >
                  <polygon
                    points={piece.points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="url(#cheesePattern)"
                    stroke="#d97706"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    className="drop-shadow-md"
                  />
                </g>
              ))}

            {/* EXPLORE MODE: SUB-POLYGONS */}
            {appMode === "explore" &&
              subFaces.map((face) => {
                const isClicked = clickedTriangles.has(face.id);
                const isSeparated = isTriangulated || appStep !== "cut";

                const transformStr = isSeparated
                  ? `translate(${face.offsetVector.x}px, ${face.offsetVector.y}px)`
                  : "translate(0px, 0px)";

                return (
                  <g
                    key={face.id}
                    style={{
                      transform: transformStr,
                      transition:
                        "transform 0.45s cubic-bezier(0.17, 0.67, 0.83, 0.67)",
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

                    {(appStep === "step1" ||
                      appStep === "step2" ||
                      appStep === "complete") &&
                      isClicked && (
                        <g className="pointer-events-none">
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

            {/* FORMAL CUT LINES (EXPLORE MODE) - Hides automatically once triangulated! */}
            {appMode === "explore" &&
              appStep === "cut" &&
              !isTriangulated &&
              userCuts.map((cut) => {
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

            {/* ACTIVE FREE DRAG PATH TRAIL */}
            {dragCurrentPath && dragCurrentPath.length >= 2 && (
              <polyline
                points={dragCurrentPath.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#ffffff"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#bladeGlow)"
              />
            )}

            {/* FRUIT-NINJA SLICE EFFECT OVERLAY */}
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

            {/* STEP 2: CLICKABLE EXTRA ANGLE BADGES */}
            {appMode === "explore" &&
              (appStep === "step2" || appStep === "complete") &&
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

            {/* INTERACTIVE NODES */}
            {appMode === "explore" &&
              appStep === "cut" &&
              nodes.map((node) => {
                const isSelected = selectedStartNode === node.id;
                const isTargetPhase = selectedStartNode !== null;

                if (permanentlyHiddenNodeIds.has(node.id) && !isSelected) {
                  return null;
                }

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

        {/* BOTTOM CONTROL CARD & READOUTS */}
        <div className="w-full max-w-lg flex flex-col gap-4">
          <div className="bg-white/90 backdrop-blur-md border border-amber-200 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-amber-950 flex items-center justify-between border-b border-amber-100 pb-3">
              <span className="flex items-center gap-2">
                <span>📊</span>
                <span>{appMode === "practice" ? "자유 커팅 연습" : "내각의 합 실시간 현황"}</span>
              </span>
              {appMode === "practice" && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                  1단계: 워밍업
                </span>
              )}
            </h2>

            {appMode === "practice" ? (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  치즈 위를 손가락이나 마우스로 마음껏 <strong>드래그해서 칼로 잘라보세요!</strong> 잘린 치즈 조각들이 자유롭게 분리됩니다.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setAppMode("explore");
                    setIsFirstGuidedStage(true);
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold text-sm shadow-md hover:from-amber-600 hover:to-amber-700 active:scale-98 transition-all flex items-center justify-center gap-2 animate-bounce cursor-pointer"
                >
                  <span>📐 수학으로 탐구해보기</span>
                  <span>➔</span>
                </button>
              </div>
            ) : (
              <>
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
                  {appStep === "step1" && hasAngleMismatch && (
                    <button
                      type="button"
                      onClick={handleStartStep2}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-extrabold text-sm shadow-md hover:from-rose-600 hover:to-rose-700 active:scale-98 transition-all animate-bounce flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>❓ 왜 내각의 합이 다르지?</span>
                    </button>
                  )}

                  {/* RE-OPEN VICTORY MODAL BUTTON IF CLOSED */}
                  {appStep === "complete" && !showVictoryModal && (
                    <button
                      type="button"
                      onClick={() => setShowVictoryModal(true)}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 text-white font-extrabold text-sm shadow-md hover:bg-amber-600 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>🎉 결과 팝업 다시보기 / 고급 치즈 잘라보기</span>
                    </button>
                  )}
                </div>
              </>
            )}
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

      {/* DELAYED VICTORY POPUP MODAL WITH MOBILE TOUCH FIXES (z-[100] & onTouchEnd) */}
      {showVictoryModal && (
        <div className="fixed inset-0 z-[100] bg-amber-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in pointer-events-auto">
          <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-scale-up flex flex-col items-center">
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

            {/* ACTION OPTIONS IN MODAL */}
            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setShowVictoryModal(false)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setShowVictoryModal(false);
                }}
                className="w-full py-3.5 rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 font-extrabold text-xs sm:text-sm shadow hover:bg-amber-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                <span>🔍 내가 자른 치즈 더 살펴보기</span>
              </button>

              <div className="pt-3 border-t border-amber-100 flex flex-col gap-2">
                <span className="text-xs font-extrabold text-amber-900 text-left px-1">
                  🧀 고급 자유탐구 (중앙점/중심점 해금!):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchToShape(5, true)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleSwitchToShape(5, true);
                    }}
                    className="py-3 rounded-xl bg-amber-500 text-white font-extrabold text-xs shadow hover:bg-amber-600 active:scale-95 transition-all cursor-pointer select-none"
                  >
                    5각형 (고급)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchToShape(6, true)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleSwitchToShape(6, true);
                    }}
                    className="py-3 rounded-xl bg-amber-500 text-white font-extrabold text-xs shadow hover:bg-amber-600 active:scale-95 transition-all cursor-pointer select-none"
                  >
                    6각형 (고급)
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchToPractice}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleSwitchToPractice();
                    }}
                    className="py-3 rounded-xl bg-amber-600 text-white font-extrabold text-xs shadow hover:bg-amber-700 active:scale-95 transition-all cursor-pointer select-none"
                  >
                    🖐️ 자유 자르기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
