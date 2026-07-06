import React from "react";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse [animation-duration:8s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse [animation-duration:12s]" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 select-none">
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
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
    </main>
  );
}
