"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const CLASSES = [
  { id: 'class-1', name: '1반', icon: '/images/class_cabin.png' },
  { id: 'class-2', name: '2반', icon: '/images/class_cabin.png' },
  { id: 'class-3', name: '3반', icon: '/images/class_cabin.png' },
  { id: 'teacher', name: '선생님 연구소', icon: '/images/teacher_spellbook.png', isSpecial: true },
  { id: 'class-4', name: '4반', icon: '/images/class_cabin.png' },
  { id: 'class-5', name: '5반', icon: '/images/class_cabin.png' },
  { id: 'class-6', name: '6반', icon: '/images/class_cabin.png' },
];

export default function Home() {
  const router = useRouter();
  const sliderRef = useRef<HTMLDivElement>(null);
  
  const [selectedCard, setSelectedCard] = useState<typeof CLASSES[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleCardClick = (card: typeof CLASSES[0]) => {
    setSelectedCard(card);
    setStudentId("");
    setPassword("");
    setShowModal(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCard?.id === 'teacher') {
      if (password === "000000") {
        router.push('/teacher');
      } else {
        alert("비밀번호가 틀렸습니다.");
      }
      return;
    }

    if (!studentId || !password) return;
    
    setIsLoggingIn(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('student_id', studentId)
      .eq('password', password)
      .single();
      
    setIsLoggingIn(false);

    if (error || !data) {
      alert("학번이나 암호가 틀렸습니다.");
      return;
    }
    
    router.push(`/${selectedCard?.id}`);
  };

  return (
    <main className="relative min-h-screen w-full bg-[#2A231C] text-[#E8DCC4] flex flex-col items-center justify-center overflow-hidden font-retro">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #554838 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a140f] to-transparent opacity-80 pointer-events-none"></div>

      <div className="relative z-10 w-full text-center py-8 mb-4 animate-fade-in-up pointer-events-none">
        <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-[#F2E5C8] drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] mb-2">
          수학 마을
        </h1>
        <p className="mt-2 text-[#C1B295] text-sm md:text-base">어느 마을로 입장할까요?</p>
      </div>

      <div className="relative z-10 w-full flex items-center justify-center pb-12">
        <div 
          ref={sliderRef}
          className="flex overflow-x-auto gap-4 md:gap-8 px-8 py-8 w-full max-w-6xl no-scrollbar snap-x snap-mandatory touch-pan-x"
        >
          {CLASSES.map((c) => (
            <div 
              key={c.id} 
              onClick={() => handleCardClick(c)}
              className={`snap-center shrink-0 w-64 h-80 md:w-72 md:h-96 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform hover:-translate-y-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)] border-4 border-black ${c.isSpecial ? 'bg-gradient-to-br from-[#8B5A2B] to-[#5C3A21]' : 'bg-[#E8DCC4]'}`}
            >
              <div className="relative w-32 h-32 md:w-40 md:h-40 mb-6 drop-shadow-xl hover:scale-110 transition-transform">
                <Image 
                  src={c.icon} 
                  alt={c.name} 
                  fill 
                  className="object-contain"
                  style={{ imageRendering: 'pixelated' }}
                  priority
                />
              </div>
              <h2 className={`text-3xl md:text-4xl font-bold tracking-wider drop-shadow-md ${c.isSpecial ? 'text-[#FFD700]' : 'text-[#3B2C1A]'}`}>
                {c.name}
              </h2>
            </div>
          ))}
        </div>
      </div>

      {showModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#E8DCC4] w-full max-w-sm rounded-lg p-6 retro-border shadow-2xl animate-scale-up relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-4 text-black hover:text-red-600 font-bold text-2xl w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold text-black mb-4 border-b-4 border-black pb-2 text-center">
              {selectedCard.name} 접속
            </h3>
            
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {selectedCard.id !== 'teacher' ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-black mb-1">학번 (예: 2119)</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-white text-black p-4 text-center text-xl retro-border-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                      placeholder="학번 4자리"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black mb-1">비밀번호</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white text-black p-4 text-center text-xl retro-border-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                      placeholder="******"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-[#3b82f6] text-white p-4 text-xl retro-border-interactive mt-2 font-bold"
                  >
                    {isLoggingIn ? '접속 중...' : '로그인'}
                  </button>
                  <div className="mt-4 border-t-2 border-gray-300 pt-4">
                    <button 
                      type="button"
                      onClick={() => router.push('/create')}
                      className="w-full bg-[#4ade80] text-black p-4 text-xl retro-border-interactive font-bold"
                    >
                      새로운 캐릭터 생성
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-gray-700 mb-2 text-center">선생님 전용 로그인입니다.</p>
                  <div>
                    <label className="block text-sm font-bold text-black mb-1">비밀번호</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white text-black p-4 text-center text-xl retro-border-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                      placeholder="******"
                      autoFocus
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-[#3b82f6] text-white p-4 text-xl retro-border-interactive mt-4 font-bold"
                  >
                    관리자 로그인
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
