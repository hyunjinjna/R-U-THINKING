// 레벨테스트 적응형 로직 — 계단식(걸음이 점점 짧아지는 방식) (2026-09-25 개편)
//
// 이전 이분법(맞히면 범위 중간값으로 점프: 단어 3→10)은 난이도가 널뛰어 아이가 당황하고,
// 고레벨 실수 하나가 범위를 잘라 결과가 흔들렸다.
//
// 원리: 정해진 걸음(step)만큼 오르내리다가, 맞다→틀림(또는 반대)으로 방향이 바뀔 때마다
//   걸음을 절반으로 줄인다. 걸음이 1이 된 뒤에는 같은 단계에서 2문제를 맞혀야 확정.
//   틀리면 한 칸 내려가 다시 2문제로 확인. 상한(maxQuestions) 도달 시 맞힌 최고 단계로 확정.

/**
 * 적응형 세션 초기화
 * @param {number} min - 최소 단계 인덱스
 * @param {number} max - 최대 단계 인덱스
 * @param {number} startLevel - 시작 단계
 * @param {number} step - 처음 걸음 (단어 4 / 문법 3 / 리딩 2)
 */
export function createAdaptiveSession(min, max, startLevel, step = 2) {
  const cur = Math.max(min, Math.min(max, startLevel));
  return {
    min,
    max,
    current: cur,
    step: Math.max(1, step),
    history: [], // { level, correct }
    failed: [], // 틀린 적 있는 단계들 (천장 판단용)
    confirmLevel: null, // 걸음 1에서 확인 중인 단계
    confirmCount: 0, // 그 단계에서 맞힌 수
    done: false,
    finalLevel: null,
  };
}

/** 지금까지 맞힌 문제 중 가장 높은 단계 (없으면 min) */
function highestCorrect(history, min) {
  const c = history.filter((h) => h.correct).map((h) => h.level);
  return c.length ? Math.max(...c) : min;
}

/**
 * 한 문제의 결과를 반영해서 다음 문제 단계를 계산
 * @param {object} session - createAdaptiveSession 결과 (또는 이전 상태)
 * @param {boolean} correct - 이번 문제 정답 여부
 * @param {number} maxQuestions - 영역당 최대 문제 수 (기본 10)
 */
export function nextStep(session, correct, maxQuestions = 10) {
  const prev = session.history[session.history.length - 1];
  const s = {
    ...session,
    history: [...session.history, { level: session.current, correct }],
    failed: correct ? [...(session.failed || [])] : [...new Set([...(session.failed || []), session.current])],
  };
  const finish = (level) => ({ ...s, done: true, finalLevel: Math.max(s.min, Math.min(s.max, level)) });
  const ceilingAbove = (lv) => lv >= s.max || s.failed.includes(lv + 1); // 바로 위 단계가 막혀 있나

  // 방향이 바뀌면 걸음 절반 (최소 1)
  if (prev && prev.correct !== correct && s.step > 1) {
    s.step = Math.max(1, Math.floor(s.step / 2));
  }

  if (s.step > 1) {
    if (correct) {
      if (s.current >= s.max) return finish(s.max); // 꼭대기에서도 맞힘 → 최고 단계
      s.current = Math.min(s.max, s.current + s.step);
    } else {
      if (s.current <= s.min) return finish(s.min); // 바닥에서도 틀림 → 최저 단계
      s.current = Math.max(s.min, s.current - s.step);
    }
    s.confirmLevel = null;
    s.confirmCount = 0;
  } else if (correct) {
    // 걸음 1에서 맞힘: 바로 위가 막혀 있으면 이 단계 확인(2문제), 아니면 한 칸 올라가 본다
    if (ceilingAbove(s.current)) {
      if (s.confirmLevel === s.current) s.confirmCount += 1;
      else { s.confirmLevel = s.current; s.confirmCount = 1; }
      if (s.confirmCount >= 2) return finish(s.current);
    } else {
      s.current += 1;
      s.confirmLevel = null;
      s.confirmCount = 0;
    }
  } else {
    // 걸음 1에서 틀림: 한 칸 내려가 다시 확인
    if (s.current <= s.min) return finish(s.min);
    s.current -= 1;
    s.confirmLevel = null;
    s.confirmCount = 0;
  }

  // 최대 문제 수 도달 → 맞힌 최고 단계로 확정 (근거 없는 중간값 아님)
  if (s.history.length >= maxQuestions) {
    return finish(highestCorrect(s.history, s.min));
  }

  s.done = false;
  return s;
}

/** 리딩 7구간 대표 렉사일 (문제은행 렉사일 값과 동일) — 단계 인덱스 0~6 */
export const READING_BINS = [120, 260, 330, 430, 550, 750, 900];

/** 렉사일 → 가장 가까운 리딩 구간 인덱스 */
export function lexileToBinIndex(lexile) {
  let best = 0;
  READING_BINS.forEach((v, i) => {
    if (Math.abs(v - lexile) < Math.abs(READING_BINS[best] - lexile)) best = i;
  });
  return best;
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

/**
 * 파닉스 권수 판별 (게이트 통과 후)
 * 게이트 문제들의 난이도별 정답 패턴으로 EFL Phonics 1~5권 중 위치 추정
 * @param {Array<{stage:number, correct:boolean}>} answers
 */
export function estimatePhonicsBook(answers) {
  if (!answers || answers.length === 0) return 1;

  // 맞힌 문제 중 가장 높은 단계 + 1을 다음 학습 시작점으로
  const correctStages = answers.filter((a) => a.correct).map((a) => a.stage);
  if (correctStages.length === 0) return 1;

  const highest = Math.max(...correctStages);

  // 그 단계 문제를 맞혔으면 그 권은 이미 됨 → 다음 권부터
  // 단, 그 단계에서 틀린 것도 있으면 그 권을 더 다져야 하므로 그대로 유지
  const failedAtHighest = answers.some((a) => a.stage === highest && !a.correct);
  const book = failedAtHighest ? highest : Math.min(5, highest + 1);

  return Math.max(1, Math.min(5, book));
}

/**
 * 전화번호 형식 검증 (010으로 시작하는 11자리)
 */
export function isValidPhone(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  return /^010\d{8}$/.test(digits);
}

/**
 * 시간대 겹침 확인 (장바구니용)
 * @param {Array<{수업요일:string, 수업시간:string, 레벨:string}>} items
 */
const WD = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

function expandDays(str) {
  const out = [];
  for (const ch of String(str || '')) {
    if (WD[ch] !== undefined) out.push(ch);
  }
  return out;
}

export function findTimeConflicts(items) {
  const conflicts = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const daysA = expandDays(a['수업요일']);
      const daysB = expandDays(b['수업요일']);
      const sharedDays = daysA.filter((d) => daysB.includes(d));

      if (sharedDays.length > 0 && (a['수업시간'] || '').trim() === (b['수업시간'] || '').trim()) {
        conflicts.push({
          a,
          b,
          days: sharedDays.join(''),
          time: a['수업시간'],
        });
      }
    }
  }

  return conflicts;
}

/**
 * 파닉스 판별형 평가 (2026-09-24 개편)
 * answers: [{stage: 1~5, correct: bool}] — 단계당 2문항씩 10문항
 * 반환: { passed, level, low }
 *  - passed: 5단계 전부 만점 (리포트에서 파닉스 섹션 제외)
 *  - level: 시작 권 = 처음으로 만점을 못 받은 단계 (전부 통과면 5)
 *  - low: 1~2단계에서 막힘 → 리딩·단어 최저 시작 + 문법 생략
 * 그 단계 문항이 하나도 없으면(문제은행 부족) 그 단계는 미통과로 본다.
 */
export function evaluatePhonicsPlacement(answers) {
  let firstFail = 0;
  for (let s = 1; s <= 5; s++) {
    const ofStage = (answers || []).filter((a) => Number(a.stage) === s);
    const perfect = ofStage.length > 0 && ofStage.every((a) => a.correct);
    if (!perfect) { firstFail = s; break; }
  }
  const passed = firstFail === 0;
  return { passed, level: passed ? 5 : firstFail, low: !passed && firstFail <= 2 };
}
