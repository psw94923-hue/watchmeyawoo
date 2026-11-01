import MathLabClient from "../MathLabClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "챌린지 게임 | 세원쌤의 수학 실험실",
  description: "타자 속도전, 외심 맞추기 등 다양한 미니게임을 즐길 수 있는 공간입니다.",
};

export default function ChallengePage() {
  return <MathLabClient initialCategory="challenge" />;
}
