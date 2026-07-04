import Link from "next/link";
import React from "react";

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center">
      <Link href="/" className="self-start text-sm text-cyan-400 hover:text-cyan-300 mb-8 font-bold flex items-center gap-2">
        <span>←</span> 비밀의 방으로 돌아가기
      </Link>
      
      <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-12 drop-shadow-lg text-center">
        수학 게임 목록
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {/* Worm-matics 게임 카드 */}
        <div className="group bg-slate-800 border-2 border-slate-700 rounded-xl overflow-hidden hover:border-cyan-500 transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:-translate-y-2">
          <div className="h-48 bg-slate-950 flex justify-center items-center relative overflow-hidden">
            {/* 썸네일 장식용 배경 효과 */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-blue-500/20" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <span className="text-6xl animate-bounce">🐛</span>
              <span className="text-xl font-retro font-bold text-green-400">x + 3 = 5</span>
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-2 text-yellow-400 group-hover:text-yellow-300">
              Worm-matics
            </h2>
            <p className="text-slate-400 text-sm mb-6 line-clamp-2">
              일차방정식을 빠르게 풀고 지렁이를 정답 구멍에 넣어보세요! 블록이 차오르기 전에 해치워야 합니다.
            </p>
            <Link 
              href="/games/worm-matics" 
              className="block w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-center font-bold rounded-lg transition-colors shadow-lg hover:shadow-cyan-500/50"
            >
              플레이하기 ▶
            </Link>
          </div>
        </div>

        {/* 준비중인 게임들 */}
        {[2, 3].map((num) => (
          <div key={num} className="bg-slate-800/50 border-2 border-slate-700/50 rounded-xl overflow-hidden grayscale opacity-60 flex flex-col">
            <div className="h-48 bg-slate-900 flex justify-center items-center">
              <span className="text-4xl text-slate-600 font-bold">???</span>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h2 className="text-xl font-bold mb-2 text-slate-300">신규 게임 개발 중</h2>
              <p className="text-slate-500 text-sm mb-6">
                새로운 수학 게임을 준비하고 있습니다. 조금만 기다려주세요!
              </p>
              <button disabled className="mt-auto block w-full py-3 px-4 bg-slate-700 text-slate-400 text-center font-bold rounded-lg cursor-not-allowed">
                준비중
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
