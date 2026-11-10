export interface MathApp {
  id: string;
  title: string;
  category: 'grade1' | 'grade2' | 'challenge';
  gradeText: string;
  unitText: string;
  description: string;
  emoji: string;
  href?: string;
  internalAppId?: 'cheese' | 'circumcenter' | 'exterior' | 'pythagoras' | 'parallel';
  tags: string[];
  isNew?: boolean;
  isFeatured?: boolean;
  isComingSoon?: boolean;
  auroraTheme: 'pink' | 'lavender' | 'sky' | 'mint' | 'peach' | 'violet';
}

export const MATH_APPS: MathApp[] = [
  // --------------------------------------------------------------------------
  // 중학교 1학년 (Grade 1)
  // --------------------------------------------------------------------------
  {
    id: 'bakery-open-class',
    title: '달콤베이커리 긴급 경영 속보 (5개 지점 허브)',
    category: 'grade1',
    gradeText: '중1 수학 · 공개수업',
    unitText: '도수분포표와 도수분포다각형',
    description: '달콤베이커리 5개 지점(학교앞점·해변공원점·오피스점·실버타운점·감성핫플점)의 돌발 속보와 도수분포다각형을 분석해 AI로 경영 전략을 검증받는 수업 허브입니다.',
    emoji: '🥐',
    href: '/bakery',
    tags: ['도수분포다각형', 'AI 융합수업', '5개 지점별 게시판', '공개수업'],
    isNew: true,
    isFeatured: true,
    auroraTheme: 'peach',
  },
  {
    id: 'prism',
    title: '기둥 펼치기 탐구실 (겉넓이)',
    category: 'grade1',
    gradeText: '중1·중2 수학',
    unitText: '입체도형의 겉넓이',
    description: '사각기둥, 삼각기둥, 원기둥의 전개도를 3D로 직접 펼치고 분해해보며 밑넓이와 옆넓이의 원리로 겉넓이를 탐구해보세요!',
    emoji: '📦',
    href: '/prism.html',
    tags: ['전개도 펼치기', '기둥의 겉넓이', '클릭&확인', '입체도형'],
    isNew: true,
    isFeatured: true,
    auroraTheme: 'sky',
  },
  {
    id: 'polyhedron',
    title: '3D 정다면체 탐구 (3D 메이커)',
    category: 'grade1',
    gradeText: '중1 수학',
    unitText: '입체도형의 성질',
    description: '한 꼭짓점에 정다각형을 모아 3D로 접어올리고, 직접 면을 터치해 세어보며 정사면체부터 정이십면체까지 5가지 정다면체 탐구 표를 완성해보세요!',
    emoji: '🎲',
    href: '/polyhedron.html',
    tags: ['3D 입체도형', '전개도 접기', '면 터치 카운팅'],
    isNew: true,
    isFeatured: true,
    auroraTheme: 'violet',
  },
  {
    id: 'pizza',
    title: '피자를 잘라보자!',
    category: 'grade1',
    gradeText: '중1 수학',
    unitText: '부채꼴의 성질',
    description: '피자 도우를 반죽하고 구운 뒤 원하는 조각으로 잘라 요리사에게 먹여보며 부채꼴의 중심각과 호의 관계를 탐구해보세요!',
    emoji: '🍕',
    href: '/pizza.html',
    tags: ['부채꼴의 호와 넓이', '중심각', '체험형 시뮬레이션'],
    auroraTheme: 'peach',
  },
  {
    id: 'cheese',
    title: '치즈 커팅 (다각형 자르기)',
    category: 'grade1',
    gradeText: '중1 수학',
    unitText: '다각형의 내각의 합',
    description: '귀여운 치즈 칼로 다각형을 대각선으로 분할해보며 (n-2)×180° 내각의 총합 공식을 스스로 발견해보세요!',
    emoji: '🧀',
    internalAppId: 'cheese',
    tags: ['다각형의 대각선', '내각의 총합 공식', '인터랙티브'],
    auroraTheme: 'pink',
  },
  {
    id: 'exterior',
    title: '다각형 외각 탐구',
    category: 'grade1',
    gradeText: '중1 수학',
    unitText: '다각형의 외각의 합',
    description: '다각형의 모든 외각을 떼어내 한 점으로 모아 외각의 총합이 항상 360°가 되는 원리를 직관적으로 확인해보세요!',
    emoji: '📐',
    internalAppId: 'exterior',
    href: '/exterior.html',
    tags: ['외각의 총합 360°', '모아보기 증명', '직관적 시각화'],
    auroraTheme: 'lavender',
  },

  // --------------------------------------------------------------------------
  // 중학교 2학년 (Grade 2)
  // --------------------------------------------------------------------------
  {
    id: 'parallel',
    title: '삼각형에서 평행선과 선분 길이의 비',
    category: 'grade2',
    gradeText: '중2 수학',
    unitText: '도형의 닮음 · 평행선',
    description: '삼각형 내부와 모래시계형 평행선에서 동위각·엇각, 보조선 평행이동, 초록색 길이의 비 곡선과 5가지 예제를 통통 튀는 모션으로 탐구해보세요!',
    emoji: '📐',
    internalAppId: 'parallel',
    href: '/parallel',
    tags: ['평행선과 선분의 비', '모래시계 닮음', '보조선 평행이동', '드래그 실험'],
    isNew: true,
    isFeatured: true,
    auroraTheme: 'mint',
  },
  {
    id: 'similarity',
    title: '닮은 그림 찾기!',
    category: 'grade2',
    gradeText: '중2 수학',
    unitText: '도형의 닮음',
    description: '워밍업 4단계를 통과하고, 정겨운 손그림 마을에서 실생활 속 5가지 닮음 도형을 찾아 학습지를 완성해보세요!',
    emoji: '🔍',
    href: '/similarity.html',
    tags: ['도형의 닮음', '실생활 연계', '손그림 마을 탐색'],
    auroraTheme: 'sky',
  },
  {
    id: 'circumcenter',
    title: '외심 탐사선 (항성 찾기)',
    category: 'grade2',
    gradeText: '중2 수학',
    unitText: '삼각형의 외심',
    description: '밤하늘의 세 별로부터 정확히 같은 거리에 있는 항성(외심)의 위치를 감각으로 맞추고 실시간 랭킹에 도전하세요!',
    emoji: '🌌',
    internalAppId: 'circumcenter',
    tags: ['삼각형의 외심', '동일 거리 원리', '실시간 랭킹전'],
    auroraTheme: 'violet',
  },
  {
    id: 'pythagoras',
    title: '피타고라스 측정하기 (AR)',
    category: 'grade2',
    gradeText: '중2 수학',
    unitText: '피타고라스 정리',
    description: '스마트폰 카메라와 각도 센서로 바닥과 꼭대기를 조준하고 삼각비와 피타고라스 정리로 건물의 실제 높이를 측정해보세요!',
    emoji: '📏',
    internalAppId: 'pythagoras',
    tags: ['모바일 AR 실측', '자이로 각도 센서', '피타고라스 정리'],
    auroraTheme: 'mint',
  },

  // --------------------------------------------------------------------------
  // 챌린지 게임 모음 (Challenge Games)
  // --------------------------------------------------------------------------
  {
    id: 'typing',
    title: '타자 속도전',
    category: 'challenge',
    gradeText: '챌린지',
    unitText: '타자 게임',
    description: '문장을 빠르고 정확하게 입력하며 자신의 타자 속도와 정확도 기록에 도전해보세요!',
    emoji: '⌨️',
    href: '/typing',
    tags: ['타자 게임', '속도 측정', '정확도'],
    auroraTheme: 'sky',
  },
  {
    id: 'circumcenter-challenge',
    title: '외심 탐사선 랭킹전',
    category: 'challenge',
    gradeText: '챌린지',
    unitText: '수학 미니게임',
    description: '밤하늘 세 별의 정중앙 외심을 감각으로 정밀하게 맞추는 미니게임입니다.',
    emoji: '🛸',
    internalAppId: 'circumcenter',
    tags: ['외심 맞추기', '정밀도 측정', '미니게임'],
    auroraTheme: 'violet',
  },
  {
    id: 'new-challenge-soon',
    title: '새로운 게임',
    category: 'challenge',
    gradeText: '챌린지',
    unitText: '준비 중',
    description: '새로운 미니게임이 곧 추가될 예정입니다.',
    emoji: '✨',
    isComingSoon: true,
    tags: ['업데이트 예정'],
    auroraTheme: 'mint',
  },
];
