"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { GAME_STAGES, TUTORIAL_WORDS } from "./data";

export interface RankingRecord {
  id?: number | string;
  student_id: string;
  name: string;
  record_ms: number;
  formatted_time: string;
  created_at?: string;
}

// 타이머 포맷팅 유틸 (분 2자리 : 초 2자리 : 밀리초 2자리 = 총 6개 숫자)
export function formatTimer(ms: number) {
  const safeMs = Math.max(0, Math.floor(ms));
  const m = Math.floor(safeMs / 60000);
  const s = Math.floor((safeMs % 60000) / 1000);
  const cs = Math.floor((safeMs % 1000) / 10); // 1/100초 (00~99)
  const minutes = String(m).padStart(2, "0");
  const seconds = String(s).padStart(2, "0");
  const millis = String(cs).padStart(2, "0");
  return {
    minutes,
    seconds,
    millis,
    full: `${minutes}:${seconds}:${millis}`,
  };
}

export default function TypingClient() {
  // 화면 모드: 'home' | 'tutorial' | 'tutorial_complete' | 'game' | 'game_complete' | 'ranking'
  const [screen, setScreen] = useState<
    "home" | "tutorial" | "tutorial_complete" | "game" | "game_complete" | "ranking"
  >("home");

  // 타이머 상태 (밀리초 단위)
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const timerStartRef = useRef<number>(0);
  const timerAccumulatedRef = useRef<number>(0);
  const timerAnimRef = useRef<number | null>(null);

  // 튜토리얼 상태
  const [tutorialIndex, setTutorialIndex] = useState<number>(0);
  const [tutorialWords, setTutorialWords] = useState<string[]>([]);
  const [tutorialElapsedMs, setTutorialElapsedMs] = useState<number>(0);

  // 본 게임 상태 (1~5단계)
  const [currentStage, setCurrentStage] = useState<number>(0); // 0 to 4
  const [chosenSentences, setChosenSentences] = useState<string[]>([]);
  const [finalLapMs, setFinalLapMs] = useState<number>(0);

  // 입력값 및 상태
  const [userInput, setUserInput] = useState<string>("");
  const [showSpacingWarning, setShowSpacingWarning] = useState<boolean>(false);
  const [isInputError, setIsInputError] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 기록 등록 상태 (학번, 이름)
  const [studentId, setStudentId] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registeredId, setRegisteredId] = useState<string | number | null>(null);

  // 랭킹 목록 상태
  const [rankings, setRankings] = useState<RankingRecord[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState<boolean>(false);

  // 현재 제시 문장
  const currentTarget = useMemo(() => {
    if (screen === "tutorial") {
      return tutorialWords[tutorialIndex] || "";
    }
    if (screen === "game") {
      return chosenSentences[currentStage] || "";
    }
    return "";
  }, [screen, tutorialWords, tutorialIndex, chosenSentences, currentStage]);

  // 타이머 정밀 루프 구동
  useEffect(() => {
    if ((screen === "game" || screen === "tutorial") && !isPaused) {
      timerStartRef.current = performance.now();

      const updateTimer = () => {
        const now = performance.now();
        const delta = now - timerStartRef.current;
        const currentTotal = timerAccumulatedRef.current + delta;
        setElapsedMs(currentTotal);
        timerAnimRef.current = requestAnimationFrame(updateTimer);
      };

      timerAnimRef.current = requestAnimationFrame(updateTimer);
    } else {
      if (timerAnimRef.current !== null) {
        cancelAnimationFrame(timerAnimRef.current);
        timerAnimRef.current = null;
      }
    }

    return () => {
      if (timerAnimRef.current !== null) {
        cancelAnimationFrame(timerAnimRef.current);
        timerAnimRef.current = null;
      }
    };
  }, [screen, isPaused]);

  // 타이머 리셋 함수
  const resetTimer = () => {
    if (timerAnimRef.current !== null) {
      cancelAnimationFrame(timerAnimRef.current);
      timerAnimRef.current = null;
    }
    timerAccumulatedRef.current = 0;
    timerStartRef.current = 0;
    setElapsedMs(0);
    setIsPaused(false);
  };

  // 일시정지 토글
  const togglePause = () => {
    if (screen !== "game") return;
    if (!isPaused) {
      // 일시정지 처리: 지금까지의 경과 시간을 누적
      const now = performance.now();
      timerAccumulatedRef.current += now - timerStartRef.current;
      setIsPaused(true);
    } else {
      // 재개 처리: 시작점을 현재 시각으로 재설정
      timerStartRef.current = performance.now();
      setIsPaused(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  // 튜토리얼 시작
  const startTutorial = () => {
    // 단어 중 랜덤으로 3개 고르기
    const shuffled = [...TUTORIAL_WORDS].sort(() => 0.5 - Math.random());
    setTutorialWords(shuffled.slice(0, 3));
    setTutorialIndex(0);
    setUserInput("");
    setShowSpacingWarning(false);
    resetTimer();
    setScreen("tutorial");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 본 게임 시작
  const startGame = () => {
    // 1~5단계 각 단계별로 10개 문장 중 랜덤 1문장씩 선정
    const selected = GAME_STAGES.map((stage) => {
      const idx = Math.floor(Math.random() * stage.sentences.length);
      return stage.sentences[idx];
    });
    setChosenSentences(selected);
    setCurrentStage(0);
    setUserInput("");
    setShowSpacingWarning(false);
    resetTimer();
    setScreen("game");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 입력값 변경 및 실시간 검증 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserInput(val);
    setIsInputError(false);

    if (!currentTarget) {
      setShowSpacingWarning(false);
      return;
    }

    // 띄어쓰기 감지 로직
    const valTrimmed = val.replace(/\s+/g, "");
    const targetTrimmed = currentTarget.replace(/\s+/g, "");

    // 1. 공백 제거 시 문장 앞부분과 일치하는데, 원본과 공백 위치가 어긋나 있는 경우
    let spacingWrong = false;
    if (val.length > 0) {
      if (
        targetTrimmed.startsWith(valTrimmed) &&
        !currentTarget.startsWith(val)
      ) {
        spacingWrong = true;
      }
    }
    setShowSpacingWarning(spacingWrong);
  };

  // 제출 처리
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isPaused) return;

    if (userInput === currentTarget) {
      // 정답!
      if (screen === "tutorial") {
        if (tutorialIndex + 1 < 3) {
          setTutorialIndex((prev) => prev + 1);
          setUserInput("");
          setShowSpacingWarning(false);
          inputRef.current?.focus();
        } else {
          // 튜토리얼 3단어 완료
          const finalTime = timerAccumulatedRef.current + (performance.now() - timerStartRef.current);
          setTutorialElapsedMs(finalTime);
          resetTimer();
          setScreen("tutorial_complete");
        }
      } else if (screen === "game") {
        if (currentStage + 1 < 5) {
          // 다음 단계로 바로 진행 (추가 효과 없이 즉시)
          setCurrentStage((prev) => prev + 1);
          setUserInput("");
          setShowSpacingWarning(false);
          inputRef.current?.focus();
        } else {
          // 5단계 완료! 타이머 정지 및 랩 기록
          const now = performance.now();
          const finalTime = timerAccumulatedRef.current + (now - timerStartRef.current);
          setFinalLapMs(finalTime);
          if (timerAnimRef.current !== null) {
            cancelAnimationFrame(timerAnimRef.current);
            timerAnimRef.current = null;
          }
          setScreen("game_complete");
        }
      }
    } else {
      // 오답: 에러 표시 및 진동 피드백
      setIsInputError(true);
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(100);
      }
      setTimeout(() => setIsInputError(false), 500);
    }
  };

  // 실시간 랭킹 불러오기
  const fetchRankings = async () => {
    setIsLoadingRankings(true);
    try {
      const { data, error } = await supabase
        .from("typing_rankings")
        .select("*")
        .order("record_ms", { ascending: true })
        .limit(50);

      if (error) {
        console.warn("Supabase load fallback to localStorage:", error.message);
        loadLocalRankings();
      } else if (data) {
        setRankings(data as RankingRecord[]);
      }
    } catch (err) {
      console.warn("Fetch error, fallback to local:", err);
      loadLocalRankings();
    } finally {
      setIsLoadingRankings(false);
    }
  };

  // 로컬 랭킹 백업 로드
  const loadLocalRankings = () => {
    try {
      const saved = localStorage.getItem("local_typing_rankings");
      if (saved) {
        setRankings(JSON.parse(saved));
      } else {
        setRankings([]);
      }
    } catch {
      setRankings([]);
    }
  };

  // 랭킹 모달 열기
  const openRanking = () => {
    setScreen("ranking");
    fetchRankings();
  };

  // 기록 제출 (Supabase 저장)
  const handleRegisterRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = studentId.trim();
    const cleanName = studentName.trim();

    if (!cleanId || !cleanName) {
      alert("학번과 이름을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    const timeFormatted = formatTimer(finalLapMs).full;
    const newRecord: RankingRecord = {
      student_id: cleanId,
      name: cleanName,
      record_ms: Math.round(finalLapMs),
      formatted_time: timeFormatted,
    };

    try {
      const { data, error } = await supabase
        .from("typing_rankings")
        .insert([newRecord])
        .select();

      if (error) {
        console.warn("Supabase insert error, saving locally:", error.message);
        saveLocalRanking(newRecord);
      } else if (data && data[0]) {
        setRegisteredId(data[0].id);
      }
    } catch (err) {
      console.warn("Supabase error, fallback local:", err);
      saveLocalRanking(newRecord);
    } finally {
      setIsSubmitting(false);
      openRanking();
    }
  };

  // 로컬 저장 백업
  const saveLocalRanking = (record: RankingRecord) => {
    try {
      const saved = localStorage.getItem("local_typing_rankings");
      const list: RankingRecord[] = saved ? JSON.parse(saved) : [];
      const withId = { ...record, id: "local_" + Date.now() };
      list.push(withId);
      list.sort((a, b) => a.record_ms - b.record_ms);
      localStorage.setItem("local_typing_rankings", JSON.stringify(list));
      setRegisteredId(withId.id);
      setRankings(list);
    } catch (err) {
      console.error(err);
    }
  };

  // 문장 글자 단위 렌더링 (하단 입력창 가로 길이에 맞춰 자연스럽게 줄바꿈 및 오타 실시간 하이라이트)
  const renderSentenceWithFeedback = () => {
    const target = currentTarget;
    const input = userInput;

    return (
      <div className="w-full select-none">
        <div className="w-full bg-neutral-50/80 border-2 border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-neutral-200/70">
            <span className="text-xs font-bold text-neutral-500 tracking-wider">
              {screen === "tutorial" ? `연습 단어 (${tutorialIndex + 1}/3)` : `제시 문장 (${currentStage + 1}/5)`}
            </span>
            <span className="text-xs font-semibold text-neutral-500 font-mono">
              {input.length} / {target.length}자
            </span>
          </div>
          <p className="w-full text-lg sm:text-xl md:text-2xl font-medium leading-relaxed sm:leading-loose break-keep break-words text-left">
            {target.split("").map((char, i) => {
              const isTyped = i < input.length;
              const isCurrentCursor = i === input.length;

              // 1. 공백 처리: 줄바꿈이 자연스럽게 일어나도록 일반 공백 ' ' 유지
              if (char === " ") {
                if (isCurrentCursor) {
                  // 현재 공백 입력 차례인 경우 밑줄 커서 표시
                  return (
                    <span
                      key={i}
                      className="inline-block border-b-2 border-black min-w-[0.45em] text-transparent"
                    >
                      &nbsp;
                    </span>
                  );
                }

                if (isTyped && input[i] !== " ") {
                  // 공백 자리에 다른 문자를 잘못 입력한 경우 빨간색 강조
                  return (
                    <span
                      key={i}
                      className="inline-block bg-red-100 text-red-600 underline decoration-red-600 decoration-2 font-bold px-0.5 rounded"
                    >
                      {input[i]}
                    </span>
                  );
                }

                // 정상 공백 (입력 전/후)
                return (
                  <span
                    key={i}
                    className={isTyped ? "text-black" : "text-neutral-400"}
                  >
                    {" "}
                  </span>
                );
              }

              // 2. 일반 글자 처리
              let className = "transition-colors duration-75 ";
              if (isTyped) {
                if (input[i] === char) {
                  className += "text-black";
                } else {
                  className += "text-red-600 bg-red-100 underline decoration-red-600 decoration-2 font-bold px-0.5 rounded";
                }
              } else if (isCurrentCursor) {
                className += "text-black border-b-2 border-black font-semibold";
              } else {
                className += "text-neutral-400";
              }

              return (
                <span key={i} className={className}>
                  {char}
                </span>
              );
            })}

            {/* 목표 문장보다 더 길게 초과 입력한 경우 */}
            {input.length > target.length && (
              <span className="text-red-600 bg-red-200 line-through decoration-red-600 font-bold px-1 ml-0.5 rounded text-sm sm:text-base break-all">
                {input.slice(target.length)}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  };

  const formattedTimer = formatTimer(elapsedMs);

  return (
    <main className="w-full h-[100dvh] max-h-[100dvh] bg-white text-black flex flex-col items-center justify-between overflow-hidden p-4 sm:p-6 font-sans">
      {/* 1. 홈 화면 */}
      {screen === "home" && (
        <div className="w-full max-w-md my-auto flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
              모바일 타자 속도전
            </h1>
            <p className="text-base sm:text-lg font-semibold text-neutral-800">
              ⚡ 5단계 타자 챌린지 ⚡
            </p>
            <p className="text-xs text-neutral-500 pt-1">
              5단계 문장을 가장 빠르게 오타 없이 입력하여 1등에 도전하세요.
            </p>
          </div>

          <div className="w-full space-y-3 pt-2">
            <button
              id="start-game-btn"
              onClick={startGame}
              className="w-full py-4 px-6 bg-black text-white text-lg font-bold rounded-xl active:scale-[0.98] transition-transform shadow-md"
            >
              본 게임 시작하기
            </button>

            <button
              id="tutorial-btn"
              onClick={startTutorial}
              className="w-full py-3.5 px-6 bg-white border-2 border-black text-black text-base font-semibold rounded-xl active:bg-neutral-100 transition-colors"
            >
              튜토리얼 (연습 및 타이머 체크)
            </button>

            <button
              id="ranking-btn"
              onClick={openRanking}
              className="w-full py-3 px-6 bg-neutral-100 text-neutral-800 text-sm font-semibold rounded-xl active:bg-neutral-200 transition-colors"
            >
              실시간 랭킹 확인하기 🏆
            </button>
          </div>
        </div>
      )}

      {/* 2. 튜토리얼 완료 및 점검 화면 */}
      {screen === "tutorial_complete" && (
        <div className="w-full max-w-md my-auto flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center text-2xl font-bold">
            ✓
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-black">튜토리얼 완료!</h2>
            <p className="text-sm text-neutral-600">
              네트워크와 타이머가 정상적으로 작동하고 있습니다.
            </p>
            <div className="pt-2 text-3xl font-extrabold font-mono tracking-wider text-black">
              {formatTimer(tutorialElapsedMs).full}
            </div>
          </div>

          <div className="w-full space-y-3 pt-4">
            <button
              onClick={startGame}
              className="w-full py-4 px-6 bg-black text-white text-lg font-bold rounded-xl active:scale-[0.98] transition-transform shadow-md"
            >
              본 게임 시작하기
            </button>
            <button
              onClick={startTutorial}
              className="w-full py-3 px-6 bg-white border border-neutral-400 text-neutral-700 text-sm font-semibold rounded-xl active:bg-neutral-100 transition-colors"
            >
              다시 체크해보기
            </button>
          </div>
        </div>
      )}

      {/* 3. 본 경기(game) 또는 튜토리얼(tutorial) 진행 화면 */}
      {(screen === "game" || screen === "tutorial") && (
        <div className="w-full max-w-xl h-full flex flex-col justify-between py-2 sm:py-4">
          {/* 상단 바: 일시정지 & 타이머 & 건너뛰기 */}
          <div className="w-full flex items-center justify-between border-b border-neutral-200 pb-3">
            {screen === "game" ? (
              <div className="flex items-center space-x-2">
                <button
                  id="pause-btn"
                  onClick={togglePause}
                  className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 border border-neutral-300 rounded-lg active:bg-neutral-200"
                >
                  {isPaused ? "계속하기" : "일시정지"}
                </button>
                <span className="text-xs text-neutral-500 font-medium">
                  {currentStage + 1} / 5
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold bg-neutral-100 px-2.5 py-1 rounded-md text-neutral-700">
                  튜토리얼 ({tutorialIndex + 1}/3)
                </span>
                <button
                  onClick={startGame}
                  className="text-xs text-neutral-500 underline ml-2 active:text-black"
                >
                  건너뛰기
                </button>
              </div>
            )}

            {/* 오른쪽 상단 6자리 타이머 (분 2자리 : 초 2자리 : 밀리초 2자리) */}
            <div className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-black bg-neutral-50 px-3 py-1 rounded-lg border border-neutral-200">
              <span>{formattedTimer.minutes}</span>:
              <span>{formattedTimer.seconds}</span>:
              <span>{formattedTimer.millis}</span>
            </div>
          </div>

          {/* 중앙: 제시 문장 (하단 입력창 폭과 일치) */}
          <div className="w-full flex-1 flex flex-col items-center justify-center py-4">
            {renderSentenceWithFeedback()}
          </div>

          {/* 하단: 띄어쓰기 안내 알림 & 입력창 & 제출하기 버튼 */}
          <div className="w-full space-y-2 pb-1">
            {/* 띄어쓰기 알림 (화면 가리지 않는 전용 영역) */}
            <div className="h-6 flex items-center justify-center">
              {showSpacingWarning && (
                <p className="text-xs sm:text-sm font-semibold text-red-600 animate-pulse">
                  띄어쓰기를 다시 살펴보세요.
                </p>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className={`w-full flex items-center space-x-2 ${
                isInputError ? "animate-shake" : ""
              }`}
            >
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInputChange}
                disabled={isPaused}
                placeholder="여기를 터치하여 문장을 입력하세요"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="flex-1 min-w-0 bg-neutral-50 border-2 border-black text-black text-base sm:text-lg font-medium px-3.5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white placeholder:text-neutral-400 placeholder:text-sm"
              />
              <button
                type="submit"
                disabled={isPaused || userInput.length === 0}
                className="shrink-0 bg-black text-white text-base font-bold px-5 py-3 rounded-xl active:scale-95 disabled:opacity-40 disabled:active:scale-100 transition-all"
              >
                제출하기
              </button>
            </form>
          </div>

          {/* 일시정지 오버레이 (문장 가림 & 타이머 정지) */}
          {isPaused && (
            <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-black">일시정지 중</h3>
                <p className="text-sm text-neutral-600">
                  타이머가 멈추었습니다. 잠시 휴식을 취하세요.
                </p>
                <div className="pt-2 font-mono text-2xl font-bold text-black">
                  {formattedTimer.full}
                </div>
              </div>
              <button
                onClick={togglePause}
                className="py-3.5 px-8 bg-black text-white text-base font-bold rounded-xl active:scale-95 transition-transform shadow-md"
              >
                계속하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. 경기 완료 및 기록 등록 화면 */}
      {screen === "game_complete" && (
        <div className="w-full max-w-md my-auto flex flex-col items-center justify-center text-center space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase">
              Challenge Clear
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-black">
              5단계 완주 완료!
            </h2>
          </div>

          {/* 중앙에 크게 랩 타임 표시 */}
          <div className="w-full bg-neutral-50 border-2 border-black rounded-2xl p-6 shadow-sm">
            <p className="text-xs text-neutral-500 font-semibold mb-1">
              최종 타이머 기록
            </p>
            <div className="font-mono text-4xl sm:text-5xl font-black tracking-wider text-black">
              {formatTimer(finalLapMs).full}
            </div>
          </div>

          {/* 학번 & 이름 작성 폼 */}
          <form
            onSubmit={handleRegisterRecord}
            className="w-full space-y-3 text-left"
          >
            <div>
              <label
                htmlFor="student-id"
                className="block text-xs font-semibold text-neutral-700 mb-1"
              >
                학번 (예: 2101)
              </label>
              <input
                id="student-id"
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="2101"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-3 text-base font-medium focus:outline-none focus:border-black focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="student-name"
                className="block text-xs font-semibold text-neutral-700 mb-1"
              >
                이름 (예: 홍길동)
              </label>
              <input
                id="student-name"
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="홍길동"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-3 text-base font-medium focus:outline-none focus:border-black focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 mt-2 bg-black text-white text-base font-bold rounded-xl active:scale-[0.98] disabled:opacity-50 transition-all shadow-md"
            >
              {isSubmitting ? "랭킹 등록 중..." : "랭킹에 기록 등록하기"}
            </button>
          </form>

          <button
            onClick={() => setScreen("home")}
            className="text-xs text-neutral-500 underline pt-1"
          >
            등록하지 않고 홈으로 가기
          </button>
        </div>
      )}

      {/* 5. 실시간 랭킹 확인 화면 (모달 겸용) */}
      {screen === "ranking" && (
        <div className="w-full max-w-xl h-full flex flex-col justify-between py-2 sm:py-4">
          {/* 상단 헤더 */}
          <div className="w-full flex items-center justify-between border-b border-neutral-200 pb-3">
            <h2 className="text-xl font-extrabold text-black flex items-center gap-1.5">
              <span>🏆</span>
              <span>실시간 타자 랭킹</span>
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchRankings}
                disabled={isLoadingRankings}
                className="text-xs px-2.5 py-1.5 bg-neutral-100 rounded-lg font-semibold active:bg-neutral-200"
              >
                {isLoadingRankings ? "갱신 중" : "새로고침"}
              </button>
              <button
                onClick={() => setScreen("home")}
                className="text-xs px-2.5 py-1.5 bg-black text-white rounded-lg font-semibold active:bg-neutral-800"
              >
                홈으로
              </button>
            </div>
          </div>

          {/* 랭킹 표 (학번, 이름, 타이머 기록 빠른 순서) */}
          <div className="w-full flex-1 overflow-y-auto my-3 border border-neutral-200 rounded-xl">
            {isLoadingRankings && rankings.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-neutral-500">
                기록을 불러오는 중입니다...
              </div>
            ) : rankings.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-neutral-500">
                아직 등록된 랭킹 기록이 없습니다.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-100 text-neutral-700 font-semibold sticky top-0 border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-14">순위</th>
                    <th className="py-2.5 px-3">학번</th>
                    <th className="py-2.5 px-3">이름</th>
                    <th className="py-2.5 px-3 text-right">기록</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rankings.map((item, idx) => {
                    const rankNum = idx + 1;
                    const isMyRecord =
                      registeredId && item.id && item.id.toString() === registeredId.toString();

                    let rankBadge: React.ReactNode = (
                      <span className="font-semibold text-neutral-600">
                        {rankNum}
                      </span>
                    );
                    if (rankNum === 1) rankBadge = <span className="text-base">🥇 1</span>;
                    else if (rankNum === 2) rankBadge = <span className="text-base">🥈 2</span>;
                    else if (rankNum === 3) rankBadge = <span className="text-base">🥉 3</span>;

                    return (
                      <tr
                        key={item.id || idx}
                        className={`transition-colors ${
                          isMyRecord
                            ? "bg-neutral-100 font-bold border-l-4 border-black"
                            : rankNum <= 3
                            ? "bg-neutral-50/60"
                            : "hover:bg-neutral-50"
                        }`}
                      >
                        <td className="py-3 px-3 text-center whitespace-nowrap font-mono">
                          {rankBadge}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-neutral-800">
                          {item.student_id}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-black">
                          {item.name}
                          {isMyRecord && (
                            <span className="ml-1.5 text-[11px] bg-black text-white px-1.5 py-0.5 rounded font-normal">
                              내 기록
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-black">
                          {item.formatted_time}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 하단 다시 도전 버튼 */}
          <div className="w-full pt-1">
            <button
              onClick={startGame}
              className="w-full py-3.5 bg-black text-white text-base font-bold rounded-xl active:scale-[0.98] transition-transform"
            >
              새로 도전하기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
