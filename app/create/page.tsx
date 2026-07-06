"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const EGGS = [
  { id: "black", name: "검은색 알", color: "#333333" },
  { id: "blue", name: "푸른색 알", color: "#3b82f6" },
  { id: "silver", name: "흰색 알", color: "#f8fafc" },
  { id: "red", name: "붉은색 알", color: "#ef4444" },
];

// SVG EggIcon removed in favor of actual sprite images

const PERSONALITIES = {
  따뜻함: ["다정한", "친절한", "배려심 깊은", "남을 잘 돕는", "선한"],
  에너지: ["활기찬", "긍정적인", "장난기 많은", "사교적인", "자신감 넘치는"],
  신중함: ["차분한", "꼼꼼한", "진지한", "조용한", "약속을 잘 지키는"],
  창의성: ["호기심 많은", "아이디어가 많은", "자유로운", "독창적인", "도전을 좋아하는"],
};

const JOBS = [
  { id: "Education", name: "교육", icon: "/images/job_edu.png", desc: "지식과 마음을 나누며 사람을 키우는 직업군", sub: "학교 선생님, 학원 강사, 대학교수, 청소년 상담사 등" },
  { id: "Medicine", name: "의료", icon: "/images/job_med.png", desc: "인간과 동물의 건강과 생명을 지키는 직업군", sub: "의사, 간호사, 약사, 물리치료사, 임상병리사 등" },
  { id: "Art", name: "예술", icon: "/images/job_art.png", desc: "세상을 더 아름답고 즐겁게 만드는 직업군", sub: "웹툰 작가, 일러스트레이터, 디자이너, 작곡가 등" },
  { id: "Tech", name: "기술 공학", icon: "/images/job_tech.png", desc: "새로운 기술을 만들고 시스템을 관리하는 직업군", sub: "프로그래머, 로봇 공학자, 인공지능 연구원 등" },
  { id: "Sport", name: "스포츠", icon: "/images/job_sport.png", desc: "몸을 움직이고 문화를 전파하며 활력을 주는 직업군", sub: "운동선수, 감독/코치, 심판, 댄서 등" },
  { id: "Nature", name: "농어업 및 자연", icon: "/images/job_nature.png", desc: "자연과 함께하며 생명을 기르고 환경을 지키는 직업군", sub: "스마트팜 운영자, 농부, 어부, 사육사 등" },
  { id: "Service", name: "서비스 경영", icon: "/images/job_service.png", desc: "사람들의 생활을 편리하게 돕고 경제를 움직이는 직업군", sub: "요리사, 미용사, 은행원, 마케터, 창업가 등" },
];

export default function CreateCharacterPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [selectedEgg, setSelectedEgg] = useState<string | null>(null);
  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [testLevel, setTestLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const togglePersonality = (word: string) => {
    if (selectedPersonalities.includes(word)) {
      setSelectedPersonalities(prev => prev.filter(w => w !== word));
    } else {
      if (selectedPersonalities.length < 3) {
        setSelectedPersonalities(prev => [...prev, word]);
      }
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedEgg(null);
    setSelectedPersonalities([]);
    setSelectedJob(null);
    setShowModal(false);
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !password) return;
    
    setIsSubmitting(true);
    
    // Validate studentId based on classId
    if (typeof window !== 'undefined') {
      const classId = new URLSearchParams(window.location.search).get('classId');
      if (classId && classId !== 'teacher') {
        const classNum = classId.replace('class-', '');
        const expectedPrefix = `2${classNum}`;
        if (!studentId.startsWith(expectedPrefix)) {
          alert(`${classNum}반 학생은 ${expectedPrefix}로 시작하는 학번만 생성할 수 있습니다!`);
          setIsSubmitting(false);
          return;
        }
      }
    }
    
    const finalLevel = studentId.endsWith('45') ? testLevel : 1;
    
    const { error } = await supabase.from('profiles').insert([
      {
        student_id: studentId,
        password: password,
        dragon_type: selectedEgg, // DB에는 black, blue, silver, red 로 저장됨 (추후 용으로 진화할 때 사용)
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
      setShowModal(false);
      setIsComplete(true);
    }
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#A0E8AF] font-retro text-center">
        <h1 className="text-3xl font-bold mb-6 text-black bg-white p-4 retro-border-sm">
          캐릭터 생성이 완료되었습니다!
        </h1>
        <p className="text-xl text-black mb-8 font-bold">
          처음 화면에서 기존 데이터로 로그인해 주세요.
        </p>
        <button 
          onClick={() => router.push('/')}
          className="retro-btn retro-btn-primary text-xl px-8 py-4"
        >
          처음으로 돌아가기
        </button>
      </div>
    );
  }

  const isNextDisabled = () => {
    if (step === 1) return !selectedEgg;
    if (step === 2) return selectedPersonalities.length !== 3;
    if (step === 3) return !selectedJob;
    return false;
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-4 sm:p-6 bg-blue-50/50 font-retro overflow-x-hidden">
      
      {/* 상단: 타이틀 및 단계 표시 바 */}
      <div className="w-full max-w-md text-center mt-4">
        <h2 className="text-2xl font-bold text-gray-800 retro-text-shadow-sm">새로운 캐릭터 생성</h2>
        <div className="w-full h-4 bg-gray-200 retro-border-sm mt-4">
          <div 
            className="h-full bg-[#3b82f6] transition-all duration-300" 
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
        <p className="text-sm font-bold text-gray-600 mt-2">단계: {step} / 4</p>
      </div>

      {/* 중앙: 메인 인터랙션 콘텐츠 영역 */}
      <div className="w-full max-w-md my-6 p-4 sm:p-6 bg-white/90 rounded-2xl retro-border shadow-xl min-h-[400px] flex flex-col justify-center relative">
        
        {step === 1 && (
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

        {step === 2 && (
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

        {step === 3 && (
          <div className="animate-fade-in text-center">
            <h3 className="text-xl mb-4 font-bold text-black">나의 꿈, 직업군 선택하기</h3>
            <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto no-scrollbar pb-4 px-2">
              {JOBS.map(job => {
                const isSelected = selectedJob === job.id;
                return (
                  <div key={job.id} className="w-full text-left">
                    <button
                      onClick={() => setSelectedJob(job.id)}
                      className={`w-full flex items-center p-3 rounded-xl transition-all ${isSelected ? 'bg-yellow-100 retro-border scale-[1.02]' : 'bg-white retro-border-sm hover:bg-gray-50'}`}
                    >
                      <div className="relative w-12 h-12 mr-4 flex-shrink-0">
                        <Image src={job.icon} alt={job.name} fill className="object-contain" style={{ imageRendering: 'pixelated' }} />
                      </div>
                      <div>
                        <div className="font-bold text-lg">{job.name}</div>
                        <div className="text-xs text-gray-600 line-clamp-1">{job.desc}</div>
                      </div>
                    </button>
                    {/* 세부 직업 말풍선 */}
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

        {step === 4 && (
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
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    {selectedJob && <Image src={JOBS.find(j => j.id === selectedJob)?.icon!} alt="Job" fill className="object-contain" />}
                  </div>
                  <div className="font-bold text-lg">{JOBS.find(j => j.id === selectedJob)?.name}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full mt-8">
              <button onClick={() => setShowModal(true)} className="retro-btn retro-btn-success text-xl py-4 w-full">
                이대로 확정할래요!
              </button>
              <button onClick={resetFlow} className="retro-btn bg-gray-200 text-gray-700 text-lg py-3 w-full">
                더 고민해볼래요
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 하단: 네비게이션 버튼 영역 (1~3단계에서만 노출) */}
      {step < 4 && (
        <div className="w-full max-w-md flex justify-between gap-4 mb-4">
          <button 
            onClick={handlePrev}
            className={`flex-1 py-4 bg-gray-300 text-gray-700 font-bold rounded-xl text-lg retro-border-interactive ${step === 1 ? 'invisible' : ''}`}
          >
            이전으로
          </button>
          <button 
            onClick={handleNext}
            disabled={isNextDisabled()}
            className={`flex-1 py-4 font-bold rounded-xl text-lg retro-border-interactive transition-all ${isNextDisabled() ? 'bg-indigo-300 text-white opacity-50 cursor-not-allowed' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
          >
            다음 단계로
          </button>
        </div>
      )}

      {/* 가입 완료용 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#E8DCC4] w-full max-w-sm rounded-lg p-6 retro-border shadow-2xl animate-scale-up">
            <h3 className="text-2xl font-bold text-black mb-4 border-b-4 border-black pb-2">가입 정보 입력</h3>
            <p className="text-sm font-bold text-gray-700 mb-6">마을에 입장하기 위한 학번과 비밀번호를 설정해주세요.</p>
            
            <form onSubmit={submitProfile} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">학번 (예: 2119)</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full p-4 text-xl retro-border-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50 text-center"
                  placeholder="숫자 4자리"
                />
              </div>
              {studentId.endsWith('45') && (
                <div>
                  <label className="block text-sm font-bold text-black mb-1">초기 레벨 (테스트용)</label>
                  <select 
                    value={testLevel} 
                    onChange={(e) => setTestLevel(Number(e.target.value))}
                    className="w-full p-4 text-xl retro-border-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50 text-center bg-white"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 text-xl retro-border-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50 text-center"
                  placeholder="******"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 retro-btn bg-gray-300 py-3">취소</button>
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
