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

// ===== 내역 (감점 프레임) =====
import { weeklyBreakdown } from '../lib/points.js';
const wk = [
  { 날짜: '2026-09-14', 출석: '출석', 숙제: 'O', 재시결과: '통과', 시크릿코드: 'O' },
  { 날짜: '2026-09-16', 출석: '지각', 숙제: '늦음', 재시결과: '재시통과' },
  { 날짜: '2026-09-18', 출석: '출석', 숙제: 'X', 재시결과: '미달' },
];
const bd = weeklyBreakdown(wk, DEFAULT_POINT_RULES, new Date('2026-09-19T12:00:00'));
const find = (l) => bd.find((x) => x.label.includes(l));
assert.equal(find('수업 참여').count, 3);
assert.equal(find('수업 참여').points, 30);
assert.equal(find('지각').points, -5);            // 10-5 깎임
assert.equal(find('숙제 완료').points, 20);        // O+늦음 = 2회 × 10
assert.equal(find('늦게 낸 숙제').points, -5);
assert.equal(find('안 한 숙제').kind, 'missed');
assert.equal(find('안 한 숙제').points, 10);       // 놓친 포인트 (합계 미포함)
assert.equal(find('재시험으로 통과').points, 5);    // 플러스 유지
// plus+minus 합 = 실제 이번주 포인트와 일치
const sum = bd.filter((x) => x.kind !== 'missed').reduce((s, x) => s + x.points, 0);
const real = computePoints(wk, [], DEFAULT_POINT_RULES, new Date('2026-09-19T12:00:00')).이번주;
assert.equal(sum, real);

console.log('points breakdown: 전부 통과');
