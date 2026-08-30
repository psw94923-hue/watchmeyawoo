import MathLabClient from "./MathLabClient";

export const metadata = {
  title: "세원쌤의 수학 실험실 | AR 모바일 높이 측정기 (피타고라스 정리)",
  description: "중학교 2학년 수학 연계 모바일 AR 간접 높이 측정 프로토타입 웹앱입니다. 카메라와 자이로 센서로 건물의 바닥과 꼭대기를 조준하고 피타고라스 정리와 삼각비로 실측해보세요.",
};

export default function Home() {
  return <MathLabClient />;
}
