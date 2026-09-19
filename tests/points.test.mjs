import assert from 'node:assert/strict';
import { mergePointRules, pointsOfRecord, computePoints, isThisWeek, DEFAULT_POINT_RULES } from '../lib/points.js';

// 기본 규칙 + 시트 덮어쓰기
const rules = mergePointRules([{ 행동: '출석', 점수: '20' }, { 행동: '이상한값', 점수: 'abc' }]);
assert.equal(rules.출석, 20);           // 시트 우선
assert.equal(rules.숙제O, DEFAULT_POINT_RULES.숙제O); // 나머진 기본

// 기록 → 포인트
const rec = { 출석: '출석', 숙제: 'O', 재시결과: '통과', 시크릿코드: 'O', 필기인증: 'O' };
assert.equal(pointsOfRecord(rec, DEFAULT_POINT_RULES), 10 + 10 + 10 + 5 + 5);
assert.equal(pointsOfRecord({ 출석: '지각', 숙제: '늦음', 재시결과: '재시통과' }, DEFAULT_POINT_RULES), 5 + 5 + 5);
assert.equal(pointsOfRecord({ 출석: '결석', 숙제: 'X', 재시결과: '미달' }, DEFAULT_POINT_RULES), 0);

// 이번 주 판정 (2026-09-19는 토요일 → 이번 주 = 9/14 월 ~ 9/20 일)
const today = new Date('2026-09-19T14:00:00');
assert.equal(isThisWeek('2026-09-14', today), true);
assert.equal(isThisWeek('2026-09-20', today), true);
assert.equal(isThisWeek('2026-09-13', today), false);
assert.equal(isThisWeek('2026-09-21', today), false);

// 합산: 총 - 지급완료, 신청중은 잠김 아님(표시만)
const records = [
  { 날짜: '2026-09-14', 출석: '출석', 숙제: 'O' },   // 20, 이번주
  { 날짜: '2026-09-11', 출석: '출석', 숙제: 'O' },   // 20, 지난주
];
const exchanges = [
  { 상품: '연필', 가격: '15', 지급여부: '완료' },
  { 상품: '지우개', 가격: '5', 지급여부: '' },
];
const p = computePoints(records, exchanges, DEFAULT_POINT_RULES, today);
assert.equal(p.총포인트, 40 - 15);
assert.equal(p.이번주, 20);
assert.equal(p.사용, 15);
assert.equal(p.신청중, 5);

console.log('points.test.mjs: 전부 통과');
