"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

export default function ClassVillagePage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;
  
  // 내 집 레벨 (1~5)
  const [houseLevel, setHouseLevel] = useState<number>(1);
  
  // 29명의 학생 생성 (임시 데이터)
  const students = Array.from({ length: 29 }, (_, i) => ({
    id: i + 1,
    name: `학생 ${i + 1}`,
  }));

  // 집 업그레이드 시뮬레이션
  const upgradeHouse = () => {
    if (houseLevel < 5) setHouseLevel(prev => prev + 1);
  };

  // 집 레벨별 이미지 매핑
  const getHouseImage = (level: number) => {
    switch(level) {
      case 1: return "/images/house_lvl_1.png";
      case 2: return "/images/house_lvl_2.png";
      case 3: return "/images/house_lvl_3.png";
      case 4: return "/images/house_lvl_4.png";
      case 5: return "/images/house_lvl_5.png";
      default: return "/images/house_lvl_1.png";
    }
  };

  const getClassName = (id: string) => {
    if (!id) return '';
    if (id === 'teacher') return '선생님 공간';
    return id.replace('class-', '') + '반';
  };

  return (
    <div className="min-h-screen bg-[#87CEEB] text-black font-retro font-bold relative overflow-x-hidden">
      {/* 구름/하늘 배경 + 초원 패턴 */}
      <div className="absolute top-0 w-full h-40 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-0"></div>
      
      {/* 네비게이션 헤더 */}
      <header className="sticky top-0 z-50 w-full bg-[#E8DCC4] retro-border-sm flex justify-between items-center p-3 sm:p-4 shadow-lg">
        <button 
          onClick={() => router.push('/')}
          className="retro-btn text-xs sm:text-sm px-2 sm:px-4 py-2"
        >
          ◀ 뒤로
        </button>
        <h1 className="text-xl sm:text-2xl retro-text-shadow-sm text-[#3B2C1A]">
          {getClassName(classId)} 마을
        </h1>
        <div className="bg-white retro-border-sm px-3 py-2 text-sm">
          점수: <span className="text-blue-600">100</span>
        </div>
      </header>

      {/* 메인 마을 캔버스 (세로 스크롤) */}
      <main className="relative z-10 p-4 pb-20 max-w-lg mx-auto flex flex-col gap-8">
        
        {/* 상단/좌측: 내 집 방문하기 */}
        <section className="bg-[#A0E8AF] rounded-2xl p-6 retro-border shadow-xl relative overflow-hidden">
          {/* 바닥 질감 */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #5E9B6A 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
          
          <h2 className="text-xl sm:text-2xl mb-4 bg-white inline-block px-4 py-2 retro-border-sm relative z-10">
            내 집 방문하기
          </h2>
          
          <div className="flex flex-col items-center justify-center relative z-10 py-6">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-4 animate-bounce" style={{ animationDuration: '3s' }}>
              <Image 
                src={getHouseImage(houseLevel)} 
                alt={`Level ${houseLevel} House`}
                fill
                className="object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.3)]"
                style={{ imageRendering: 'pixelated' }}
                priority
              />
            </div>
            
            <div className="flex gap-4 w-full">
              <button 
                onClick={upgradeHouse}
                className="flex-1 retro-btn retro-btn-success text-sm py-3"
                disabled={houseLevel >= 5}
              >
                {houseLevel >= 5 ? '최고 레벨!' : '집 업그레이드 (테스트)'}
              </button>
            </div>
          </div>
        </section>

        {/* 우측/중단: 마을 도서관 (포털) */}
        <section className="bg-[#FFDEB3] rounded-2xl p-6 retro-border shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 8px)' }}></div>
          
          <h2 className="text-xl sm:text-2xl mb-4 bg-white inline-block px-4 py-2 retro-border-sm relative z-10">
            마을 도서관
          </h2>
          
          <div className="flex flex-col items-center justify-center relative z-10 py-4">
            <div className="relative w-40 h-40 mb-4 hover:scale-105 transition-transform cursor-pointer">
              <Image 
                src="/images/village_library.png" 
                alt="Village Library"
                fill
                className="object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.3)]"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <p className="text-center text-sm mb-4 text-[#8B5A2B]">이곳에서 수학 미니게임을 시작하세요!</p>
            <div className="flex gap-4 w-full">
              <button className="flex-1 retro-btn retro-btn-primary text-lg py-4">
                시작
              </button>
              <button className="flex-1 retro-btn bg-red-500 text-white hover:bg-red-600 text-lg py-4 border-black border-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                게임 종료
              </button>
            </div>
          </div>
        </section>

        {/* 하단: 우리 반 마을 둘러보기 */}
        <section className="bg-[#B4F0A7] rounded-2xl p-4 sm:p-6 retro-border shadow-xl min-h-[400px]">
          <h2 className="text-xl sm:text-2xl mb-6 bg-white inline-block px-4 py-2 retro-border-sm relative z-10">
            우리 반 마을 둘러보기
          </h2>
          
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 sm:gap-4 justify-items-center bg-[#8FDB85] p-4 retro-border-sm rounded-xl">
            {students.map(student => (
              <div key={student.id} className="flex flex-col items-center hover:scale-110 transition-transform cursor-pointer">
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 mb-2 bg-white rounded-full retro-border-sm p-1">
                  <Image 
                    src="/images/student_avatar.png" 
                    alt={student.name}
                    fill
                    className="object-contain rounded-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <span className="text-[10px] sm:text-xs bg-white/80 px-2 py-1 rounded retro-border-sm shadow-sm whitespace-nowrap">
                  {student.name}
                </span>
              </div>
            ))}
          </div>
        </section>

      </main>

    </div>
  );
}
