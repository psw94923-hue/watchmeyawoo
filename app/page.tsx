import Link from "next/link";

export const metadata = {
  title: "세원쌤의 작은 마을 | 공사 중",
  description: "수학 마을이 새로운 디자인과 재미있는 서비스로 새단장 중입니다.",
};

export default function ComingSoonPage() {
  return (
    <main className="relative min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-40"></div>
      
      {/* Glowing atmospheric circles */}
      <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Top Left Navigation Link */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          href="/previous" 
          id="btn-previous-page"
          className="group flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-800 bg-slate-900/60 backdrop-blur-md text-xs sm:text-sm text-slate-300 hover:text-white hover:border-slate-700 transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-95"
        >
          <span className="inline-block transition-transform duration-300 group-hover:-translate-x-1">←</span>
          <span>이전 페이지 살펴보기</span>
        </Link>
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 text-center px-6 max-w-xl animate-fade-in-up">
        {/* Decorative Glowing Icon */}
        <div className="mx-auto w-24 h-24 mb-10 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[1.5px] shadow-[0_0_40px_rgba(99,102,241,0.25)] hover:scale-105 transition-transform duration-500">
          <div className="w-full h-full bg-[#020617] rounded-3xl flex items-center justify-center">
            <svg className="w-12 h-12 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        {/* Construction Title */}
        <h1 className="text-5xl md:text-7xl font-black tracking-widest mb-6 bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          &lt;공사중&gt;
        </h1>

        {/* Renovating Subtitle */}
        <p className="text-slate-400 text-sm sm:text-base md:text-lg mb-10 leading-relaxed font-light">
          수학 마을이 새로운 디자인과 풍성한 콘텐츠로 새단장 중입니다.<br className="hidden sm:inline" />
          더욱 유익하고 흥미진진한 서비스로 곧 찾아뵙겠습니다.
        </p>

        {/* Modern Infinite Loading Bar */}
        <div className="max-w-xs mx-auto bg-slate-950 border border-slate-800/80 rounded-full h-2.5 p-[2px] overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] mb-3">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full w-1/3 animate-progress-infinite"></div>
        </div>
        <span className="text-[10px] text-slate-600 uppercase tracking-[0.25em] font-mono font-medium block">
          SYSTEM MAINTENANCE IN PROGRESS
        </span>
      </div>
    </main>
  );
}
