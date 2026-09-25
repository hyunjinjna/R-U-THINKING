import assert from 'node:assert/strict';
import { evaluatePhonicsPlacement } from '../lib/adaptive.js';

// 단계별 2문항씩 결과 배열 생성 헬퍼: ok[s] = [문항1 정답여부, 문항2 정답여부]
const build = (ok) => {
  const answers = [];
  for (let s = 1; s <= 5; s++) {
    for (const c of ok[s] || []) answers.push({ stage: s, correct: c });
  }
  return answers;
};

// 1) 전부 만점 → 통과, 파닉스 섹션 제외 대상
let r = evaluatePhonicsPlacement(build({ 1: [true, true], 2: [true, true], 3: [true, true], 4: [true, true], 5: [true, true] }));
assert.deepEqual(r, { passed: true, level: 5, low: false });

// 2) 1단계에서 1개 틀림 → 1권 시작 + 최저 시작(low)
r = evaluatePhonicsPlacement(build({ 1: [true, false], 2: [true, true], 3: [true, true], 4: [true, true], 5: [true, true] }));
assert.deepEqual(r, { passed: false, level: 1, low: true });

// 3) 2단계 실패 → 2권 시작 + low (뒤 단계를 다 맞혀도 첫 실패 기준)
r = evaluatePhonicsPlacement(build({ 1: [true, true], 2: [false, false], 3: [true, true], 4: [true, true], 5: [true, true] }));
assert.deepEqual(r, { passed: false, level: 2, low: true });

// 4) 3단계 실패 → 3권 시작, low 아님 (리딩·단어 정상 진단 + 문법 진행)
r = evaluatePhonicsPlacement(build({ 1: [true, true], 2: [true, true], 3: [true, false], 4: [true, true], 5: [true, true] }));
assert.deepEqual(r, { passed: false, level: 3, low: false });

// 5) 5단계만 실패 → 5권 시작
r = evaluatePhonicsPlacement(build({ 1: [true, true], 2: [true, true], 3: [true, true], 4: [true, true], 5: [false, true] }));
assert.deepEqual(r, { passed: false, level: 5, low: false });

// 6) 엣지: 어떤 단계 문항이 아예 없으면 그 단계 미통과 취급 (문제은행 부족 안전망)
r = evaluatePhonicsPlacement(build({ 1: [true, true], 2: [true, true], 3: [], 4: [true, true], 5: [true, true] }));
assert.deepEqual(r, { passed: false, level: 3, low: false });

// 7) 엣지: 빈 배열/undefined → 1단계부터
assert.deepEqual(evaluatePhonicsPlacement([]), { passed: false, level: 1, low: true });
assert.deepEqual(evaluatePhonicsPlacement(undefined), { passed: false, level: 1, low: true });

// 8) stage가 문자열로 와도 동작 (시트 값이 문자열일 수 있음)
r = evaluatePhonicsPlacement([
  { stage: '1', correct: true }, { stage: '1', correct: true },
  { stage: '2', correct: false }, { stage: '2', correct: true },
]);
assert.deepEqual(r, { passed: false, level: 2, low: true });

console.log('phonics.test.mjs: 전부 통과');
