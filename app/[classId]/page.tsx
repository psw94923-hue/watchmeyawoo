"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  student_id: string;
  dragon_type: string;
  personality: string[];
  job_group: string;
  level: number;
};

export default function ClassVillagePage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;
  
  const [houseLevel, setHouseLevel] = useState<number>(1);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [theme, setTheme] = useState<'warm' | 'careful' | 'energetic'>('warm');
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);

  useEffect(() => {
    fetchClassData();
  }, [classId]);

  const fetchClassData = async () => {
    // 예: class-1 이면 '21%' (2학년 1반 가정)
    const classNum = classId.replace('class-', '');
    const prefix = `2${classNum}`;

    const { data, error } = await supabase
      .from('profiles')
      .select('student_id, dragon_type, personality, job_group, level')
      .like('student_id', `${prefix}%`);

    if (data && data.length > 0) {
      // 45번 슬롯 숨김 처리 (student_id가 '45'로 끝나는 학생은 렌더링 제외)
      const visibleData = data.filter(p => !p.student_id.endsWith('45'));
      setProfiles(visibleData);
      determineTheme(visibleData);
    } else {
      // 더미 데이터 추가 (테스트용)
      const dummy = Array.from({ length: 5 }, (_, i) => ({
        student_id: `${prefix}0${i+1}`,
        dragon_type: ['black', 'blue', 'silver', 'red'][i%4],
        personality: ['다정한', '활기찬', '독창적인'],
        job_group: ['Tech', 'Art', 'Medicine'][i%3],
        level: i + 1
      }));
      setProfiles(dummy);
      determineTheme(dummy);
    }
  };

  const determineTheme = (data: Profile[]) => {
    let warm = 0, careful = 0, energetic = 0;
    const warmWords = ["다정한", "친절한", "배려심 깊은", "남을 잘 돕는", "선한"];
    const carefulWords = ["차분한", "꼼꼼한", "진지한", "조용한", "약속을 잘 지키는"];
    const energyWords = ["활기찬", "긍정적인", "장난기 많은", "사교적인", "자신감 넘치는"];

    data.forEach(p => {
      p.personality.forEach(word => {
        if (warmWords.includes(word)) warm++;
        if (carefulWords.includes(word)) careful++;
        if (energyWords.includes(word)) energetic++;
      });
    });

    if (careful > warm && careful > energetic) setTheme('careful');
    else if (energetic > warm && energetic > careful) setTheme('energetic');
    else setTheme('warm');
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'careful':
        return {
          bg: 'bg-[#B0E0E6]', // PowderBlue
          ground: 'bg-[#E0FFFF]', // LightCyan
          pattern: 'repeating-linear-gradient(0deg, transparent, transparent 19px, #A4D3EE 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #A4D3EE 20px)'
        };
      case 'energetic':
        return {
          bg: 'bg-[#FFB6C1]', // LightPink
          ground: 'bg-[#FFC0CB]', // Pink
          pattern: 'radial-gradient(circle, #FF69B4 2px, transparent 2px)'
        };
      case 'warm':
      default:
        return {
          bg: 'bg-[#87CEEB]', // SkyBlue
          ground: 'bg-[#8FDB85]', // LightGreen
          pattern: 'radial-gradient(circle, #5E9B6A 2px, transparent 2px)'
        };
    }
  };

  const themeStyles = getThemeStyles();

  const upgradeHouse = () => {
    if (houseLevel < 5) setHouseLevel(prev => prev + 1);
  };

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

  const renderMannequin = (p: Profile) => {
    // 흑룡(black), 청룡(blue), 은룡(silver), 적룡(red)
    const baseImage = `/images/${p.dragon_type}_dragon.png`;
    const hasAura = p.level >= 4;

    return (
      <div 
        key={p.student_id} 
        className="flex flex-col items-center hover:scale-110 transition-transform cursor-pointer relative"
        onClick={() => setSelectedStudent(p)}
      >
        <div className={`relative w-12 h-12 sm:w-16 sm:h-16 mb-2 bg-white rounded-full retro-border-sm p-1 ${hasAura ? 'shadow-[0_0_15px_#FFD700] ring-2 ring-yellow-400' : ''}`}>
          {hasAura && (
            <div className="absolute -top-3 -right-3 text-xl animate-bounce">✨</div>
          )}
          <Image 
            src={baseImage} 
            alt={p.student_id}
            fill
            className="object-contain rounded-full"
            style={{ imageRendering: 'pixelated' }}
            onError={(e) => { e.currentTarget.src = "/images/student_avatar.png" }}
          />
        </div>
        <span className="text-[10px] sm:text-xs bg-white/80 px-2 py-1 rounded retro-border-sm shadow-sm whitespace-nowrap">
          {p.student_id}
        </span>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${themeStyles.bg} text-black font-retro font-bold relative overflow-x-hidden transition-colors duration-1000`}>
      <div className="absolute top-0 w-full h-40 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-0"></div>
      
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
          내 레벨: <span className="text-blue-600">{houseLevel}</span>
        </div>
      </header>

      <main className="relative z-10 p-4 pb-20 max-w-lg mx-auto flex flex-col gap-8">
        
        {/* 내 집 방문하기 */}
        <section className="bg-white/80 rounded-2xl p-6 retro-border shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: themeStyles.pattern, backgroundSize: '16px 16px' }}></div>
          
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

        {/* 마을 도서관 */}
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
              <button className="flex-1 retro-btn retro-btn-primary text-lg py-4 border-black border-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                시작
              </button>
              <button className="flex-1 retro-btn bg-red-500 text-white hover:bg-red-600 text-lg py-4 border-black border-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                게임 종료
              </button>
            </div>
          </div>
        </section>

        {/* 우리 반 마을 둘러보기 */}
        <section className="bg-white/80 rounded-2xl p-4 sm:p-6 retro-border shadow-xl min-h-[400px]">
          <h2 className="text-xl sm:text-2xl mb-6 bg-white inline-block px-4 py-2 retro-border-sm relative z-10">
            우리 반 마을 둘러보기
          </h2>
          
          {/* 직업별 그룹화 렌더링 */}
          <div className={`grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center ${themeStyles.ground} p-4 retro-border-sm rounded-xl min-h-[300px]`}>
            {profiles.map(renderMannequin)}
          </div>
        </section>

      </main>

      {/* 마네킹 프로필 카드 모달 */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedStudent(null)}>
          <div className="bg-[#E8DCC4] w-full max-w-sm rounded-xl p-6 retro-border shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedStudent(null)}
              className="absolute top-2 right-4 text-black hover:text-red-600 font-bold text-2xl w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 mb-4 bg-white rounded-full retro-border-sm p-2 shadow-inner">
                <Image 
                  src={`/images/${selectedStudent.dragon_type}_dragon.png`} 
                  alt={selectedStudent.student_id}
                  fill
                  className="object-contain"
                  style={{ imageRendering: 'pixelated' }}
                  onError={(e) => { e.currentTarget.src = "/images/student_avatar.png" }}
                />
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">{selectedStudent.student_id}</h3>
              <div className="bg-white/50 w-full p-4 rounded retro-border-sm text-left flex flex-col gap-2">
                <p><strong>성격:</strong> <span className="text-blue-600">{selectedStudent.personality.join(', ')}</span></p>
                <p><strong>꿈:</strong> <span className="text-green-600">{selectedStudent.job_group}</span></p>
                <p><strong>성장 레벨:</strong> Lv.{selectedStudent.level}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
