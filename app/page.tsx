"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'initial' | 'login'>('initial');
  
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !password) return;
    
    // 000000 마스터 키 (이전 로직 유지 및 테스트용)
    if (password === "000000") {
      const classNum = studentId.substring(1, 2); // 2119 -> 1
      router.push(`/class-${classNum}`);
      return;
    }

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
    
    // 학번의 두번째 자리를 반으로 간주 (예: 2119 -> 1반)
    const classNum = studentId.substring(1, 2);
    router.push(`/class-${classNum}`);
  };

  return (
    <main className="relative min-h-screen w-full bg-[#2A231C] text-[#E8DCC4] flex flex-col items-center justify-center overflow-hidden font-retro">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #554838 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a140f] to-transparent opacity-80 pointer-events-none"></div>

      <div className="relative z-10 w-full text-center py-8 mb-4 animate-fade-in-up">
        <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-[#F2E5C8] drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] mb-2">
          수학 마을 입구
        </h1>
        <p className="mt-4 text-[#C1B295] text-lg md:text-xl">환영합니다! 어떤 작업을 하시겠습니까?</p>
      </div>

      <div className="relative z-10 flex flex-col gap-6 w-full max-w-sm px-4">
        {mode === 'initial' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <button 
              onClick={() => setMode('login')}
              className="retro-btn retro-btn-primary text-2xl py-8 w-full border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform"
            >
              기존 데이터로 입장
            </button>
            <button 
              onClick={() => router.push('/create')}
              className="retro-btn retro-btn-success text-2xl py-8 w-full border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform"
            >
              새로운 캐릭터 생성
            </button>
          </div>
        )}

        {mode === 'login' && (
          <div className="bg-[#E8DCC4] w-full rounded-lg p-6 retro-border shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-6">
              <h3 className="text-xl font-bold text-black flex items-center gap-2">
                <span className="text-2xl">🔒</span> 학생 로그인
              </h3>
              <button 
                onClick={() => setMode('initial')}
                className="text-black hover:text-red-600 font-bold text-2xl w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                className="w-full bg-[#3b82f6] text-white p-4 text-xl retro-border-interactive mt-4 font-bold"
              >
                {isLoggingIn ? '접속 중...' : '마을 입장'}
              </button>
            </form>
          </div>
        )}
      </div>

    </main>
  );
}
