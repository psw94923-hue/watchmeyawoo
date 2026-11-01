import MathLabClient from "../MathLabClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "중학교 2학년 수학 탐구실 | 세원쌤의 수학 실험실",
  description: "중학교 2학년 수학 교육과정 연계 인터랙티브 실험실 - 실생활 닮은 그림 찾기, 밤하늘 외심 탐사선 랭킹전, 모바일 AR 피타고라스 실측기를 체험해보세요.",
};

export default function Grade2Page() {
  return <MathLabClient initialCategory="grade2" />;
}
