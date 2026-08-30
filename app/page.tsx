import MathLabClient from "./MathLabClient";

export const metadata = {
  title: "세원쌤의 수학 실험실 | 피타고라스 정리",
  description: "직각삼각형의 변의 길이와 각각의 면적을 직접 조작하고 측정하며 피타고라스의 정리를 배워보세요.",
};

export default function Home() {
  return <MathLabClient />;
}
