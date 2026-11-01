import MathLabClient from "./MathLabClient";

export const metadata = {
  title: "세원쌤의 수학 실험실 | 중1·중2 수학 탐구 & 챌린지 게임",
  description: "직관적이고 재미있는 중학교 1학년, 2학년 수학 인터랙티브 탐구 웹앱 및 타자 속도전 미니게임 플랫폼입니다.",
};

export default function Home() {
  return <MathLabClient />;
}
