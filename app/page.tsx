"use client";

import React, { useEffect, useRef } from "react";

export default function Home() {
  const ringsRef = useRef<(HTMLDivElement | null)[]>([]);
  const mousePos = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 });

  useEffect(() => {
    mousePos.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const ringPositions = Array(6).fill(null).map(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));

    const render = () => {
      // Add a slight wobble based on time to make the rings feel alive even when stationary
      const time = Date.now() * 0.001;
      
      ringsRef.current.forEach((ring, index) => {
        if (!ring) return;

        const targetX = mousePos.current.x;
        const targetY = mousePos.current.y;

        // Easing determines how fast the ring catches up to the cursor. 
        // Inner rings follow closely, outer rings lag behind creating 3D depth.
        const easing = 0.25 - (index * 0.035); 
        
        // Add subtle breathing/wobble effect based on index to enhance 3D perspective
        const wobbleX = Math.sin(time + index * 0.5) * (index * 2);
        const wobbleY = Math.cos(time + index * 0.5) * (index * 2);

        ringPositions[index].x += (targetX - ringPositions[index].x) * easing;
        ringPositions[index].y += (targetY - ringPositions[index].y) * easing;

        ring.style.transform = `translate(${ringPositions[index].x + wobbleX}px, ${ringPositions[index].y + wobbleY}px) translate(-50%, -50%)`;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Ring configurations imitating the dot graphic image's layered effect
  const rings = [
    { size: 40, color: "border-white", opacity: "opacity-100", width: "border-[2px]" },
    { size: 80, color: "border-cyan-300", opacity: "opacity-90", width: "border-[4px]" },
    { size: 140, color: "border-cyan-400", opacity: "opacity-80", width: "border-[6px]" },
    { size: 220, color: "border-indigo-400", opacity: "opacity-60", width: "border-[10px]" },
    { size: 320, color: "border-purple-500", opacity: "opacity-40", width: "border-[14px]" },
    { size: 440, color: "border-cyan-900", opacity: "opacity-20", width: "border-[20px]" },
  ];

  return (
    <main className="relative min-h-screen w-full bg-[#050508] flex flex-col items-center justify-center overflow-hidden cursor-crosshair">
      
      {/* 3D Cursor Tracking Rings */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden mix-blend-screen">
        {rings.map((ring, index) => (
          <div
            key={index}
            ref={(el) => {
              ringsRef.current[index] = el;
            }}
            className={`absolute top-0 left-0 rounded-full ${ring.color} ${ring.opacity} ${ring.width} will-change-transform shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
            style={{
              width: `${ring.size}px`,
              height: `${ring.size}px`,
              borderStyle: "dashed", // Gives a slightly retro/fragmented feeling
            }}
          />
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
