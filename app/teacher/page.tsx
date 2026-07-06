"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function TeacherAdminPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#A0E8AF] font-retro text-center">
      <h1 className="text-3xl font-bold mb-6 text-black bg-white p-4 retro-border-sm">
        선생님 연구소 (관리자 페이지)
      </h1>
      <p className="text-xl text-black mb-8 font-bold">
        곧 맵 편집 기능과 학생 관리 기능이 추가될 예정입니다.
      </p>
      <button 
        onClick={() => router.push('/')}
        className="retro-btn bg-gray-200 text-black text-xl px-8 py-4"
      >
        처음으로 돌아가기
      </button>
    </div>
  );
}
