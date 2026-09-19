import assert from 'node:assert/strict';
import * as w from '../lib/week.js';

// ---- parseHomeworkLine: "제목 | 링크 [D+n]" 새 형식 ----
assert.deepEqual(w.parseHomeworkLine('단어 암기하기 | https://classcard.net/abc [D+1]'), {
  title: '단어 암기하기', link: 'https://classcard.net/abc', requiredDay: 1,
});
assert.deepEqual(w.parseHomeworkLine('워크북 풀기'), { title: '워크북 풀기', link: '', requiredDay: null });
assert.deepEqual(w.parseHomeworkLine('  '), { title: '', link: '', requiredDay: null });

// ---- filterHomeworkByDay: 일차별 공개 + locked 요일 계산 ----
const hwText = '오늘 단어 암기 | https://cc.net/a\n지난 유닛 매칭 | https://cc.net/b [D+1]\n워크북 사진 [D+2]';
// 지난 수업일: 2026-09-19(토), dayOffset=0 → D+1, D+2는 잠김
const last = new Date(2026, 8, 19);
const r0 = w.filterHomeworkByDay(hwText, 0, last);
assert.equal(r0.visible.length, 1);
assert.equal(r0.visible[0].title, '오늘 단어 암기');
assert.equal(r0.locked.length, 2);
assert.equal(r0.locked[0].title, '지난 유닛 매칭');
assert.equal(r0.locked[0].opensAt, 1);
assert.equal(r0.locked[0].opensWeekday, '일'); // 09-19(토)+1일=09-20(일)
assert.equal(r0.locked[1].opensWeekday, '월'); // +2일=09-21(월)

// dayOffset=1 → D+1도 열림
const r1 = w.filterHomeworkByDay(hwText, 1, last);
assert.equal(r1.visible.length, 2);
assert.equal(r1.locked.length, 1);

// 빈 문자열
assert.deepEqual(w.filterHomeworkByDay('', 0), { visible: [], locked: [] });

// ---- isCancelledToday: 수업요일이면서 휴강일 때만 true ----
const clsMonWedFri = { 수업요일: '월수금', 휴강기록: '2026-09-21' };
assert.equal(w.isCancelledToday(clsMonWedFri, new Date(2026, 8, 21)), true); // 09-21은 월요일
assert.equal(w.isCancelledToday(clsMonWedFri, new Date(2026, 8, 22)), false); // 화요일(원래 수업 없는 날)
assert.equal(w.isCancelledToday({ 수업요일: '화목', 휴강기록: '2026-09-21' }, new Date(2026, 8, 21)), false); // 수업요일 자체가 아님

// ---- lastClassDate ----
const cls2 = { 수업요일: '월수금', 휴강기록: '' };
const ld = w.lastClassDate(cls2, new Date(2026, 8, 19)); // 토요일 기준, 직전 수업일=금(09-18)
assert.equal(w.formatDate(ld), '2026-09-18');

// ---- curriculumRowForSession ----
const curriculum = [
  { 회차: '1회차', 진도: 'Unit 1', 영상URL: 'https://y/1' },
  { 회차: '2회차', 진도: 'Unit 2', 영상URL: 'https://y/2' },
];
assert.equal(w.curriculumRowForSession(curriculum, 2)['진도'], 'Unit 2');
assert.equal(w.curriculumRowForSession(curriculum, 5), null);
assert.equal(w.curriculumRowForSession(curriculum, 'abc'), null);

console.log('week.test.mjs: 전부 통과');
