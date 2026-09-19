import assert from 'node:assert/strict';
import { weekendReviewWindow } from '../lib/week.js';
import { buildWeekendReview, unitsOfSessions } from '../lib/curriculum.js';
import { extractUnit } from '../lib/dashboard.js';

const cls = { 시작일: '2026-09-07', 수업요일: '월수금', 수업시간: '18:00', 휴강기록: '' };

// 기간: 토~월 수업 전만
assert.ok(weekendReviewWindow(cls, new Date('2026-09-19T14:00:00')));
assert.ok(weekendReviewWindow(cls, new Date('2026-09-21T17:59:00')));
assert.equal(weekendReviewWindow(cls, new Date('2026-09-21T18:00:00')), null);
assert.equal(weekendReviewWindow(cls, new Date('2026-09-17T10:00:00')), null);

// 이번 주 완료 회차 (9/14 월, 16 수, 18 금 = 4,5,6회차)
const wr = weekendReviewWindow(cls, new Date('2026-09-19T14:00:00'));
assert.deepEqual(wr.sessions, [4, 5, 6]);
assert.equal(wr.satKey, '2026-09-19');

// 휴강 반영: 9/16 휴강이면 4,5회차만
const wrC = weekendReviewWindow({ ...cls, 휴강기록: '2026-09-16' }, new Date('2026-09-19T14:00:00'));
assert.deepEqual(wrC.sessions, [4, 5]);

// 개강 전 반은 안 뜸
assert.equal(weekendReviewWindow({ ...cls, 시작일: '2026-09-22' }, new Date('2026-09-19T14:00:00')), null);

// 회차 → 유닛 (중복 제거)
const cur = [
  { 회차: '4', 진도: 'Unit 4' }, { 회차: '5', 진도: 'Unit 5' }, { 회차: '6', 진도: 'Unit 5' },
];
assert.deepEqual(unitsOfSessions(cur, [4, 5, 6], extractUnit), [4, 5]);

// 리뷰 항목: 오답 + 유닛 매칭
const sets = [
  { 세트이름: 'Easy Link 4 - 오답 복습', 링크: 'https://classcard.net/WrongWord/2064256' },
  { 세트이름: 'Easy Link 4 - Unit 4', 링크: 'https://classcard.net/set/u4' },
];
const items = buildWeekendReview({ category: '리딩', textbook: 'Easy Link 4', units: [4, 5], sets });
assert.equal(items.length, 3);
assert.equal(items[0].title, '🔁 틀린 단어 다시 보기');
assert.equal(items[0].link, 'https://classcard.net/WrongWord/2064256');
assert.equal(items[1].link, 'https://classcard.net/set/u4');
assert.equal(items[2].link, ''); // Unit 5 세트 없음 → 제목만
// 문법은 매칭 없음 (오답만)
const g = buildWeekendReview({ category: '문법', textbook: 'My Next Grammar 1', units: [2], sets: [] });
assert.equal(g.length, 1);
// 완료 유닛 없으면 빈 배열
assert.deepEqual(buildWeekendReview({ category: '리딩', textbook: 'Easy Link 4', units: [], sets }), []);

console.log('weekend.test.mjs: 전부 통과');
