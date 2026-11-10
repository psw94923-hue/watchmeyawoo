"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

interface BranchItem {
  id: number;
  code: string;
  name: string;
  shortName: string;
  emoji: string;
  badgeColor: string;
  tag: string;
  newsTitle: string;
  newsSummary: string;
  baseDate: string;
  baseTotal: number;
  recentDate: string;
  recentTotal: number;
  urlPath: string;
}

const BRANCHES: BranchItem[] = [
  {
    id: 1,
    code: "1지점",
    name: "달콤베이커리 학교앞점",
    shortName: "학교앞점",
    emoji: "🎒",
    badgeColor: "bg-rose-600 text-white",
    tag: "긴급 속보",
    newsTitle: '"창가 3번 자리 고백 성공률 100%?"... 등교 전 가방 줄세우기 대란',
    newsSummary:
      "11월 11일 고백 타이밍을 노리는 10대 학생들이 아침 7시부터 가방 오픈런 대기줄을 서며 방과 후 매장 마비 위기 발생",
    baseDate: "8월 23일 (방학 중)",
    baseTotal: 30,
    recentDate: "12월 24일 (크리스마스 이브)",
    recentTotal: 90,
    urlPath: "/bakery-1.html",
  },
  {
    id: 2,
    code: "2지점",
    name: "달콤베이커리 해변공원점",
    shortName: "해변공원점",
    emoji: "🌊",
    badgeColor: "bg-sky-600 text-white",
    tag: "단독",
    newsTitle: "빵 낚아채는 '조폭 갈매기떼' 해변 점령... 야외 취식 금지에 실내 피난 속출",
    newsSummary:
      "거대 갈매기떼 출몰과 해변 야외 취식 전면 금지령으로 20~30대 관광객·연인들이 매장 실내로 한꺼번에 대피해 전 좌석 만석",
    baseDate: "1월 20일 (겨울 비수기)",
    baseTotal: 40,
    recentDate: "7월 23일 (여름 성수기)",
    recentTotal: 200,
    urlPath: "/bakery-2.html",
  },
  {
    id: 3,
    code: "3지점",
    name: "달콤베이커리 오피스점",
    shortName: "오피스점",
    emoji: "🏢",
    badgeColor: "bg-amber-600 text-white",
    tag: "사회",
    newsTitle: "사내 게시판 '지하 1층 야근 귀신' 괴담 일파만파... 공포의 직장인들 단체 탈출",
    newsSummary:
      "사옥 지하 창고 키보드 소리 괴담 확산으로 겁에 질린 30~50대 직장인들이 지상 1층 달콤베이커리로 대피해 노트북 작업·수다 진풍경",
    baseDate: "7월 21일 (휴가철)",
    baseTotal: 100,
    recentDate: "11월 15일 (평일)",
    recentTotal: 300,
    urlPath: "/bakery-3.html",
  },
  {
    id: 4,
    code: "4지점",
    name: "달콤베이커리 실버타운점",
    shortName: "실버타운점",
    emoji: "🌿",
    badgeColor: "bg-emerald-600 text-white",
    tag: "연예",
    newsTitle: "톱 아이돌 멤버 '부모님 댁 깜짝 휴식' 목격담... 조용한 공원에 팬덤 성지순례",
    newsSummary:
      "빌보드 1위 아이돌의 테라스 커피 영수증 인증글 확산으로 10~20대 팬들과 기존 50~70대 동네 어르신 단골들이 뒤섞여 일대 혼란",
    baseDate: "9월 14일 (가을 산책철)",
    baseTotal: 150,
    recentDate: "12월 30일 (한겨울)",
    recentTotal: 100,
    urlPath: "/bakery-4.html",
  },
  {
    id: 5,
    code: "5지점",
    name: "달콤베이커리 감성핫플점",
    shortName: "감성핫플점",
    emoji: "🍓",
    badgeColor: "bg-pink-600 text-white",
    tag: "상권",
    newsTitle: "맞은편 라이벌 카페 '한정선 생과일 찹쌀떡' 오픈런 대란... 골목 마비 & 낙수효과",
    newsSummary:
      "맞은편 카페 한정 메뉴가 오전 조기 품절되자 100m 줄을 서던 20~30대 대기 인파가 대체 디저트를 찾아 달콤베이커리로 대거 유입",
    baseDate: "3월 2일 (개학/개강 직후)",
    baseTotal: 50,
    recentDate: "9월 25일 (추석 연휴)",
    recentTotal: 250,
    urlPath: "/bakery-5.html",
  },
];

export default function BakeryOpenClassHubPage() {
  const [origin, setOrigin] = useState<string>("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [qrBranch, setQrBranch] = useState<BranchItem | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleCopyUrl = async (branch: BranchItem) => {
    const fullUrl = `${origin || window.location.origin}${branch.urlPath}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(branch.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt("아래 지점 고유 주소를 복사하세요:", fullUrl);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fff7ef] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* TOP HERO BANNER */}
        <section className="rounded-3xl bg-gradient-to-r from-[#b3001b] via-[#d62828] to-[#ff7a1a] text-white p-6 sm:p-8 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs sm:text-sm font-extrabold mb-3">
                <span>🥐 중학교 1학년 수학 공개수업</span>
                <span>·</span>
                <span>도수분포표와 도수분포다각형 × AI 전략 수립</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">
                🚨 달콤베이커리 본사 긴급 경영 상황실 (지점별 게시판)
              </h1>
              <p className="text-white/90 text-sm sm:text-base leading-relaxed">
                모둠별로 배정된 <b>지점 번호(1~5지점)</b>를 확인하고 <b>우리 모둠의 지점 페이지</b>로 입장하세요.
                <br className="hidden sm:inline" />
                다른 지점에 들어가서 작성하면 데이터가 달라지니 꼭 자기 지점만 클릭해야 합니다!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <a
                href="https://gemini.google.com/gem/1Ju-GW0akq092VlP8Cwka58b-Z2v2Yojo?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-[#b3001b] hover:bg-orange-50 font-extrabold text-sm shadow-md transition-all"
              >
                <span>🤖</span>
                <span>본사 AI 젬스(Gems) 바로가기</span>
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-black/25 hover:bg-black/35 text-white font-bold text-xs text-center transition-all"
              >
                <span>🏠 수학 실험실 메인으로</span>
              </Link>
            </div>
          </div>
        </section>

        {/* BOARD / TABLE STYLE LIST FOR CLEAR BRANCH SEPARATION */}
        <section className="bg-white rounded-3xl border-2 border-[#e8ddd2] shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 bg-[#fff4ea] border-b border-[#e8ddd2] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                지점별 긴급 경영 속보 &amp; 활동 페이지 목록 (총 5개 지점)
              </h2>
            </div>
            <span className="text-xs sm:text-sm font-bold text-[#e2640a]">
              ※ 각 지점은 독립된 고유 주소(.html)로 분리되어 있습니다.
            </span>
          </div>

          <div className="divide-y divide-[#e8ddd2]">
            {BRANCHES.map((branch) => {
              const fullUrl = origin ? `${origin}${branch.urlPath}` : branch.urlPath;
              const isCopied = copiedId === branch.id;

              return (
                <div
                  key={branch.id}
                  className="p-5 sm:p-6 hover:bg-[#fffaf5] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* LEFT: BRANCH INFO & BREAKING NEWS */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold ${branch.badgeColor}`}
                      >
                        {branch.emoji} {branch.code} · {branch.shortName}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-extrabold">
                        [{branch.tag}]
                      </span>
                      <code className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200">
                        {branch.urlPath}
                      </code>
                    </div>

                    <h3 className="text-base sm:text-xl font-extrabold text-slate-900 mb-2.5 leading-snug">
                      <a
                        href={branch.urlPath}
                        className="hover:text-[#e63946] hover:underline transition-colors"
                      >
                        [{branch.name}] {branch.newsTitle}
                      </a>
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700">
                        📊 예전 기준: {branch.baseDate} (합계 {branch.baseTotal}명)
                      </span>
                      <span>➔</span>
                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 font-semibold text-rose-700 border border-rose-200/60">
                        📈 비교 시작값: {branch.recentDate} (합계 {branch.recentTotal}명)
                      </span>
                    </div>
                  </div>

                  {/* RIGHT: ACTION BUTTONS (DIRECT ENTER / COPY URL / QR) */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(branch)}
                      title={fullUrl}
                      className={`px-3.5 py-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        isCopied
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
                      }`}
                    >
                      {isCopied ? "✅ 주소 복사됨!" : "🔗 고유 주소 복사"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrBranch(branch)}
                      className="px-3.5 py-3 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-900 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                    >
                      📱 QR코드
                    </button>

                    <a
                      href={branch.urlPath}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-[#ff7a1a] hover:bg-[#e2640a] text-white text-sm sm:text-base font-extrabold shadow-sm transition-all whitespace-nowrap"
                    >
                      <span>{branch.shortName} 입장하기</span>
                      <span>➔</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* QUICK URL REFERENCE BOX FOR TEACHER */}
        <section className="bg-white rounded-2xl border border-[#e8ddd2] p-5 text-xs sm:text-sm text-slate-600">
          <h3 className="font-extrabold text-slate-900 mb-2">
            💡 선생님용 지점별 직통 URL 안내 (QR 제작 및 학생 배포용)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {BRANCHES.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-[#fffaf5] border border-[#e8ddd2] flex flex-col justify-between gap-1"
              >
                <div className="font-extrabold text-slate-900">
                  {b.code} · {b.shortName}
                </div>
                <div className="font-mono text-xs text-[#b3001b] break-all">
                  {origin ? `${origin}${b.urlPath}` : b.urlPath}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* QR CODE MODAL */}
      {qrBranch && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setQrBranch(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border-2 border-[#ff7a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-block px-3.5 py-1 rounded-full bg-red-100 text-red-700 font-extrabold text-sm mb-2">
              {qrBranch.emoji} {qrBranch.code} 전용 QR코드
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">
              {qrBranch.name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-5">
              태블릿·스마트폰 카메라로 스캔하면 바로 {qrBranch.shortName} 페이지로 이동합니다.
            </p>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 inline-block mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
                  `${origin || "https://swcoding.vercel.app"}${qrBranch.urlPath}`
                )}`}
                alt={`${qrBranch.name} QR Code`}
                width={240}
                height={240}
                className="mx-auto"
              />
            </div>

            <div className="bg-slate-100 rounded-xl p-2.5 font-mono text-xs sm:text-sm font-bold text-slate-800 break-all mb-5">
              {`${origin || ""}${qrBranch.urlPath}`}
            </div>

            <div className="flex gap-2">
              <a
                href={qrBranch.urlPath}
                className="flex-1 py-3 rounded-xl bg-[#ff7a1a] hover:bg-[#e2640a] text-white font-extrabold text-sm"
              >
                이 지점 바로 열기 ➔
              </a>
              <button
                type="button"
                onClick={() => setQrBranch(null)}
                className="px-5 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

