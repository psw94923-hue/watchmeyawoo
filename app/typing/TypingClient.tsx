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

// 교사 이름 포맷팅 ("박세원" -> "박세원 선생님")
export function formatTeacherName(name: string): string {
  const clean = name.trim();
  if (clean.endsWith("선생님") || clean.endsWith("교사") || clean.endsWith("쌤")) {
    return clean;
  }
  return `${clean} 선생님`;
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

  // 모바일 가상 키보드 높이 실시간 동기화 (iOS Safari & Android Galaxy 완벽 대응)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        // iOS Safari가 가상 키보드 활성화 시 전체 페이지를 위로 스크롤하는 것을 방지
        if (window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateHeight);
      window.visualViewport.addEventListener("scroll", updateHeight);
      updateHeight();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateHeight);
        window.visualViewport.removeEventListener("scroll", updateHeight);
      }
    };
  }, []);

  const handleInputFocus = () => {
    setTimeout(() => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    }, 50);
  };

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
  const [isServerConnected, setIsServerConnected] = useState<boolean | null>(null);

  // 세원쌤 기록, 학생 랭킹, 교사 랭킹 분류 및 1인 1최고기록 중복 제거
  const { sewonRecord, studentRankings, teacherRankings } = useMemo(() => {
    // 1. 세원쌤 공식 기록 탐색 (학번이 '세원')
    const sewonList = rankings.filter(
      (r) => r.student_id.trim().toLowerCase() === "세원"
    );
    let bestSewon: RankingRecord | null = null;
    if (sewonList.length > 0) {
      bestSewon = sewonList.reduce((best, curr) =>
        curr.record_ms < best.record_ms ? curr : best
      );
    }

    // 2. 교사 기록 (학번이 '선생님', '교사', '세원'이거나 이름에 '선생님'/'쌤'이 붙은 경우)
    const rawTeachers = rankings.filter(
      (r) =>
        r.student_id.trim() === "선생님" ||
        r.student_id.trim() === "교사" ||
        r.student_id.trim() === "세원" ||
        r.student_id.trim().includes("선생님") ||
        r.student_id.trim().includes("교사") ||
        r.name.trim().endsWith("선생님") ||
        r.name.trim().endsWith("쌤") ||
        (r.name.trim().includes("정하연") && r.student_id.trim() === "선생님")
    );
    // 교사 1인 1최고기록 (이름 기준 - 호칭 접미사 정규화하여 중복 방지)
    const teacherMap = new Map<string, RankingRecord>();
    for (const t of rawTeachers) {
      const key = t.name.trim().replace(/\s*선생님$/, "").replace(/\s*쌤$/, "");
      const existing = teacherMap.get(key);
      if (!existing || t.record_ms < existing.record_ms) {
        teacherMap.set(key, t);
      }
    }
    const sortedTeachers = Array.from(teacherMap.values()).sort(
      (a, b) => a.record_ms - b.record_ms
    );

    // 3. 학생 기록 (학번이 '선생님', '교사', '세원'이 아닌 모든 일반 학생 학번)
    const rawStudents = rankings.filter((r) => {
      const id = r.student_id.trim();
      const name = r.name.trim();

      // 교사 기록 제외
      if (
        id === "선생님" ||
        id === "교사" ||
        id === "세원" ||
        id.includes("선생님") ||
        id.includes("교사") ||
        name.endsWith("선생님") ||
        name.endsWith("쌤")
      ) {
        return false;
      }

      // 이전 잘못 등록되었던 정하연 교사 레코드(id: 12 등) 학생 목록에서 제외
      if (
        r.id === 12 ||
        name.includes("정하연") ||
        id === "✨️✨️" ||
        id === "✨✨"
      ) {
        return false;
      }

      return true;
    });
    // 학생 1인 1최고기록 (학번+이름 기준)
    const studentMap = new Map<string, RankingRecord>();
    for (const s of rawStudents) {
      const key = `${s.student_id.trim()}_${s.name.trim()}`;
      const existing = studentMap.get(key);
      if (!existing || s.record_ms < existing.record_ms) {
        studentMap.set(key, s);
      }
    }
    const sortedStudents = Array.from(studentMap.values()).sort(
      (a, b) => a.record_ms - b.record_ms
    );

    return {
      sewonRecord: bestSewon,
      studentRankings: sortedStudents,
      teacherRankings: sortedTeachers,
    };
  }, [rankings]);

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
        .limit(100);

      if (error) {
        console.warn("Supabase load fallback to localStorage:", error.message);
        setIsServerConnected(false);
        loadLocalRankings();
      } else if (data) {
        setIsServerConnected(true);
        // 서버 데이터와 로컬에만 보관된 미동기화 기록 병합
        const localRecords = getAllLocalTypingRecords();
        const rawServerList = (data as RankingRecord[]) || [];
        // 이전 잘못 등록되었던 구 정하연 학생 레코드(id: 12 등) 제외
        const serverList = rawServerList.filter(
          (r) =>
            r.id !== 12 &&
            !(r.name?.includes("정하연") && r.student_id !== "선생님") &&
            r.student_id?.trim() !== "✨️✨️" &&
            r.student_id?.trim() !== "✨✨"
        );

        // 서버에 아직 등록되지 않은 로컬 기록들만 추출
        const unsynced = localRecords.filter((localRec) => {
          return !serverList.some(
            (s) =>
              s.student_id?.trim() === localRec.student_id?.trim() &&
              s.name?.trim() === localRec.name?.trim() &&
              Math.abs(s.record_ms - localRec.record_ms) < 100
          );
        });

        const merged = [...serverList, ...unsynced];
        merged.sort((a, b) => a.record_ms - b.record_ms);
        setRankings(merged);

        // 로컬에 미전송된 기록이 있다면 백그라운드로 즉시 서버 업로드 시도
        if (unsynced.length > 0) {
          syncLocalRecordsToServer();
        }
      }
    } catch (err) {
      console.warn("Fetch error, fallback to local:", err);
      setIsServerConnected(false);
      loadLocalRankings();
    } finally {
      setIsLoadingRankings(false);
    }
  };

  // 로컬 브라우저 저장소의 모든 타자 기록 추출 헬퍼 (모든 키 전수 조사)
  const getAllLocalTypingRecords = (): RankingRecord[] => {
    if (typeof window === "undefined") return [];
    const records: RankingRecord[] = [];

    const tryAddRecord = (item: any) => {
      if (!item || typeof item !== "object") return;
      const student_id = String(item.student_id || "").trim();
      const name = String(item.name || "").trim();
      const record_ms = Number(item.record_ms) || 0;
      const formatted_time =
        String(item.formatted_time || "").trim() ||
        (record_ms > 0 ? formatTimer(record_ms).full : "");

      // 잘못 등록된 구 정하연 학생 레코드(id: 12 및 관련) 배제
      if (
        item.id === 12 ||
        student_id === "✨️✨️" ||
        student_id === "✨✨" ||
        (name.includes("정하연") && student_id !== "선생님")
      ) {
        return;
      }

      if (student_id && name && record_ms > 0) {
        if (
          !records.some(
            (r) =>
              r.student_id === student_id &&
              r.name === name &&
              Math.abs(r.record_ms - record_ms) < 100
          )
        ) {
          records.push({
            id: item.id || "local_" + Date.now(),
            student_id,
            name,
            record_ms,
            formatted_time,
          });
        }
      }
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const val = localStorage.getItem(key);
        if (!val || (!val.startsWith("[") && !val.startsWith("{"))) continue;
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsed.forEach(tryAddRecord);
          } else {
            tryAddRecord(parsed);
          }
        } catch {}
      }
    } catch (err) {
      console.warn("Storage inspect error:", err);
    }

    return records;
  };

  // 로컬 미동기화 기록들을 Supabase 서버로 조용히 자동 업로드
  const syncLocalRecordsToServer = async () => {
    try {
      const localRecords = getAllLocalTypingRecords();
      if (localRecords.length === 0) return;

      // 서버에 있는 현재 기록 목록 가져오기
      const { data: serverData } = await supabase
        .from("typing_rankings")
        .select("*")
        .limit(200);

      const serverList = (serverData as RankingRecord[]) || [];

      // 서버에 아직 등록되지 않은 로컬 기록들만 추출
      const unsynced = localRecords.filter((localRec) => {
        return !serverList.some(
          (s) =>
            s.student_id?.trim() === localRec.student_id?.trim() &&
            s.name?.trim() === localRec.name?.trim() &&
            Math.abs(s.record_ms - localRec.record_ms) < 100
        );
      });

      if (unsynced.length === 0) return;

      let uploadedCount = 0;
      for (const item of unsynced) {
        const { data, error } = await supabase
          .from("typing_rankings")
          .insert([
            {
              student_id: item.student_id,
              name: item.name,
              record_ms: item.record_ms,
              formatted_time: item.formatted_time || formatTimer(item.record_ms).full,
            },
          ])
          .select();

        if (!error && data && data[0]) {
          uploadedCount++;
          setIsServerConnected(true);
        }
      }

      if (uploadedCount > 0) {
        // 최신 서버 기록 갱신
        const { data: latest } = await supabase
          .from("typing_rankings")
          .select("*")
          .order("record_ms", { ascending: true })
          .limit(100);

        if (latest) {
          setRankings(latest as RankingRecord[]);
        }
      }
    } catch (err) {
      console.warn("Auto-sync local records failed:", err);
    }
  };

  // 새로고침 버튼 핸들러: 로컬 기록 자동 업로드 및 서버 랭킹 갱신 통합
  const handleRefresh = async () => {
    setIsLoadingRankings(true);
    try {
      await syncLocalRecordsToServer();
      await fetchRankings();
    } finally {
      setIsLoadingRankings(false);
    }
  };



  // 앱 로드 시 자동 랭킹 조회, 미전송 기록 동기화 및 실시간 업데이트 구독
  useEffect(() => {
    fetchRankings();
    syncLocalRecordsToServer();

    try {
      const channel = supabase
        .channel("typing_rankings_realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "typing_rankings" },
          () => {
            fetchRankings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn("Realtime subscription error:", err);
    }
  }, []);

  // 로컬 랭킹 백업 로드
  const loadLocalRankings = () => {
    try {
      const saved = localStorage.getItem("local_typing_rankings");
      if (saved) {
        const parsed = (JSON.parse(saved) as RankingRecord[]) || [];
        const filtered = parsed.filter(
          (r) =>
            r.id !== 12 &&
            !(r.name?.includes("정하연") && r.student_id !== "선생님") &&
            r.student_id?.trim() !== "✨️✨️" &&
            r.student_id?.trim() !== "✨✨"
        );
        setRankings(filtered);
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
    syncLocalRecordsToServer();
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
        setIsServerConnected(false);
        saveLocalRanking(newRecord);
      } else if (data && data[0]) {
        setIsServerConnected(true);
        setRegisteredId(data[0].id);
        saveLocalRecordWithId(data[0] as RankingRecord);
      }
    } catch (err) {
      console.warn("Supabase error, fallback local:", err);
      setIsServerConnected(false);
      saveLocalRanking(newRecord);
    } finally {
      setIsSubmitting(false);
      openRanking();
    }
  };

  // 로컬 저장 백업 (미연동 상태)
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

  // 서버에 성공적으로 저장된 기록을 로컬에도 캐시
  const saveLocalRecordWithId = (record: RankingRecord) => {
    try {
      const saved = localStorage.getItem("local_typing_rankings");
      const list: RankingRecord[] = saved ? JSON.parse(saved) : [];
      if (!list.some((r) => r.id === record.id)) {
        list.push(record);
        list.sort((a, b) => a.record_ms - b.record_ms);
        localStorage.setItem("local_typing_rankings", JSON.stringify(list));
      }
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
        <div className="w-full bg-neutral-50/80 border-2 border-neutral-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-neutral-200/70">
            <span className="text-[11px] sm:text-xs font-bold text-neutral-500 tracking-wider">
              {screen === "tutorial" ? `연습 단어 (${tutorialIndex + 1}/3)` : `제시 문장 (${currentStage + 1}/5)`}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 font-mono">
              {input.length} / {target.length}자
            </span>
          </div>
          <p className="w-full text-base sm:text-xl font-medium leading-relaxed sm:leading-loose break-keep break-words text-left">
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
    <main
      style={{
        height: viewportHeight ? `${viewportHeight}px` : "100dvh",
        maxHeight: viewportHeight ? `${viewportHeight}px` : "100dvh",
      }}
      className="w-full bg-white text-black flex flex-col items-center justify-between overflow-hidden p-3 sm:p-5 font-sans"
    >
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
        <div className="w-full max-w-xl h-full flex flex-col justify-between overflow-hidden">
          {/* 상단 바: 일시정지 & 타이머 & 건너뛰기 */}
          <div className="w-full shrink-0 flex items-center justify-between border-b border-neutral-200 pb-2">
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

          {/* 중앙/하단 워크스페이스: 제시 문장 카드가 입력창 바로 위에 찰떡처럼 밀착 배치 */}
          <div className="w-full flex-1 min-h-0 flex flex-col justify-end gap-1.5 sm:gap-2 pb-1">
            {/* 중앙: 제시 문장 (하단 입력창 바로 위 밀착) */}
            <div className="w-full">
              {renderSentenceWithFeedback()}
            </div>

            {/* 하단: 띄어쓰기 안내 알림 & 입력창 & 제출하기 버튼 */}
            <div className="w-full space-y-1">
              {/* 띄어쓰기 알림 (화면 가리지 않는 전용 영역) */}
              <div className="h-5 flex items-center justify-center">
                {showSpacingWarning && (
                  <p className="text-xs font-semibold text-red-600 animate-pulse">
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
                  onFocus={handleInputFocus}
                  disabled={isPaused}
                  placeholder="여기를 터치하여 문장을 입력하세요"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="flex-1 min-w-0 bg-neutral-50 border-2 border-black text-black text-base sm:text-lg font-medium px-3.5 py-2.5 sm:py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white placeholder:text-neutral-400 placeholder:text-xs sm:placeholder:text-sm"
                />
                <button
                  type="submit"
                  disabled={isPaused || userInput.length === 0}
                  className="shrink-0 bg-black text-white text-sm sm:text-base font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl active:scale-95 disabled:opacity-40 disabled:active:scale-100 transition-all"
                >
                  제출하기
                </button>
              </form>
            </div>
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
          <div className="w-full bg-neutral-50 border-2 border-black rounded-2xl p-5 shadow-sm space-y-1">
            <p className="text-xs text-neutral-500 font-semibold">
              최종 타이머 기록
            </p>
            <div className="font-mono text-4xl sm:text-5xl font-black tracking-wider text-black">
              {formatTimer(finalLapMs).full}
            </div>

            {/* 세원쌤 기록 도전 배너 */}
            <div className="pt-2">
              {sewonRecord && finalLapMs < sewonRecord.record_ms ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-black animate-pulse shadow-sm">
                  🎉 세원쌤을 이겼습니다! 🏆
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-200 text-neutral-700 text-xs font-semibold">
                  🎯 세원쌤 기록 도전!
                </span>
              )}
            </div>
          </div>

          {/* 학번 & 이름 작성 폼 */}
          <form
            onSubmit={handleRegisterRecord}
            className="w-full space-y-3 text-left"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="student-id"
                  className="block text-xs font-semibold text-neutral-800"
                >
                  학번 (선생님은 &apos;선생님&apos;)
                </label>
                <button
                  type="button"
                  onClick={() => setStudentId("선생님")}
                  className="text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:scale-95 px-2 py-0.5 rounded-md border border-amber-300 transition-all cursor-pointer shadow-2xs"
                >
                  👨‍🏫 선생님이시면 클릭
                </button>
              </div>
              <input
                id="student-id"
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="학생 예: 2101 / 선생님: 선생님"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-3 text-base font-medium focus:outline-none focus:border-black focus:bg-white placeholder:text-neutral-400 text-black"
              />
              <p className="text-[11px] text-neutral-600 mt-1.5 leading-snug">
                💡 학생은 <b>학번(예: 2101)</b>을, 선생님은 학번 칸에 <b>&apos;선생님&apos;</b>을 적어주세요.
              </p>
            </div>

            <div>
              <label
                htmlFor="student-name"
                className="block text-xs font-semibold text-neutral-800 mb-1"
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
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-3 text-base font-medium focus:outline-none focus:border-black focus:bg-white placeholder:text-neutral-400 text-black"
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
          <div className="w-full flex items-center justify-between border-b border-neutral-200 pb-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-black flex items-center gap-1.5">
                <span>🏆</span>
                <span>실시간 타자 랭킹</span>
              </h2>
              {isServerConnected === true && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  서버 연동됨
                </span>
              )}
              {isServerConnected === false && (
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  로컬 모드 (연결 대기)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={isLoadingRankings}
                className="text-xs px-2.5 py-1.5 bg-neutral-100 rounded-lg font-semibold active:bg-neutral-200 flex items-center gap-1 text-neutral-800 transition-colors"
              >
                <span>🔄</span>
                <span>{isLoadingRankings ? "갱신 중..." : "새로고침"}</span>
              </button>
              <button
                onClick={() => setScreen("home")}
                className="text-xs px-2.5 py-1.5 bg-black text-white rounded-lg font-semibold active:bg-neutral-800 transition-colors"
              >
                홈으로
              </button>
            </div>
          </div>



          {/* A. 상단 세원쌤 기록 배너 */}
          <div className="w-full mt-2.5 mb-1.5 bg-gradient-to-r from-neutral-900 to-black text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center text-lg sm:text-xl font-black shadow-inner">
                👑
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    TARGET BOSS
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    ({sewonRecord?.name ? formatTeacherName(sewonRecord.name) : "박세원 선생님"})
                  </span>
                </div>
                <div className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  세원쌤 공식 기록
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block font-medium">기준 기록</span>
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-wider">
                {sewonRecord ? sewonRecord.formatted_time : "도전 대기 중"}
              </span>
            </div>
          </div>

          {/* B. 2개 칸 분할 배치: 왼쪽 학생 기록 / 오른쪽 교사 기록 */}
          <div className="w-full flex-1 min-h-0 grid grid-cols-2 gap-2 sm:gap-3 my-1">
            {/* 1) 왼쪽: 학생 기록 칸 */}
            <div className="flex flex-col h-full bg-neutral-50/70 border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-neutral-100/90 px-2.5 py-2 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-1 font-bold text-xs sm:text-sm text-neutral-800 truncate">
                  <span>🎓</span>
                  <span>학생 기록</span>
                </div>
                <span className="text-[10px] font-semibold bg-white text-neutral-600 px-1.5 py-0.5 rounded-full border border-neutral-200 shrink-0">
                  {studentRankings.length}명
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-1 sm:p-1.5 space-y-1">
                {isLoadingRankings && studentRankings.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400 py-6">
                    불러오는 중...
                  </div>
                ) : studentRankings.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400 py-6 text-center px-2">
                    아직 등록된 학생 기록이 없습니다.
                  </div>
                ) : (
                  studentRankings.map((item, idx) => {
                    const rankNum = idx + 1;
                    const isMyRecord =
                      registeredId && item.id && item.id.toString() === registeredId.toString();

                    let rankIcon = <span className="font-bold text-neutral-500">{rankNum}</span>;
                    if (rankNum === 1) rankIcon = <span>🥇</span>;
                    else if (rankNum === 2) rankIcon = <span>🥈</span>;
                    else if (rankNum === 3) rankIcon = <span>🥉</span>;

                    return (
                      <div
                        key={item.id || idx}
                        className={`px-2 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors ${
                          isMyRecord
                            ? "bg-amber-100/90 border border-amber-300 font-bold"
                            : rankNum <= 3
                            ? "bg-white border border-neutral-200/60 shadow-2xs"
                            : "hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <span className="shrink-0 w-4 text-center font-mono text-xs">
                            {rankIcon}
                          </span>
                          <div className="truncate">
                            <span className="text-[10px] text-neutral-500 font-mono block sm:inline sm:mr-1">
                              {item.student_id}
                            </span>
                            <span className="font-semibold text-neutral-900 truncate">
                              {item.name}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono font-bold text-[11px] sm:text-xs text-black">
                          {item.formatted_time}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2) 오른쪽: 교사 기록 칸 */}
            <div className="flex flex-col h-full bg-neutral-50/70 border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-neutral-100/90 px-2.5 py-2 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-1 font-bold text-xs sm:text-sm text-neutral-800 truncate">
                  <span>👨‍🏫</span>
                  <span>교사 기록</span>
                </div>
                <span className="text-[10px] font-semibold bg-white text-neutral-600 px-1.5 py-0.5 rounded-full border border-neutral-200 shrink-0">
                  {teacherRankings.length}명
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-1 sm:p-1.5 space-y-1">
                {isLoadingRankings && teacherRankings.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400 py-6">
                    불러오는 중...
                  </div>
                ) : teacherRankings.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400 py-6 text-center px-2">
                    아직 등록된 교사 기록이 없습니다.
                  </div>
                ) : (
                  teacherRankings.map((item, idx) => {
                    const rankNum = idx + 1;
                    const isMyRecord =
                      registeredId && item.id && item.id.toString() === registeredId.toString();
                    const isBoss = item.student_id.trim().toLowerCase() === "세원";

                    let rankIcon = <span className="font-bold text-neutral-500">{rankNum}</span>;
                    if (rankNum === 1) rankIcon = <span>🥇</span>;
                    else if (rankNum === 2) rankIcon = <span>🥈</span>;
                    else if (rankNum === 3) rankIcon = <span>🥉</span>;

                    return (
                      <div
                        key={item.id || idx}
                        className={`px-2 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors ${
                          isMyRecord
                            ? "bg-amber-100/90 border border-amber-300 font-bold"
                            : isBoss
                            ? "bg-amber-50/70 border border-amber-200/80 font-medium"
                            : rankNum <= 3
                            ? "bg-white border border-neutral-200/60 shadow-2xs"
                            : "hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <span className="shrink-0 w-4 text-center font-mono text-xs">
                            {rankIcon}
                          </span>
                          <div className="truncate">
                            <span className="font-semibold text-neutral-900 truncate">
                              {formatTeacherName(item.name)}
                            </span>
                            {isBoss && (
                              <span className="ml-1 text-[9px] bg-black text-amber-300 px-1 py-0.2 rounded font-bold">
                                세원쌤
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono font-bold text-[11px] sm:text-xs text-black">
                          {item.formatted_time}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
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
