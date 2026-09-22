import assert from 'node:assert/strict';
import * as d from '../lib/dashboard.js';

// ---- 출석/지각/결석 (5분 기준) ----
const start = new Date(2026, 8, 19, 17, 0);
assert.equal(d.judgeAttendance(new Date(2026, 8, 19, 16, 55), start).출석, '출석');
assert.equal(d.judgeAttendance(new Date(2026, 8, 19, 17, 4), start).출석, '출석');
const late = d.judgeAttendance(new Date(2026, 8, 19, 17, 12), start);
assert.equal(late.출석, '지각'); assert.equal(late.늦은분, 12); assert.equal(late.입장시각, '17:12');
assert.equal(d.judgeAttendance(null, start).출석, '결석');

// ---- 날짜 파싱 ----
assert.equal(d.fmtDT(d.parseDateTime('9/19 09:41', 2026)), '2026-09-19 09:41');
assert.equal(d.fmtDT(d.parseDateTime('2026-09-19 17:03')), '2026-09-19 17:03');
assert.equal(d.parseDateTime('-'), null);
assert.equal(d.classStartAt('2026-09-19', '17:00').getHours(), 17);

// ---- 세트명/진도 파싱 ----
assert.deepEqual(d.parseSetName('1000 Basic English Words 4 - Unit 2A'), { unit: 2, part: 'A', isTest: false, isReview: false });
assert.deepEqual(d.parseSetName('Insight Link 3 - unit 14 단어'), { unit: 14, part: '', isTest: false, isReview: false });
assert.equal(d.parseSetName('My Next Grammar 1 - Unit 3 Test').isTest, true);
assert.equal(d.extractUnit('Unit 3'), 3); assert.equal(d.extractUnit('3단원'), 3);

// ---- 엑셀 파싱 (스크린샷과 같은 헤더) ----
const H = ['학생이름','아이디','클래스명','세트유형','세트명','학습일','암기학습(%)','리콜학습(%)','스펠학습(%)','반복횟수','스피킹(%)','AI 평가 점수','매칭','테스트','테스트 제출일','맞은문항수','틀린문항수','완료여부','누적오답 단어복습'];
const rows = [H,
  ['김민재','asherkim425','1000 Basic English\nWords 4 (393653741)','단어','1000 Basic English Words 4 - Unit 2A','9/16 22:48',500,300,100,10.5,0,'','',95,'9/17 17:03',19,1,'',''],
  ['김민재','asherkim425','1000 Basic English Words 4 (393653741)','단어','1000 Basic English Words 4 - Unit 1B','9/16 22:38',500,300,500,14.3,0,'',3840,'','-','','','',''],
  ['김민재','asherkim425','1000 Basic English Words 4 (393653741)','드릴','1000 Basic English Words 4 - Unit 2 문제','9/16 22:56',0,0,0,1.8,0,'','',23,'9/16 22:56',7,23,'',''],
  ['김민재','asherkim425','1000 Basic English Words 4 (393653741)','','누적오답 단어복습 (0카드)','','','','','','','','','','','','','','오답 없음'],
  ['김래윤','rio1021','1000 Basic English Words 4 (393653741)','단어','1000 Basic English Words 4 - Unit 2A','9/17 20:00',100,100,0,3,0,'','','', '-','','','',''],
];
const parsed = d.parseFullReport(rows, 2026);
assert.equal(parsed.error, null);
assert.equal(parsed.records.length, 5);
assert.equal(parsed.records[0].클래스명, '1000 Basic English Words 4');
assert.equal(parsed.records[0].학습일, '2026-09-16 22:48');
assert.equal(parsed.records[0].테스트제출일, '2026-09-17 17:03');
assert.equal(parsed.records[1].테스트제출일, '');
assert.equal(parsed.records[3].세트유형, '오답복습');

// ---- 병합: 처음본날 유지, 학습일 뒤로 밀리면 이른 것 유지 ----
const merged = d.mergeClassCardRecords(
  [{ 학생이름: '김민재', 아이디: 'asherkim425', 클래스명: '1000 Basic English Words 4', 세트명: '1000 Basic English Words 4 - Unit 2A', 학습일: '2026-09-15 10:00', 처음본날: '2026-09-15' }],
  parsed.records, '2026-09-19');
const m0 = merged.find((r) => r.세트명.endsWith('Unit 2A') && r.학생이름 === '김민재');
assert.equal(m0.처음본날, '2026-09-15'); assert.equal(m0.학습일, '2026-09-15 10:00');
assert.equal(merged.find((r) => r.학생이름 === '김래윤').처음본날, '2026-09-19');

// ---- 숙제 판정: 이번 수업 = 9/17 17:00, 지난 회차 Unit 2 ----
const deadline = new Date(2026, 8, 17, 17, 0);
const prevStart = new Date(2026, 8, 15, 17, 0);
const base = { records: parsed.records, textbooks: ['1000 Basic English Words 4'], unit: 2, deadline, prevClassStart: prevStart };

// 김민재: 2A 암기500/리콜300 ✓, 1B 매칭 ✓, 드릴 제출 ✓ → O. 테스트 95, 수업 후 제출 → 재시통과
const a = d.judgeHomework({ ...base, studentName: '김민재', classcardId: 'asherkim425' });
assert.equal(a.숙제, 'O'); assert.equal(a.재시결과, '재시통과'); assert.equal(a.단어점수, '95');

// 김래윤: 2A 암기100/리콜100 (기준 200 미달), 1B·드릴 없음 → X, 테스트 없음 → 미응시
const b = d.judgeHomework({ ...base, studentName: '김래윤', classcardId: 'rio1021' });
assert.equal(b.숙제, 'X'); assert.equal(b.재시결과, '미응시'); assert.equal(b.단어점수, '');

// 기준을 100으로 낮추면 2A는 통과하지만 1B·드릴이 없어 여전히 X
const c = d.judgeHomework({ ...base, studentName: '김래윤', classcardId: 'rio1021', settings: { ...d.DEFAULT_SETTINGS, 암기기준: 100, 리콜기준: 100 } });
assert.equal(c.숙제, 'X');

// 마감 후 완료 → 늦음
const lateRecs = parsed.records.map((r) => (r.학생이름 === '김민재' ? { ...r, 학습일: '2026-09-18 09:00', 테스트제출일: r.테스트제출일 && '2026-09-18 09:10' } : r));
const l = d.judgeHomework({ ...base, records: lateRecs, studentName: '김민재', classcardId: 'asherkim425' });
assert.equal(l.숙제, '늦음');

// 수업 중 테스트 통과 → 통과
const inClass = parsed.records.map((r) => (r.학생이름 === '김민재' && r.세트명.endsWith('2A') ? { ...r, 테스트제출일: '2026-09-15 17:05' } : r));
assert.equal(d.judgeHomework({ ...base, records: inClass, studentName: '김민재', classcardId: 'asherkim425' }).재시결과, '통과');

// 미달 점수
const fail = parsed.records.map((r) => (r.학생이름 === '김민재' && r.세트명.endsWith('2A') ? { ...r, 테스트: '80' } : r));
assert.equal(d.judgeHomework({ ...base, records: fail, studentName: '김민재', classcardId: 'asherkim425' }).재시결과, '미달');

// 유닛 없음 → 판정 안 함
assert.equal(d.judgeHomework({ ...base, unit: null, studentName: '김민재' }).숙제, '');
// 아이디 없는 학생명단이면 이름으로 매칭
assert.equal(d.judgeHomework({ ...base, studentName: '김민재', classcardId: '' }).숙제, 'O');

// ---- 필기인증 ----
const notes = [{ 타임스탬프: '2026. 9. 16 오후 9:30:00', '학생 이름': '김민재' }, { 타임스탬프: '2026-09-10 10:00', '학생 이름': '김래윤' }];
assert.equal(d.fmtDT(d.parseDateTime('2026. 9. 16 오후 9:30:00')), '2026-09-16 21:30');
assert.equal(d.fmtDT(d.parseDateTime('2026. 9. 16 오전 12:05:00')), '2026-09-16 00:05');
assert.equal(d.judgeNotes(notes, '김민재', prevStart, deadline), 'O');
assert.equal(d.judgeNotes(notes, '김민재', new Date(2026, 8, 17, 0, 0), deadline), '');  // 기간 밖이면 X
assert.equal(d.judgeNotes(notes, '김래윤', prevStart, deadline), '');   // 기간 밖
assert.equal(d.judgeNotes(notes, '박없음', prevStart, deadline), '');

// ---- 설정 ----
assert.deepEqual(d.parseSettings([{ 키: '리콜기준', 값: '300' }, { 키: '엉뚱', 값: '1' }]).리콜기준, 300);
console.log('all dashboard tests passed');

// ===== 리딩 숙제 판정 =====
{
  const Q = [
    { 교재: 'Easy Link 4', 유닛: '3', 문항ID: 'EL4-3-1' },
    { 교재: 'Easy Link 4', 유닛: '3', 문항ID: 'EL4-3-2' },
  ];
  const deadline = new Date('2026-09-23T17:00:00');
  const rec = (id, t) => ({ 이름: '김민재', 교재: 'Easy Link 4', 유닛: '3', 문항ID: id, 시각: t });

  // 전부 마감 전 → O
  let r = d.judgeReadingHomework({ readingQuestions: Q, readingRecords: [rec('EL4-3-1', '2026-09-22 18:00'), rec('EL4-3-2', '2026-09-22 18:10')], studentName: '김민재', textbooks: ['Easy Link 4'], unit: 3, deadline });
  assert.equal(r.리딩, 'O');
  // 일부만 → X
  r = d.judgeReadingHomework({ readingQuestions: Q, readingRecords: [rec('EL4-3-1', '2026-09-22 18:00')], studentName: '김민재', textbooks: ['Easy Link 4'], unit: 3, deadline });
  assert.equal(r.리딩, 'X');
  // 마감 후 완료 → 늦음
  r = d.judgeReadingHomework({ readingQuestions: Q, readingRecords: [rec('EL4-3-1', '2026-09-22 18:00'), rec('EL4-3-2', '2026-09-23 19:00')], studentName: '김민재', textbooks: ['Easy Link 4'], unit: 3, deadline });
  assert.equal(r.리딩, '늦음');
  // 그 유닛 문제 없음 → '' (요구 안 함)
  r = d.judgeReadingHomework({ readingQuestions: Q, readingRecords: [], studentName: '김민재', textbooks: ['Easy Link 4'], unit: 9, deadline });
  assert.equal(r.리딩, '');
  // 이름 유연 비교 (공백)
  r = d.judgeReadingHomework({ readingQuestions: Q, readingRecords: [rec('EL4-3-1', '2026-09-22 18:00'), { ...rec('EL4-3-2', '2026-09-22 18:10'), 이름: '김 민재' }], studentName: '김민재', textbooks: ['easy link4'], unit: 3, deadline });
  assert.equal(r.리딩, 'O');

  // 병합: 나쁜 쪽 우선, '' 무시
  assert.equal(d.mergeHomework('O', 'X'), 'X');
  assert.equal(d.mergeHomework('O', '늦음'), '늦음');
  assert.equal(d.mergeHomework('늦음', 'O'), '늦음');
  assert.equal(d.mergeHomework('', 'O'), 'O');
  assert.equal(d.mergeHomework('X', ''), 'X');
  assert.equal(d.mergeHomework('', ''), '');
  console.log('리딩 숙제 판정 ✓');
}
