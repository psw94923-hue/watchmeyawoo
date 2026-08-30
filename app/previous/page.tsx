"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ------------------------------
// CONSTANTS & TYPES
// ------------------------------

type Profile = {
  student_id: string;
  password?: string;
  dragon_type: string;
  personality: string[];
  job_group: string;
  level: number;
};

const CLASSES = [
  { id: 'class-1', name: '1반', icon: '/images/class_cabin.png' },
  { id: 'class-2', name: '2반', icon: '/images/class_cabin.png' },
  { id: 'class-3', name: '3반', icon: '/images/class_cabin.png' },
  { id: 'teacher', name: '선생님 연구소', icon: '/images/teacher_spellbook.png', isSpecial: true },
  { id: 'class-4', name: '4반', icon: '/images/class_cabin.png' },
  { id: 'class-5', name: '5반', icon: '/images/class_cabin.png' },
  { id: 'class-6', name: '6반', icon: '/images/class_cabin.png' },
];

const EGGS = [
  { id: "black", name: "검은색 알", color: "#333333" },
  { id: "blue", name: "푸른색 알", color: "#3b82f6" },
  { id: "silver", name: "흰색 알", color: "#f8fafc" },
  { id: "red", name: "붉은색 알", color: "#ef4444" },
];

const PERSONALITIES = {
  따뜻함: ["다정한", "친절한", "배려심 깊은", "남을 잘 돕는", "선한"],
  에너지: ["활기찬", "긍정적인", "장난기 많은", "사교적인", "자신감 넘치는"],
  신중함: ["차분한", "꼼꼼한", "진지한", "조용한", "약속을 잘 지키는"],
  창의성: ["호기심 많은", "아이디어가 많은", "자유로운", "독창적인", "도전을 좋아하는"],
};

const JOBS = [
  { id: "Education", name: "교육", icon: "/images/job_edu.png", desc: "지식과 마음을 나누며 사람을 키우는 직업군", sub: "학교 선생님, 학원 강사, 대학교수, 청소년 상담사 등" },
  { id: "Medicine", name: "의료", icon: "/images/job_med.png", desc: "인간과 동물의 건강และ 생명을 지키는 직업군", sub: "의사, 간호사, 약사, 물리치료사, 임상병리사 등" },
  { id: "Art", name: "예술", icon: "/images/job_art.png", desc: "세상을 더 아름답고 즐겁게 만드는 직업군", sub: "웹툰 작가, 일러스트레이터, 디자이너, 작곡가 등" },
  { id: "Tech", name: "기술 공학", icon: "/images/job_tech.png", desc: "새로운 기술을 만들고 시스템을 관리하는 직업군", sub: "프로그래머, 로봇 공학자, 인공지능 연구원 등" },
  { id: "Sport", name: "스포츠", icon: "/images/job_sport.png", desc: "몸을 움직이고 문화를 전파하며 활력을 주는 직업군", sub: "운동선수, 감독/코치, 심판, 댄서 등" },
  { id: "Nature", name: "농어업 및 자연", icon: "/images/job_nature.png", desc: "자연과 함께하며 생명을 기르고 환경을 지키는 직업군", sub: "스마트팜 운영자, 농부, 어부, 사육사 등" },
  { id: "Service", name: "서비스 경영", icon: "/images/job_service.png", desc: "사람들의 생활을 편리하게 돕고 경제를 움직이는 직업군", sub: "요리사, 미용사, 은행원, 마케터, 창업가 등" },
];

export default function UnifiedPreviousPage() {
  const router = useRouter();
  
  // Restricted visitor access guard
  useEffect(() => {
    router.replace('/');
  }, [router]);

  // ------------------------------
  // GLOBAL STATE
  // ------------------------------
  const [view, setView] = useState<'home' | 'create' | 'village' | 'teacher'>('home');
  const [classId, setClassId] = useState<string>("");

  // ------------------------------
  // 1. HOME VIEW STATE
  // ------------------------------
  const sliderRef = useRef<HTMLDivElement>(null);
  const [selectedCard, setSelectedCard] = useState<typeof CLASSES[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ------------------------------
  // 2. CHARACTER CREATE STATE
  // ------------------------------
  const [createStep, setCreateStep] = useState(1);
  const [selectedEgg, setSelectedEgg] = useState<string | null>(null);
  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStudentId, setCreateStudentId] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [testLevel, setTestLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // ------------------------------
  // 3. VILLAGE VIEW STATE
  // ------------------------------
  const [houseLevel, setHouseLevel] = useState<number>(1);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [theme, setTheme] = useState<'warm' | 'careful' | 'energetic'>('warm');
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);

  // ------------------------------
  // 4. TEACHER VIEW STATE
  // ------------------------------
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // ------------------------------
  // EFFECTS
  // ------------------------------
  useEffect(() => {
    if (view === 'village' && classId) {
      fetchClassData();
    }
  }, [classId, view]);

  useEffect(() => {
    if (view === 'teacher') {
      fetchProfiles();
    }
  }, [view]);

  // ------------------------------
  // HOME VIEW LOGIC
  // ------------------------------
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
        setShowModal(false);
        setView('teacher');
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
    
    setShowModal(false);
    setClassId(selectedCard?.id || "");
    setView('village');
  };

  // ------------------------------
  // CHARACTER CREATE LOGIC
  // ------------------------------
  const togglePersonality = (word: string) => {
    if (selectedPersonalities.includes(word)) {
      setSelectedPersonalities(prev => prev.filter(w => w !== word));
    } else {
      if (selectedPersonalities.length < 3) {
        setSelectedPersonalities(prev => [...prev, word]);
      }
    }
  };

  const handleNextStep = () => {
    if (createStep < 4) setCreateStep(createStep + 1);
  };

  const handlePrevStep = () => {
    if (createStep > 1) setCreateStep(createStep - 1);
  };

  const resetCreateFlow = () => {
    setCreateStep(1);
    setSelectedEgg(null);
    setSelectedPersonalities([]);
    setSelectedJob(null);
    setShowCreateModal(false);
    setCreateStudentId("");
    setCreatePassword("");
    setTestLevel(1);
    setIsComplete(false);
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createStudentId || !createPassword) return;
    
    setIsSubmitting(true);
    
    if (classId && classId !== 'teacher') {
      const classNum = classId.replace('class-', '');
      const expectedPrefix = `2${classNum}`;
      if (!createStudentId.startsWith(expectedPrefix)) {
        alert(`${classNum}반 학생은 ${expectedPrefix}로 시작하는 학번만 생성할 수 있습니다!`);
        setIsSubmitting(false);
        return;
      }
    }
    
    const finalLevel = createStudentId.endsWith('45') ? testLevel : 1;
    
    const { error } = await supabase.from('profiles').insert([
      {
        student_id: createStudentId,
        password: createPassword,
        dragon_type: selectedEgg,
        personality: selectedPersonalities,
        job_group: selectedJob,
        level: finalLevel,
        exp: 0
      }
    ]);

    setIsSubmitting(false);

    if (error) {
      alert("등록 중 오류가 발생했습니다. 학번 중복인지 확인해주세요.\n" + error.message);
    } else {
      setShowCreateModal(false);
      setIsComplete(true);
    }
  };

  const isNextDisabled = () => {
    if (createStep === 1) return !selectedEgg;
    if (createStep === 2) return selectedPersonalities.length !== 3;
    if (createStep === 3) return !selectedJob;
    return false;
  };

  // ------------------------------
  // VILLAGE VIEW LOGIC
  // ------------------------------
  const fetchClassData = async () => {
    if (!classId) return;
    const classNum = classId.replace('class-', '');
    const prefix = `2${classNum}`;

    const { data, error } = await supabase
      .from('profiles')
      .select('student_id, dragon_type, personality, job_group, level')
      .like('student_id', `${prefix}%`);

    if (data && data.length > 0) {
      const visibleData = data.filter(p => !p.student_id.endsWith('45'));
      setProfiles(visibleData);
      determineTheme(visibleData);
    } else {
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
          bg: 'bg-[#B0E0E6]',
          ground: 'bg-[#E0FFFF]',
          pattern: 'repeating-linear-gradient(0deg, transparent, transparent 19px, #A4D3EE 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #A4D3EE 20px)'
        };
      case 'energetic':
        return {
          bg: 'bg-[#FFB6C1]',
          ground: 'bg-[#FFC0CB]',
          pattern: 'radial-gradient(circle, #FF69B4 2px, transparent 2px)'
        };
      case 'warm':
      default:
        return {
          bg: 'bg-[#87CEEB]',
          ground: 'bg-[#8FDB85]',
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
    const humanImage = `/images/humans/${p.dragon_type}_human_front.png`;
    const dragonImage = `/images/dragons/${p.dragon_type}_dragon_lv${p.level}.png`;
    const hasAura = p.level >= 4;

    return (
      <div 
        key={p.student_id} 
        className="flex flex-col items-center hover:scale-110 transition-transform cursor-pointer relative"
        onClick={() => setSelectedStudent(p)}
      >
        <div className={`relative w-12 h-12 sm:w-16 sm:h-16 mb-2 bg-white rounded-full retro-border-sm p-1 ${hasAura ? 'shadow-[0_0_15px_#FFD700] ring-2 ring-yellow-400' : ''}`}>
          {hasAura && (
            <div className="absolute -top-3 -right-3 text-xl animate-bounce z-20">✨</div>
          )}
          <Image 
            src={humanImage} 
            alt={p.student_id}
            fill
            className="object-contain rounded-full relative z-10"
            style={{ imageRendering: 'pixelated' }}
            onError={(e) => { e.currentTarget.src = "/images/student_avatar.png" }}
          />
          <div className="absolute -bottom-2 -right-4 w-8 h-8 sm:w-10 sm:h-10 animate-float z-20 pointer-events-none drop-shadow-md">
            <Image 
              src={dragonImage}
              alt="Dragon Pet"
              fill
              className="object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
        <span className="text-[10px] sm:text-xs bg-white/80 px-2 py-1 rounded retro-border-sm shadow-sm whitespace-nowrap mt-2 z-10 relative">
          {p.student_id}
        </span>
      </div>
    );
  };

  // ------------------------------
  // TEACHER VIEW LOGIC
  // ------------------------------
  const fetchProfiles = async () => {
    setTeacherLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('student_id, password, dragon_type, personality, job_group, level')
      .order('student_id', { ascending: true });

    if (error) {
      console.error("Error fetching profiles:", error);
    } else if (data) {
      setAllProfiles(data);
    }
    setTeacherLoading(false);
  };

  const togglePassword = (studentId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const groupedProfiles = allProfiles.reduce((acc, profile) => {
    const prefix = profile.student_id.substring(0, profile.student_id.length - 2);
    if (!acc[prefix]) {
      acc[prefix] = [];
    }
    acc[prefix].push(profile);
    return acc;
  }, {} as Record<string, Profile[]>);

  const getTeacherClassName = (prefix: string) => {
    if (prefix.length >= 2) {
      const grade = prefix.charAt(0);
      const classNum = prefix.substring(1);
      return `${grade}학년 ${classNum}반`;
    }
    return `${prefix}반`;
  };

  // ------------------------------
  // RENDERING ROUTER (STATE BASED)
  // ------------------------------

  // A. HOME/LOGIN VIEW
  if (view === 'home') {
    return (
      <main className="relative min-h-screen w-full bg-[#2A231C] text-[#E8DCC4] flex flex-col items-center justify-center overflow-hidden font-retro">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #554838 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a140f] to-transparent opacity-80 pointer-events-none"></div>

        {/* Back to Homepage Button */}
        <div className="absolute top-6 left-6 z-20">
          <button 
            onClick={() => router.push('/')}
            id="btn-back-home"
            className="retro-btn text-xs sm:text-sm px-4 py-2 bg-[#E8DCC4] text-[#3B2C1A]"
          >
            ◀ 홈페이지로
          </button>
        </div>

        {/* Floating Dragons Background */}
        <div className="absolute top-10 left-10 w-32 h-32 md:w-48 md:h-48 animate-float opacity-60 pointer-events-none hidden sm:block" style={{ animationDelay: '0s' }}>
          <Image src="/images/dragons/black_dragon_lv5.png" alt="Black Dragon" fill className="object-contain" style={{ imageRendering: 'pixelated' }} priority />
        </div>
        <div className="absolute top-20 right-10 w-32 h-32 md:w-56 md:h-56 animate-float opacity-60 pointer-events-none hidden sm:block" style={{ animationDelay: '1.5s' }}>
          <Image src="/images/dragons/red_dragon_lv5.png" alt="Red Dragon" fill className="object-contain" style={{ imageRendering: 'pixelated' }} priority />
        </div>
        <div className="absolute bottom-10 left-20 w-32 h-32 md:w-40 md:h-40 animate-float opacity-60 pointer-events-none hidden sm:block" style={{ animationDelay: '3s' }}>
          <Image src="/images/dragons/blue_dragon_lv5.png" alt="Blue Dragon" fill className="object-contain" style={{ imageRendering: 'pixelated' }} />
        </div>
        <div className="absolute bottom-20 right-20 w-32 h-32 md:w-48 md:h-48 animate-float opacity-60 pointer-events-none hidden sm:block" style={{ animationDelay: '4.5s' }}>
          <Image src="/images/dragons/silver_dragon_lv5.png" alt="Silver Dragon" fill className="object-contain" style={{ imageRendering: 'pixelated' }} />
        </div>

        <div className="relative z-10 w-full text-center py-8 mb-4 animate-fade-in-up pointer-events-none">
          <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-[#F2E5C8] drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] mb-2">
            수학 마을 (이전 페이지)
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
            <div className="bg-[#E8DCC4] w-full max-w-sm rounded-lg p-6 retro-border shadow-2xl animate-scale-up relative text-black">
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
                        onClick={() => {
                          setClassId(selectedCard.id);
                          setView('create');
                        }}
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

  // B. CHARACTER CREATE VIEW
  if (view === 'create') {
    if (isComplete) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#A0E8AF] font-retro text-center text-black">
          <h1 className="text-3xl font-bold mb-6 text-black bg-white p-4 retro-border-sm">
            캐릭터 생성이 완료되었습니다!
          </h1>
          <p className="text-xl text-black mb-8 font-bold">
            처음 화면에서 기존 데이터로 로그인해 주세요.
          </p>
          <button 
            onClick={() => {
              resetCreateFlow();
              setView('home');
            }}
            className="retro-btn retro-btn-primary text-xl px-8 py-4"
          >
            처음으로 돌아가기
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-between min-h-screen p-4 sm:p-6 bg-blue-50/50 font-retro overflow-x-hidden text-black">
        {/* Top title */}
        <div className="w-full max-w-md text-center mt-4">
          <h2 className="text-2xl font-bold text-gray-800 retro-text-shadow-sm">새로운 캐릭터 생성</h2>
          <div className="w-full h-4 bg-gray-200 retro-border-sm mt-4">
            <div 
              className="h-full bg-[#3b82f6] transition-all duration-300" 
              style={{ width: `${(createStep / 4) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm font-bold text-gray-600 mt-2">단계: {createStep} / 4</p>
        </div>

        {/* Content Box */}
        <div className="w-full max-w-md my-6 p-4 sm:p-6 bg-white/90 rounded-2xl retro-border shadow-xl min-h-[400px] flex flex-col justify-center relative">
          
          {createStep === 1 && (
            <div className="animate-fade-in text-center h-full flex flex-col justify-center">
              <h3 className="text-xl mb-8 font-bold text-black">함께할 알을 선택하세요!</h3>
              <div className="grid grid-cols-2 gap-6">
                {EGGS.map(egg => (
                  <div 
                    key={egg.id} 
                    onClick={() => setSelectedEgg(egg.id)}
                    className={`flex flex-col items-center justify-center p-6 h-40 cursor-pointer rounded-2xl transition-all ${selectedEgg === egg.id ? 'bg-blue-100 retro-border scale-105' : 'hover:bg-gray-100 retro-border-sm'}`}
                  >
                    <div className="relative w-20 h-20 mb-2">
                      <Image src={`/images/dragons/${egg.id}_dragon_lv1.png`} alt={egg.name} fill style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                    </div>
                    {selectedEgg === egg.id && (
                      <span className="mt-4 font-bold text-lg text-blue-700 animate-pulse">{egg.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="animate-fade-in text-center">
              <h3 className="text-xl mb-2 font-bold text-black">나를 설명하는 단어 3개 고르기</h3>
              <p className="text-sm text-gray-500 mb-6">({selectedPersonalities.length}/3)</p>
              <div className="flex flex-col gap-6 max-h-[50vh] overflow-y-auto no-scrollbar pb-4 px-2">
                {Object.entries(PERSONALITIES).map(([category, words]) => (
                  <div key={category} className="text-left">
                    <h4 className="text-md font-bold mb-2 text-indigo-800">{category} 계열</h4>
                    <div className="flex flex-wrap gap-2">
                      {words.map(w => {
                        const isSelected = selectedPersonalities.includes(w);
                        const isMax = selectedPersonalities.length >= 3 && !isSelected;
                        return (
                          <button
                            key={w}
                            onClick={() => togglePersonality(w)}
                            disabled={isMax}
                            className={`px-3 py-2 text-sm rounded-full font-bold transition-all border-2 ${isSelected ? 'bg-[#3b82f6] text-white border-black' : isMax ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-black border-black hover:bg-gray-100'}`}
                          >
                            {w}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div className="animate-fade-in text-center">
              <h3 className="text-xl mb-4 font-bold text-black">나의 꿈, 직업군 선택하기</h3>
              <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto no-scrollbar pb-4 px-2">
                {JOBS.map(job => {
                  const isSelected = selectedJob === job.id;
                  return (
                    <div key={job.id} className="w-full text-left">
                      <button
                        onClick={() => setSelectedJob(job.id)}
                        className={`w-full flex items-center p-3 rounded-xl transition-all text-black ${isSelected ? 'bg-yellow-100 retro-border scale-[1.02]' : 'bg-white retro-border-sm hover:bg-gray-50'}`}
                      >
                        <div className="relative w-12 h-12 mr-4 flex-shrink-0">
                          <Image src={job.icon} alt={job.name} fill className="object-contain" style={{ imageRendering: 'pixelated' }} />
                        </div>
                        <div>
                          <div className="font-bold text-lg">{job.name}</div>
                          <div className="text-xs text-gray-600 line-clamp-1">{job.desc}</div>
                        </div>
                      </button>
                      {isSelected && (
                        <div className="relative mt-2 p-3 bg-indigo-50 retro-border-sm rounded-xl ml-6 animate-fade-in">
                          <div className="absolute -top-2 left-6 w-4 h-4 bg-indigo-50 border-t-2 border-l-2 border-black transform rotate-45"></div>
                          <p className="text-xs sm:text-sm font-bold text-indigo-900 leading-relaxed relative z-10">
                            이 직업군에는 이런 멋진 일들이 있어요! 🌟<br/>
                            <span className="text-black font-normal">{job.sub}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {createStep === 4 && (
            <div className="animate-fade-in text-center flex flex-col items-center justify-center h-full">
              <h3 className="text-2xl mb-6 font-bold text-black">최종 확인</h3>
              
              <div className="bg-gray-100 p-6 retro-border-sm rounded-xl w-full text-left flex flex-col gap-4">
                <div className="flex items-center gap-4 border-b-2 border-gray-300 pb-4">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    {selectedEgg && (
                      <div className="relative w-full h-full">
                        <Image src={`/images/dragons/${selectedEgg}_dragon_lv1.png`} alt="Selected Egg" fill style={{ objectFit: 'contain', imageRendering: 'pixelated' }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">내가 고른 알</div>
                    <div className="font-bold text-xl">{EGGS.find(e => e.id === selectedEgg)?.name}</div>
                  </div>
                </div>
                
                <div className="border-b-2 border-gray-300 pb-4">
                  <div className="text-sm text-gray-500 mb-1">선택한 성격</div>
                  <div className="font-bold text-lg text-blue-600">{selectedPersonalities.join(', ')}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">희망 직업군</div>
                  <div className="flex items-center gap-2 text-black">
                    <div className="relative w-8 h-8">
                      {selectedJob && <Image src={JOBS.find(j => j.id === selectedJob)?.icon!} alt="Job" fill className="object-contain" />}
                    </div>
                    <div className="font-bold text-lg">{JOBS.find(j => j.id === selectedJob)?.name}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full mt-8">
                <button onClick={() => setShowCreateModal(true)} className="retro-btn retro-btn-success text-xl py-4 w-full">
                  이대로 확정할래요!
                </button>
                <button onClick={resetCreateFlow} className="retro-btn bg-gray-200 text-gray-700 text-lg py-3 w-full">
                  더 고민해볼래요
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Navigation Buttons (Step 1-3) */}
        {createStep < 4 && (
          <div className="w-full max-w-md flex justify-between gap-4 mb-4">
            <button 
              onClick={handlePrevStep}
              className={`flex-1 py-4 bg-gray-300 text-gray-700 font-bold rounded-xl text-lg retro-border-interactive ${createStep === 1 ? 'invisible' : ''}`}
            >
              이전으로
            </button>
            <button 
              onClick={handleNextStep}
              disabled={isNextDisabled()}
              className={`flex-1 py-4 font-bold rounded-xl text-lg retro-border-interactive transition-all ${isNextDisabled() ? 'bg-indigo-300 text-white opacity-50 cursor-not-allowed' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
            >
              다음 단계로
            </button>
          </div>
        )}

        {/* Back Button (Always shown at bottom to exit creation) */}
        <div className="mt-4">
          <button 
            onClick={() => {
              resetCreateFlow();
              setView('home');
            }}
            className="text-gray-500 hover:text-black underline font-bold"
          >
            돌아가기 (처음 화면)
          </button>
        </div>

        {/* Register input modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#E8DCC4] w-full max-w-sm rounded-lg p-6 retro-border shadow-2xl animate-scale-up text-black">
              <h3 className="text-2xl font-bold text-black mb-4 border-b-4 border-black pb-2">가입 정보 입력</h3>
              <p className="text-sm font-bold text-gray-700 mb-6">마을에 입장하기 위한 학번과 비밀번호를 설정해주세요.</p>
              
              <form onSubmit={submitProfile} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">학번 (예: 2119)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={createStudentId}
                    onChange={(e) => setCreateStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full p-4 text-xl retro-border-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50 text-center bg-white text-black"
                    placeholder="숫자 4자리"
                  />
                </div>
                {createStudentId.endsWith('45') && (
                  <div>
                    <label className="block text-sm font-bold text-black mb-1">초기 레벨 (테스트용)</label>
                    <select 
                      value={testLevel} 
                      onChange={(e) => setTestLevel(Number(e.target.value))}
                      className="w-full p-4 text-xl retro-border-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50 text-center bg-white text-black"
                    >
                      {[1,2,3,4,5].map(l => <option key={l} value={l}>Lv {l}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-black mb-1">비밀번호</label>
                  <input
                    type="password"
                    required
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full p-4 text-xl retro-border-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50 text-center bg-white text-black"
                    placeholder="******"
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 retro-btn bg-gray-300 py-3">취소</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 retro-btn retro-btn-primary py-3">
                    {isSubmitting ? '처리중...' : '생성 완료'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // C. VILLAGE VIEW
  if (view === 'village') {
    return (
      <div className={`min-h-screen ${themeStyles.bg} text-black font-retro font-bold relative overflow-x-hidden transition-colors duration-1000`}>
        <div className="absolute top-0 w-full h-40 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-0"></div>
        
        <header className="sticky top-0 z-50 w-full bg-[#E8DCC4] retro-border-sm flex justify-between items-center p-3 sm:p-4 shadow-lg text-black">
          <button 
            onClick={() => setView('home')}
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
          {/* My House Section */}
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

          {/* Library Section */}
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

          {/* Our Class Village section */}
          <section className="bg-white/80 rounded-2xl p-4 sm:p-6 retro-border shadow-xl min-h-[400px]">
            <h2 className="text-xl sm:text-2xl mb-6 bg-white inline-block px-4 py-2 retro-border-sm relative z-10">
              우리 반 마을 둘러보기
            </h2>
            
            <div className={`grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center ${themeStyles.ground} p-4 retro-border-sm rounded-xl min-h-[300px]`}>
              {profiles.map(renderMannequin)}
            </div>
          </section>
        </main>

        {/* Student Profile Card Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedStudent(null)}>
            <div className="bg-[#E8DCC4] w-full max-w-sm rounded-xl p-6 retro-border shadow-2xl relative text-black" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="absolute top-2 right-4 text-black hover:text-red-600 font-bold text-2xl w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4 bg-white rounded-full retro-border-sm p-2 shadow-inner flex items-center justify-center">
                  <Image 
                    src={`/images/humans/${selectedStudent.dragon_type}_human_front.png`} 
                    alt={selectedStudent.student_id}
                    fill
                    className="object-contain"
                    style={{ imageRendering: 'pixelated' }}
                    onError={(e) => { e.currentTarget.src = "/images/student_avatar.png" }}
                  />
                  <div className="absolute -bottom-4 -right-4 w-16 h-16 animate-float z-20 pointer-events-none drop-shadow-md">
                    <Image 
                      src={`/images/dragons/${selectedStudent.dragon_type}_dragon_lv${selectedStudent.level}.png`}
                      alt="Dragon Pet"
                      fill
                      className="object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-black mb-2">{selectedStudent.student_id}</h3>
                <div className="bg-white/50 w-full p-4 rounded retro-border-sm text-left flex flex-col gap-2 text-black">
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

  // D. TEACHER VIEW
  if (view === 'teacher') {
    return (
      <div className="min-h-screen p-8 bg-[#A0E8AF] font-retro text-black">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8 bg-white p-4 retro-border-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-4 border-black">
            <h1 className="text-3xl font-bold">
              👨‍🏫 선생님 연구소 (학생 관리)
            </h1>
            <button 
              onClick={() => setView('home')}
              className="bg-gray-200 text-black px-6 py-2 border-2 border-black hover:bg-gray-300 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
            >
              뒤로가기
            </button>
          </div>

          {teacherLoading ? (
            <div className="text-center text-xl font-bold bg-white p-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              데이터를 불러오는 중...
            </div>
          ) : Object.keys(groupedProfiles).length === 0 ? (
            <div className="text-center text-xl font-bold bg-white p-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              가입된 학생이 없습니다.
            </div>
          ) : (
            Object.keys(groupedProfiles).sort().map(prefix => (
              <div key={prefix} className="mb-10 bg-white p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-2xl font-bold mb-4 border-b-4 border-black pb-2 flex items-center gap-2">
                  🏫 {getTeacherClassName(prefix)} <span className="text-lg text-gray-600">({groupedProfiles[prefix].length}명)</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border-4 border-black">
                    <thead>
                      <tr className="bg-green-200 border-b-4 border-black">
                        <th className="p-3 border-r-4 border-black text-center w-16">번호</th>
                        <th className="p-3 border-r-4 border-black w-24">학번</th>
                        <th className="p-3 border-r-4 border-black">캐릭터 (종)</th>
                        <th className="p-3 border-r-4 border-black">성향</th>
                        <th className="p-3 border-r-4 border-black">직업군</th>
                        <th className="p-3 border-r-4 border-black text-center w-16">레벨</th>
                        <th className="p-3 text-center w-32">비밀번호</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedProfiles[prefix].map(profile => {
                        const numberStr = profile.student_id.substring(profile.student_id.length - 2);
                        const isShowing = showPasswordMap[profile.student_id];
                        
                        return (
                          <tr key={profile.student_id} className="border-b-4 border-black last:border-b-0 hover:bg-green-50 transition-colors">
                            <td className="p-3 border-r-4 border-black text-center font-bold">
                              {parseInt(numberStr, 10)}
                            </td>
                            <td className="p-3 border-r-4 border-black font-bold">
                              {profile.student_id}
                            </td>
                            <td className="p-3 border-r-4 border-black capitalize">
                              {profile.dragon_type}
                            </td>
                            <td className="p-3 border-r-4 border-black">
                              {profile.personality.join(', ')}
                            </td>
                            <td className="p-3 border-r-4 border-black">
                              {profile.job_group}
                            </td>
                            <td className="p-3 border-r-4 border-black text-center font-bold text-blue-600">
                              {profile.level}
                            </td>
                            <td className="p-3 text-center">
                              {isShowing ? (
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="font-bold text-red-600 text-lg tracking-widest bg-yellow-100 px-2 py-1 w-full border-2 border-black">{profile.password}</span>
                                  <button 
                                    onClick={() => togglePassword(profile.student_id)}
                                    className="text-xs bg-gray-200 border-2 border-black w-full py-1 hover:bg-gray-300 active:translate-y-px"
                                  >
                                    숨기기
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => togglePassword(profile.student_id)}
                                  className="w-full bg-black text-white px-2 py-2 border-2 border-black hover:bg-gray-800 active:translate-y-px"
                                >
                                  조회
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}
