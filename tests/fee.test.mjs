// 첫 달 수강료 계산 테스트
import { monthSessions, firstMonthFee, formatWon } from '../lib/fee.js';
import assert from 'node:assert';

// 2026-09 기준: 9월은 화요일 시작(9/1 화). 월수금 반, 시작일 9/7(월)
const cls = { 반이름: 'T1', 수업요일: '월수금', 수업시간: '4시', 시작일: '2026-09-07', 휴강기록: '', 월수강료: '180000' };

// 9월 월수금: 2,4,7,9,11,14,16,18,21,23,25,28,30 → 시작일 9/7 이후만: 7,9,11,14,16,18,21,23,25,28,30 = 11회
{
  const t = new Date(2026, 8, 1); // 9/1 (개강 전 시점에서 봐도 total은 시작일 이후 기준)
  const { total, remaining } = monthSessions(cls, t);
  assert.strictEqual(total, 11, `9월 전체 회차 11 기대, 실제 ${total}`);
  assert.strictEqual(remaining, 11, '9/1 시점 남은 회차 = 전체');
}

// 9/22(화) 시점: 남은 수업일 = 23,25,28,30 = 4회
{
  const t = new Date(2026, 8, 22);
  const { total, remaining } = monthSessions(cls, t);
  assert.strictEqual(total, 11);
  assert.strictEqual(remaining, 4, `9/22 남은 회차 4 기대, 실제 ${remaining}`);
}

// 휴강 반영: 9/23 휴강이면 남은 회차 3
{
  const c2 = { ...cls, 휴강기록: '2026-09-23' };
  const t = new Date(2026, 8, 22);
  const { total, remaining } = monthSessions(c2, t);
  assert.strictEqual(total, 10);
  assert.strictEqual(remaining, 3);
}

// 개강 전 합류 → 정액
{
  const c3 = { ...cls, 시작일: '2026-10-05' };
  const t = new Date(2026, 8, 22);
  const fee = firstMonthFee(c3, t);
  assert.strictEqual(fee.amount, 180000, '개강 전 합류는 정액');
  assert.strictEqual(fee.basis, '');
}

// 진행 중 반 중간 합류 → 비율 일할: 180000 * 4/11 = 65454.5 → 65500 (100원 반올림)
{
  const t = new Date(2026, 8, 22);
  const fee = firstMonthFee(cls, t);
  assert.strictEqual(fee.amount, 65500, `일할 65500 기대, 실제 ${fee.amount}`);
  assert.ok(fee.basis.includes('11회 중 4회'), `근거 문구에 회차 포함: ${fee.basis}`);
}

// 이번 달 수업 다 끝난 뒤 합류 → 정액 + 다음 달 안내
{
  const c4 = { ...cls, 수업요일: '월', 시작일: '2026-09-07' }; // 9월 월: 7,14,21,28
  const t = new Date(2026, 8, 29); // 9/29 — 남은 월요일 없음
  const fee = firstMonthFee(c4, t);
  assert.strictEqual(fee.amount, 180000);
  assert.ok(fee.basis.includes('다음 달'), fee.basis);
}

// 월수강료 없음 → 0
{
  const c5 = { ...cls, 월수강료: '' };
  assert.strictEqual(firstMonthFee(c5, new Date(2026, 8, 22)).amount, 0);
}

// 콤마·"원" 붙은 금액도 파싱
{
  const c6 = { ...cls, 월수강료: '180,000원' };
  assert.strictEqual(firstMonthFee(c6, new Date(2026, 8, 1)).amount, 180000);
}

assert.strictEqual(formatWon(65500), '65,500원');

console.log('✅ fee.test.mjs 통과');
