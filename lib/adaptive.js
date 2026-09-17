// 레벨테스트 적응형 로직 — 신뢰구간(범위) 좁히기 방식
//
// 원리: "이 학생 실력은 A~B 사이"로 시작해서,
//   맞으면 범위의 아래쪽을 걷어내고(더 어려운 쪽으로 좁힘)
//   틀리면 범위의 위쪽을 걷어낸다(더 쉬운 쪽으로 좁힘)
// 범위 폭이 1 이하가 되면 그 값으로 확정.

/**
 * 적응형 세션 초기화
 * @param {number} min - 전체 범위 최소값 (예: 리딩 1, 문법 1)
 * @param {number} max - 전체 범위 최대값 (예: 리딩 7, 문법 12)
 * @param {number} startLevel - 시작 난이도
 */
export function createAdaptiveSession(min, max, startLevel) {
  return {
    min,
    max,
    low: min,
    high: max,
    current: startLevel,
    history: [], // { level, correct }
    done: false,
    finalLevel: null,
  };
}

/**
 * 한 문제의 결과를 반영해서 범위를 좁히고, 다음 문제 난이도를 계산
 * @param {object} session - createAdaptiveSession 결과 (또는 이전 상태)
 * @param {boolean} correct - 이번 문제 정답 여부
 * @param {number} maxQuestions - 최대 문제 수 (이 이상 넘으면 강제 종료)
 */
export function nextStep(session, correct, maxQuestions = 8) {
  const s = { ...session, history: [...session.history, { level: session.current, correct }] };

  if (correct) {
    // 맞았다 → 이 레벨보다 낮은 쪽은 배제, 하한을 현재+1로 올림
    s.low = Math.max(s.low, s.current + 1);
  } else {
    // 틀렸다 → 이 레벨보다 높은 쪽은 배제, 상한을 현재-1로 내림
    s.high = Math.min(s.high, s.current - 1);
  }

  // 범위가 역전되거나(low > high) 좁아지면 확정
  if (s.low > s.high) {
    // 마지막으로 맞았던 레벨(또는 min)로 확정
    const lastCorrect = [...s.history].reverse().find((h) => h.correct);
    s.finalLevel = lastCorrect ? lastCorrect.level : s.min;
    s.done = true;
    return s;
  }

  // 범위 폭이 1 이하 (low === high) → 확정
  if (s.high - s.low <= 0) {
    s.finalLevel = s.low;
    s.done = true;
    return s;
  }

  // 최대 문제 수 도달 → 그때까지 데이터로 판단 (범위 중간값)
  if (s.history.length >= maxQuestions) {
    s.finalLevel = Math.round((s.low + s.high) / 2);
    s.done = true;
    return s;
  }

  // 계속 진행 — 다음 문제는 현재 범위의 중간값
  s.current = Math.round((s.low + s.high) / 2);
  s.done = false;
  return s;
}

/**
 * 파닉스 게이트 판정 (신뢰구간 방식이 아니라 단순 카운트)
 * @param {Array<boolean>} answers - 게이트 문제 정답 여부 배열 (4~5개)
 */
export function evaluatePhonicsGate(answers) {
  const correctCount = answers.filter(Boolean).length;
  const total = answers.length;
  const passed = correctCount / total >= 0.5; // 절반 이상 맞으면 통과

  return {
    passed,
    correctCount,
    total,
    // 통과했으면 이어서 EFL Phonics 1~5권 위치 판별 시험으로,
    // 통과 못했으면 나머지 영역 생략
  };
}

/**
 * 리딩 렉사일 구간 → 실제 반 매핑
 */
export const READING_LEVEL_MAP = [
  { min: 0, max: 240, label: 'Easy Link Starter (1~3권)', 반이름: ['Easy Link Starter'] },
  { min: 240, max: 280, label: 'Easy Link (1~3권)', 반이름: ['Easy Link 1', 'Easy Link 2', 'Easy Link 3'] },
  { min: 280, max: 380, label: 'Easy Link (4~6권)', 반이름: ['Easy Link 4', 'Easy Link 5', 'Easy Link 6'] },
  { min: 400, max: 460, label: 'Subject Link Starter / Insight Link Starter', 반이름: ['Subject Link Starter', 'Insight Link Starter'] },
  { min: 500, max: 610, label: 'Subject Link 1~3 / Insight Link 1~3 (교차)', 반이름: ['Subject Link 1', 'Insight Link 1', 'Subject Link 2', 'Insight Link 2', 'Subject Link 3', 'Insight Link 3'] },
  { min: 670, max: 830, label: 'Subject Link 4~6 / Insight Link 4~6 (교차)', 반이름: ['Subject Link 4', 'Insight Link 4', 'Subject Link 5', 'Insight Link 5', 'Subject Link 6', 'Insight Link 6'] },
  { min: 860, max: 950, label: 'Subject Link 7~9', 반이름: ['Subject Link 7', 'Subject Link 8', 'Subject Link 9'] },
];

export function lexileToLevel(lexile) {
  const found = READING_LEVEL_MAP.find((r) => lexile >= r.min && lexile <= r.max);
  return found || null;
}

/**
 * 단어 CEFR 18단계 순서 (신뢰구간 좁히기용 인덱스 변환)
 */
export const VOCA_STAGES = [
  'Pre-A1', 'A1-하', 'A1-중', 'A1-상',
  'A2-하', 'A2-중', 'A2-상',
  'B1-하', 'B1-중', 'B1-상',
  'B2-하', 'B2-중', 'B2-상',
  'C1-하', 'C1-중', 'C1-상',
  'C2-하', 'C2-상',
];

export const VOCA_LEVEL_MAP = {
  'Pre-A1': '1000 Basic Words - Book 1',
  'A1-하': '1000 Basic Words - Book 2',
  'A1-중': null,
  'A1-상': '1000 Basic Words - Book 3 / 2000 Core Words - Book 1',
  'A2-하': '1000 Basic - Book 4 / 2000 Core - Book 2 / 4000 Essential - Book 1',
  'A2-중': '4000 Essential - Book 2',
  'A2-상': '2000 Core - Book 3',
  'B1-하': '2000 Core - Book 4',
  'B1-중': '4000 Essential - Book 3',
  'B1-상': null,
  'B2-하': '4000 Essential - Book 4 (AWL)',
  'B2-중': '4000 Essential - Book 5',
  'B2-상': null,
  'C1-하': '4000 Essential - Book 6',
  'C1-중': null,
  'C1-상': null,
  'C2-하': null,
  'C2-상': null,
};

/**
 * 문법 12단계 → 실제 교재
 */
export function grammarStageToLevel(stage) {
  if (stage >= 1 && stage <= 3) return { label: 'My First Grammar', 권: stage };
  if (stage >= 4 && stage <= 6) return { label: 'The Best Grammar', 권: stage - 3 };
  if (stage >= 7 && stage <= 9) return { label: 'My Next Grammar', 권: stage - 6 };
  if (stage >= 10 && stage <= 12) return { label: 'The Best Grammar Plus', 권: stage - 9 };
  return null;
}
