// 계단식 적응형 시뮬레이션 (2026-09-25)
import { createAdaptiveSession, nextStep, READING_BINS, lexileToBinIndex } from '../lib/adaptive.js';

function assert(cond, msg) { if (!cond) { console.error('❌', msg); process.exitCode = 1; } }

// 가상 학생: 실제 실력 T → level<=T면 맞힘, 아니면 틀림 (실수율 0)
function simulate({ min, max, start, step, truth, mistakeAt = [] }) {
  let s = createAdaptiveSession(min, max, start, step);
  let n = 0;
  while (!s.done) {
    n += 1;
    let correct = s.current <= truth;
    if (mistakeAt.includes(n)) correct = !correct; // n번째 문제에서 실수
    s = nextStep(s, correct, 10);
    if (n > 30) throw new Error('무한 루프');
  }
  return { final: s.finalLevel, n, path: s.history.map((h) => `${h.level}${h.correct ? '○' : '×'}`).join(' ') };
}

// 단어(0~17, 시작 3, 걸음 4)
for (const truth of [0, 3, 5, 9, 10, 12, 16, 17]) {
  const r = simulate({ min: 0, max: 17, start: 3, step: 4, truth });
  assert(r.final === truth, `단어 실력 ${truth} → 판정 ${r.final} (${r.n}문제: ${r.path})`);
  assert(r.n <= 10, `단어 ${truth} 문제 수 ${r.n} > 10`);
}
// 문법(1~12, 시작 4, 걸음 3)
for (const truth of [1, 2, 4, 7, 9, 12]) {
  const r = simulate({ min: 1, max: 12, start: 4, step: 3, truth });
  assert(r.final === truth, `문법 실력 ${truth} → 판정 ${r.final} (${r.n}문제: ${r.path})`);
}
// 리딩(0~6, 시작 2, 걸음 2)
for (const truth of [0, 1, 2, 3, 4, 6]) {
  const r = simulate({ min: 0, max: 6, start: 2, step: 2, truth });
  assert(r.final === truth, `리딩 실력 ${truth} → 판정 ${r.final} (${r.n}문제: ${r.path})`);
}

// Julia 예시: 단어 3→7→11×→9→10→10 확정
const ex = simulate({ min: 0, max: 17, start: 3, step: 4, truth: 10 });
assert(ex.path === '3○ 7○ 11× 9○ 10○ 10○', `예시 경로: ${ex.path}`);
assert(ex.n === 6, `예시 문제 수 ${ex.n}`);

// 실수 하나(첫 문제 틀림)가 결과를 크게 흔들지 않는지: 실력 9, 1번 문제 실수
const m = simulate({ min: 0, max: 17, start: 3, step: 4, truth: 9, mistakeAt: [1] });
assert(Math.abs(m.final - 9) <= 1 && m.n <= 10, `실수 1회: 실력 9 → 판정 ${m.final} (${m.n}: ${m.path})`);

// 상한 10문제에서 강제 종료 시 맞힌 최고 단계로 (계속 번갈아 틀리는 학생)
let s = createAdaptiveSession(0, 17, 3, 4);
for (let i = 0; i < 10 && !s.done; i++) s = nextStep(s, i % 2 === 0, 10);
assert(s.done && s.history.length <= 10, `상한 종료 실패 ${s.history.length}`);
assert(s.finalLevel === Math.max(...s.history.filter((h) => h.correct).map((h) => h.level)), `상한 시 맞힌 최고 단계 아님: ${s.finalLevel}`);

// 렉사일 구간 변환
assert(lexileToBinIndex(300) === 2 && READING_BINS[lexileToBinIndex(880)] === 900, '렉사일 구간 변환');

if (process.exitCode) console.log('adaptive.test.mjs: 실패 있음');
else console.log('adaptive.test.mjs: 전부 통과');
