"use client";

import React, { useEffect, useRef } from "react";

const PixelStar = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={{ shapeRendering: "crispEdges", ...style }} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="8" y="8" width="8" height="8" />
    <rect x="10" y="2" width="4" height="6" />
    <rect x="10" y="16" width="4" height="6" />
    <rect x="2" y="10" width="6" height="4" />
    <rect x="16" y="10" width="6" height="4" />
    <rect x="6" y="6" width="4" height="4" />
    <rect x="14" y="6" width="4" height="4" />
    <rect x="6" y="14" width="4" height="4" />
    <rect x="14" y="14" width="4" height="4" />
    <rect x="8" y="6" width="8" height="2" />
    <rect x="8" y="16" width="8" height="2" />
    <rect x="6" y="8" width="2" height="8" />
    <rect x="16" y="8" width="2" height="8" />
  </svg>
);

export default function Home() {
  const layersRef = useRef<(HTMLDivElement | null)[]>([]);
  const mousePos = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 });

  useEffect(() => {
    mousePos.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouch, { passive: true });
    window.addEventListener("touchstart", handleTouch, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("touchstart", handleTouch);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const layerPositions = Array(10).fill(null).map(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));

    const render = () => {
      const time = Date.now() * 0.001;
      
      layersRef.current.forEach((layer, index) => {
        if (!layer) return;

        const targetX = mousePos.current.x;
        const targetY = mousePos.current.y;

        const easing = parseFloat(layer.dataset.easing || "0.2");
        
        // Subtle wobble for organic 3D feel
        const wobbleX = Math.sin(time + index * 0.5) * (index * 1.0);
        const wobbleY = Math.cos(time + index * 0.5) * (index * 1.0);

        layerPositions[index].x += (targetX - layerPositions[index].x) * easing;
        layerPositions[index].y += (targetY - layerPositions[index].y) * easing;

        layer.style.transform = `translate(${layerPositions[index].x + wobbleX}px, ${layerPositions[index].y + wobbleY}px) translate(-50%, -50%)`;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Dense, radiating pixel star layers (ordered back to front)
  const layers = [
    { size: 160, color: "text-indigo-950", opacity: "opacity-20", easing: 0.1 },
    { size: 140, color: "text-indigo-900", opacity: "opacity-30", easing: 0.12 },
    { size: 120, color: "text-purple-800", opacity: "opacity-40", easing: 0.14 },
    { size: 100, color: "text-purple-600", opacity: "opacity-50", easing: 0.16 },
    { size: 85, color: "text-blue-500", opacity: "opacity-60", easing: 0.18 },
    { size: 70, color: "text-cyan-500", opacity: "opacity-75", easing: 0.20 },
    { size: 55, color: "text-cyan-300", opacity: "opacity-90", easing: 0.23 },
    { size: 40, color: "text-cyan-100", opacity: "opacity-100", easing: 0.26 },
    { size: 25, color: "text-white", opacity: "opacity-100", easing: 0.30 },
    { size: 10, color: "text-white", opacity: "opacity-100", easing: 0.35 },
  ];

  return (
    <main className="relative min-h-screen w-full bg-[#050508] flex flex-col items-center justify-center overflow-hidden cursor-crosshair">
      
      {/* 3D Pixel Halo Cursor Tracker */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden mix-blend-screen">
        {layers.map((layer, index) => (
          <div
            key={index}
            ref={(el) => {
              layersRef.current[index] = el;
            }}
            data-easing={layer.easing}
            className={`absolute top-0 left-0 will-change-transform ${layer.color} ${layer.opacity}`}
            style={{
              width: `${layer.size}px`,
              height: `${layer.size}px`,
            }}
          >
            <PixelStar className="w-full h-full drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]" />
          </div>
        ))}
      </div>

      {/* Subtle ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse [animation-duration:8s]" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 select-none pointer-events-none">
        {/* Title with smooth fade-in and subtle gradient text */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-neutral-400 drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)] animate-fade-in-up">
          세원쌤의 작은 마을
        </h1>

        {/* Under construction status */}
        <div className="flex items-center gap-2.5 text-neutral-500 text-sm md:text-base font-medium tracking-[0.2em] uppercase animate-fade-in [animation-delay:400ms]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          준비 중
        </div>
      </div>

      {/* Floating particles/stars background overlay using CSS */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none z-0" />
    </main>
  );
}
