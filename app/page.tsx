import Link from "next/link";
import React from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050510] text-slate-200 relative overflow-hidden flex flex-col items-center justify-center font-sans">
      
      {/* 배경 장식 요소 (신비로운 우주/마법 느낌) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/20 rounded-full blur-[150px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-900/20 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-6xl p-6 flex flex-col items-center">
        
        {/* 타이틀 영역 */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-300 to-blue-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] tracking-tight">
            세원쌤의 비밀의 방
          </h1>
          <p className="text-lg md:text-xl text-cyan-100/70 font-light tracking-wide">
            수학의 신비로움이 숨겨져 있는 마법의 공간에 오신 것을 환영합니다.
          </p>
        </div>

        {/* 게시판 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full px-4">
          
          {/* 1. 수학 게임 */}
          <Link 
            href="/games" 
            className="group relative h-64 bg-slate-800/40 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-500 hover:bg-slate-800/80 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:-translate-y-2 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-900/20 group-hover:to-cyan-900/40 transition-colors" />
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🎮</span>
              <h2 className="text-2xl font-bold text-cyan-300 mb-2">수학 게임</h2>
              <p className="text-sm text-cyan-100/60 text-center">즐겁게 플레이하며<br/>수학 실력을 올려보세요!</p>
            </div>
            {/* 호버 시 나타나는 빛나는 테두리 효과 */}
            <div className="absolute inset-0 border-2 border-cyan-400/0 rounded-2xl group-hover:border-cyan-400/50 transition-colors duration-500" />
          </Link>

          {/* 2. 준비중 */}
          <div className="relative h-64 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center opacity-70 cursor-not-allowed">
            <span className="text-5xl mb-4 grayscale">📜</span>
            <h2 className="text-xl font-bold text-slate-500 mb-2">신비한 수학 사전</h2>
            <p className="text-sm text-slate-600 text-center">굳게 닫혀 있습니다.</p>
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
              <span className="px-4 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full border border-slate-700">준비중</span>
            </div>
          </div>

          {/* 3. 준비중 */}
          <div className="relative h-64 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center opacity-70 cursor-not-allowed">
            <span className="text-5xl mb-4 grayscale">🔮</span>
            <h2 className="text-xl font-bold text-slate-500 mb-2">질문 구슬</h2>
            <p className="text-sm text-slate-600 text-center">아직 빛을 잃었습니다.</p>
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
              <span className="px-4 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full border border-slate-700">준비중</span>
            </div>
          </div>

          {/* 4. 준비중 */}
          <div className="relative h-64 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center opacity-70 cursor-not-allowed">
            <span className="text-5xl mb-4 grayscale">🏆</span>
            <h2 className="text-xl font-bold text-slate-500 mb-2">비밀의 과제</h2>
            <p className="text-sm text-slate-600 text-center">봉인되어 있습니다.</p>
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
              <span className="px-4 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full border border-slate-700">준비중</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
