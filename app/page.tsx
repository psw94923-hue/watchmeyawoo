"use client";

import React, { useState } from "react";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handleTestClick = () => {
    setClickCount((prev) => prev + 1);
    setIsModalOpen(true);
  };

  const templates = [
    {
      title: "단어 카드 & 스마트 퀴즈",
      description: "학생들이 재미있게 영어 단어나 핵심 개념을 외우고 맞출 수 있는 퀴즈 카드 게임을 만들어보세요.",
      icon: (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      ),
      badge: "어학/암기"
    },
    {
      title: "연산 연습 및 수학 게임",
      description: "사칙연산 문제를 무작위로 자동 생성하고 점수를 기록하여 수학 실력을 향상시키는 맞춤형 앱을 디자인해보세요.",
      icon: (
        <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      badge: "수학/수리"
    },
    {
      title: "랜덤 학생 추첨기",
      description: "수업 시간 발표자나 모둠 구성원을 공정하게 선정하는 아기자기한 룰렛 또는 이름 뽑기 웹앱을 구현해보세요.",
      icon: (
        <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7C4.547 9.547 4.5 10.768 4.5 12s.047 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.092-1.209.138-2.43.138-3.662z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5l3 3 3-3" />
        </svg>
      ),
      badge: "수업/활동"
    }
  ];

  return (
    <main className="flex-1">
      {/* 히어로 섹션 */}
      <section className="relative overflow-hidden py-20 sm:py-32 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 transition-colors">
        {/* 장식용 배경 광원 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-blue-400 dark:bg-blue-600 blur-[120px]" />
          <div className="absolute bottom-[20%] right-[10%] w-[35vw] h-[35vw] rounded-full bg-indigo-400 dark:bg-indigo-600 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30 mb-6 animate-fade-in">
            ✨ 초보자 맞춤형 교육용 웹앱 스타터 킷
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight sm:leading-none">
            나만의 <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">교육용 웹앱</span> 만들기
          </h1>
          
          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            어려운 백엔드나 데이터베이스 연동 없이도 가능합니다. 
            선생님이 상상하시는 멋진 디지털 학습 콘텐츠와 활동 도구들을 이 뼈대 위에 자유롭게 구현해 보세요.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleTestClick}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-none hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2 group"
            >
              인터랙티브 기능 테스트하기
              <svg 
                className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
            <a
              href="#templates"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors text-center"
            >
              추천 템플릿 보기
            </a>
          </div>
        </div>
      </section>

      {/* 템플릿 추천 섹션 */}
      <section id="templates" className="py-20 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200/50 dark:border-slate-800/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">이런 기능들을 만들 수 있어요!</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              제공해 드리는 기본 코드를 활용하여 코딩 초보자도 쉽게 아래와 같은 유용한 학습 도구를 빌드할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {templates.map((template, idx) => (
              <div 
                key={idx}
                className="group p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl group-hover:scale-110 transition-transform">
                      {template.icon}
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {template.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{template.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{template.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                  자세한 가이드 보기
                  <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 가이드 섹션 */}
      <section id="guide" className="py-20 bg-white dark:bg-slate-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                배포 및 제작 과정이 아주 간편합니다
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                템플릿을 수정하고 학생들에게 공개하는 과정이 완전히 자동화되어 있습니다. 선생님은 오직 수업 도구의 내용과 화면에만 집중하시면 됩니다.
              </p>

              <div className="mt-8 space-y-6">
                {[
                  { step: "01", title: "로컬에서 화면 수정", desc: "app/page.tsx 파일을 열어 필요한 텍스트나 입력창, 간단한 리액트 훅을 추가해봅니다." },
                  { step: "02", title: "GitHub에 변경사항 저장", desc: "코드가 변경되면 Git에 추가하고 push합니다. (저희가 이미 push 명령어를 세팅해 놓았습니다!)" },
                  { step: "03", title: "Vercel을 통해 전 세계 자동 배포", desc: "Vercel 저장소와 연결하면 Git push가 발생할 때마다 1분 안에 새로운 수정사항이 웹사이트에 자동 업로드됩니다." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{item.step}</span>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 shadow-xl border border-slate-800 overflow-hidden font-mono text-xs text-slate-300">
                <div className="flex items-center gap-1.5 pb-4 border-b border-slate-800 mb-4">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-500 ml-2">edu-boilerplate - powershell</span>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-500"># 1. 개발 서버 실행하기</p>
                  <p className="text-emerald-400">PS C:\swcoding&gt; npm run dev</p>
                  <p className="text-slate-400">ready - started server on 0.0.0.0:3000, url: http://localhost:3000</p>
                  <p>&nbsp;</p>
                  <p className="text-slate-500"># 2. Vercel용 빌드 확인하기</p>
                  <p className="text-emerald-400">PS C:\swcoding&gt; npm run build</p>
                  <p className="text-slate-400">Route (app)      Size     First Load JS</p>
                  <p className="text-slate-400">┌  /            1.42 kB        84.3 kB</p>
                  <p className="text-slate-400">└  /layout      0 B            82.8 kB</p>
                  <p className="text-teal-400">✓ Compiled successfully [Vercel Deployment Ready]</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 테스트 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                🎉 축하합니다!
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              인터랙션 버튼이 작동했습니다! 현재 버튼 클릭 횟수는{" "}
              <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">{clickCount}회</span>입니다.
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-3">
              이 팝업창은 React의 <code className="font-mono text-rose-500 dark:text-rose-400 bg-slate-50 dark:bg-slate-900 px-1 py-0.5 rounded">useState</code> 훅을 통해 동작하고 있습니다. 선생님만의 창의적인 학습 앱으로 마음껏 변형해보세요!
            </p>
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-6 w-full py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-650 text-white font-semibold rounded-xl transition-colors cursor-pointer text-center"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
