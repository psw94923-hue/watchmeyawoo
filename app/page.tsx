"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const classes = [
    { id: "class-1", name: "1반", icon: "/images/class_cabin.png" },
    { id: "class-2", name: "2반", icon: "/images/class_cabin.png" },
    { id: "class-3", name: "3반", icon: "/images/class_cabin.png" },
    { id: "teacher", name: "선생님 공간", icon: "/images/teacher_spellbook.png", special: true },
    { id: "class-4", name: "4반", icon: "/images/class_cabin.png" },
    { id: "class-5", name: "5반", icon: "/images/class_cabin.png" },
    { id: "class-6", name: "6반", icon: "/images/class_cabin.png" },
  ];

  // 스와이프를 편하게 하기 위해 가운데로 스크롤 이동
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const scrollPosition = (container.scrollWidth - container.clientWidth) / 2;
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, []);

  const handleCardClick = (classId: string) => {
    setSelectedClass(classId);
    setShowModal(true);
    setPassword("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === "") return;
    
    // 단순 모의 로그인
    setShowModal(false);
    router.push(`/${selectedClass}`);
  };

  return (
    <main className="relative min-h-screen w-full bg-[#2A231C] text-[#E8DCC4] flex flex-col items-center justify-center overflow-hidden font-retro">
      {/* 칠판 / 양피지 질감 오버레이 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #554838 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a140f] to-transparent opacity-80 pointer-events-none"></div>

      {/* 헤더 */}
      <div className="relative z-10 w-full text-center py-8 mb-4 animate-fade-in-up">
        <h1 className="text-3xl md:text-5xl font-bold tracking-widest text-[#F2E5C8] drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
          수학 마을 입구
        </h1>
        <p className="mt-4 text-[#C1B295] text-sm md:text-base">어느 반으로 입장하시겠습니까?</p>
      </div>

      {/* 가로 스크롤 카드 덱 컨테이너 */}
      <div 
        ref={containerRef}
        className="relative z-10 flex w-full max-w-5xl overflow-x-auto snap-x snap-mandatory px-[50vw] md:px-32 py-8 gap-6 no-scrollbar touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {classes.map((cls, index) => (
          <div 
            key={cls.id}
            onClick={() => handleCardClick(cls.id)}
            className={`flex-none snap-center w-64 md:w-72 h-80 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-transform transform hover:scale-105 active:scale-95 ${
              cls.special 
                ? 'bg-gradient-to-b from-[#4A3B2C] to-[#2E241B] border-4 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.5)]' 
                : 'bg-gradient-to-b from-[#3B2C1A] to-[#1A140F] border-4 border-[#8B5A2B] shadow-xl'
            }`}
          >
            <div className="relative w-32 h-32 mb-6">
              <Image 
                src={cls.icon} 
                alt={cls.name}
                fill
                className="object-contain drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <h2 className={`text-2xl font-bold ${cls.special ? 'text-[#FFD700]' : 'text-white'}`}>
              {cls.name}
            </h2>
            <div className="mt-4 px-4 py-2 bg-black/40 rounded border-2 border-black text-xs text-[#A8987B]">
              탭하여 접속
            </div>
          </div>
        ))}
      </div>

      {/* 비밀번호 입력 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-[#E8DCC4] w-full max-w-sm rounded-lg p-6 retro-border shadow-[0_10px_25px_rgba(0,0,0,0.9)] animate-scale-up">
            <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-6">
              <h3 className="text-xl font-bold text-black flex items-center gap-2">
                <span className="text-2xl">🔒</span> 암호 확인
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-black hover:text-red-600 font-bold text-2xl w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            <p className="text-black mb-4 font-bold text-center text-lg">
              {classes.find(c => c.id === selectedClass)?.name} <br/> 
              <span className="text-sm font-normal">암호 문구를 입력하세요.</span>
            </p>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white text-black p-4 text-center text-xl retro-border-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                placeholder="******"
                autoFocus
              />
              <button 
                type="submit"
                className="w-full bg-[#3b82f6] text-white p-4 text-xl retro-border-interactive mt-2 font-bold"
              >
                접속
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 스타일을 위한 추가 CSS (스크롤바 숨김 등) */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </main>
  );
}
