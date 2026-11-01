import MathLabClient from "../MathLabClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "중학교 1학년 수학 탐구실 | 세원쌤의 수학 실험실",
  description: "중학교 1학년 수학 교육과정 연계 인터랙티브 실험실 - 3D 정다면체 메이커, 피자 자르기(부채꼴), 치즈 커팅(다각형 내각), 다각형 외각 모으기 활동을 체험해보세요.",
};

export default function Grade1Page() {
  return <MathLabClient initialCategory="grade1" />;
}
