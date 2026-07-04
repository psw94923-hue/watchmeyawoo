# watchmeyawoo

선생님과 학생을 위한 가장 쉽고 빠른 맞춤형 교육용 웹 애플리케이션 플랫폼, **EduCraft**의 Next.js 보일러플레이트 프로젝트입니다.

이 프로젝트는 Vercel을 통해 즉시 배포할 수 있도록 구성되어 있으며, 초보자도 쉽게 커스터마이징하여 학습 퀴즈, 연산 연습기, 발표자 추첨 등의 교육용 웹 서비스를 구축할 수 있습니다.

---

## 🛠️ 기술 스택 (Technology Stack)

- **Framework**: Next.js (App Router)
- **UI & Interaction**: React (v19)
- **Styling**: Tailwind CSS (v4)
- **Language**: TypeScript & JavaScript
- **Deployment**: Optimized for Vercel

---

## 🚀 시작하기 (Getting Started)

로컬 개발 환경에서 이 웹앱을 수정하고 테스트하려면 다음 단계를 따르세요.

### 1. 의존성 패키지 설치
프로젝트 루트 폴더에서 패키지를 설치합니다:
```bash
npm install
```

### 2. 개발 서버 시작
로컬 개발 서버를 실행합니다:
```bash
npm run dev
```
- 브라우저를 열고 [http://localhost:3000](http://localhost:3000)으로 접속하여 결과를 실시간으로 확인합니다.
- `app/page.tsx` 파일을 수정하면 화면이 실시간으로 자동 업데이트됩니다.

### 3. Vercel용 빌드 테스트
Vercel 배포 전에 빌드 에러가 없는지 검증합니다:
```bash
npm run build
```

---

## 📂 주요 폴더 및 파일 구조

```text
swcoding/
├── app/                  # Next.js App Router 핵심 소스 코드
│   ├── favicon.ico       # 파비콘 이미지
│   ├── globals.css       # 글로벌 CSS 및 Tailwind v4 설정
│   ├── layout.tsx        # 헤더(Header) 및 푸터(Footer)가 포함된 레이아웃 설정
│   └── page.tsx          # 메인 화면 (인터랙티브 기능 포함)
├── public/               # 로고, 이미지 등의 정적 자산 폴더
├── package.json          # 프로젝트 라이브러리 및 스크립트 설정
├── tsconfig.json         # TypeScript 환경 설정
└── tailwind.config.ts    # Tailwind CSS 설정 (필요시 추가 확장 가능)
```

---

## ⚡ Vercel에 연동 및 배포 방법

1. GitHub 원격 저장소(`psw94923-hue/watchmeyawoo`)에 변경사항이 푸시되어 있어야 합니다.
2. [Vercel](https://vercel.com)에 로그인한 뒤 **Add New Project**를 선택합니다.
3. 이 저장소(`watchmeyawoo`)를 선택하여 Import 합니다.
4. Framework Preset은 **Next.js**로 자동 인식되며, **Deploy** 버튼을 누르면 1분 내로 배포가 완료됩니다.
5. 이후 GitHub에 `git push`할 때마다 Vercel에서 자동으로 변경사항을 반영하여 배포를 업데이트합니다.
