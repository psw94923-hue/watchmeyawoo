"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  student_id: string;
  password?: string;
  dragon_type: string;
  personality: string[];
  job_group: string;
  level: number;
};

export default function TeacherAdminPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('student_id, password, dragon_type, personality, job_group, level')
      .order('student_id', { ascending: true });

    if (error) {
      console.error("Error fetching profiles:", error);
    } else if (data) {
      setProfiles(data);
    }
    setLoading(false);
  };

  const togglePassword = (studentId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Group by class. Assuming student_id format: Grade(1) + Class(N) + Number(2)
  // We'll extract all but the last 2 digits as the class prefix.
  const groupedProfiles = profiles.reduce((acc, profile) => {
    const prefix = profile.student_id.substring(0, profile.student_id.length - 2);
    if (!acc[prefix]) {
      acc[prefix] = [];
    }
    acc[prefix].push(profile);
    return acc;
  }, {} as Record<string, Profile[]>);

  // Helper to parse class name from prefix. e.g., '21' -> '2학년 1반'
  const getClassName = (prefix: string) => {
    if (prefix.length >= 2) {
      const grade = prefix.charAt(0);
      const classNum = prefix.substring(1);
      return `${grade}학년 ${classNum}반`;
    }
    return `${prefix}반`;
  };

  return (
    <div className="min-h-screen p-8 bg-[#A0E8AF] font-retro text-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-4 retro-border-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-4 border-black">
          <h1 className="text-3xl font-bold">
            👨‍🏫 선생님 연구소 (학생 관리)
          </h1>
          <button 
            onClick={() => router.push('/')}
            className="bg-gray-200 text-black px-6 py-2 border-2 border-black hover:bg-gray-300 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
          >
            뒤로가기
          </button>
        </div>

        {loading ? (
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
                🏫 {getClassName(prefix)} <span className="text-lg text-gray-600">({groupedProfiles[prefix].length}명)</span>
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
