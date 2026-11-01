import MathLabClient from "../MathLabClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "챌린지 게임 모음 | 세원쌤의 수학 실험실",
  description: "교내 체육대회 공식 종목 타자 속도전, 외심 정밀 타겟 랭킹 아케이드 등 실시간 랭킹과 챌린지를 즐길 수 있는 게임 모음입니다.",
};

export default function ChallengePage() {
  return <MathLabClient initialCategory="challenge" />;
}
