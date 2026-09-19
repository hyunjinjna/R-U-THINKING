import assert from 'node:assert/strict';
import { buildAutoHomework, findSetLink, testInfoFor } from '../lib/curriculum.js';
import { parseHomeworkLine } from '../lib/week.js';

const SETS = [
  { 세트이름: 'Easy Link 5 - Unit 3', 링크: 'https://cc/u3' },
  { 세트이름: 'easy link5 - unit 3 workbook', 링크: 'https://cc/u3wb' }, // 표기 흔들림
  { 세트이름: 'Easy Link 5 - Unit 3 Sentences', 링크: 'https://cc/u3s' },
  { 세트이름: 'Easy Link 5 - Unit 2', 링크: 'https://cc/u2' },
  { 세트이름: 'My Next Grammar 1 - Unit 4A', 링크: 'https://cc/g4a' },
  { 세트이름: 'My Next Grammar 1 - Unit 3B', 링크: 'https://cc/g3b' },
  { 세트이름: 'My Next Grammar 1 - Unit 3 Test', 링크: 'https://cc/g3t' },
];

// ---- findSetLink: 대소문자·띄어쓰기 무시 ----
assert.equal(findSetLink(SETS, 'Easy Link 5 - Unit 3 Workbook'), 'https://cc/u3wb');
assert.equal(findSetLink(SETS, '없는 세트'), '');

// ---- 리딩: 당일 2개 + D+1 2개, 전부 파싱 가능 형식 ----
const reading = buildAutoHomework({ category: '리딩', textbook: 'Easy Link 5', unit: 3, sets: SETS });
const rLines = reading.split('\n');
assert.equal(rLines.length, 4);
const r0 = parseHomeworkLine(rLines[0]);
assert.equal(r0.link, 'https://cc/u3');
assert.equal(r0.requiredDay, null); // 당일
assert.ok(r0.title.includes('두 바퀴'));
assert.equal(parseHomeworkLine(rLines[1]).link, 'https://cc/u3wb');
const r2 = parseHomeworkLine(rLines[2]);
assert.equal(r2.link, 'https://cc/u2');
assert.equal(r2.requiredDay, 1); // D+1 매칭
assert.equal(parseHomeworkLine(rLines[3]).requiredDay, 1); // D+1 스피킹

// ---- 리딩 1회차: 복습(매칭) 없음 → 3개 ----
const reading1 = buildAutoHomework({ category: '리딩', textbook: 'Easy Link 5', unit: 1, sets: SETS });
assert.equal(reading1.split('\n').length, 3);
assert.ok(!reading1.includes('매칭'));

// ---- 단어: 당일 암기+스피킹 / D+1 매칭+드릴 ----
const vocab = buildAutoHomework({ category: '단어', textbook: 'Easy Link 5', unit: 3, sets: SETS });
const vLines = vocab.split('\n').map(parseHomeworkLine);
assert.equal(vLines.length, 4);
assert.equal(vLines[0].requiredDay, null);
assert.equal(vLines[1].requiredDay, null);
assert.equal(vLines[2].requiredDay, 1);
assert.equal(vLines[3].requiredDay, 1);
assert.equal(vLines[3].link, ''); // Drill 세트 미등록 → 제목만

// ---- 문법: 당일 A / D+1 (n-1)B ----
const grammar = buildAutoHomework({ category: '문법', textbook: 'My Next Grammar 1', unit: 4, sets: SETS });
const gLines = grammar.split('\n').map(parseHomeworkLine);
assert.equal(gLines.length, 2);
assert.equal(gLines[0].link, 'https://cc/g4a');
assert.equal(gLines[1].link, 'https://cc/g3b');
assert.equal(gLines[1].requiredDay, 1);

// ---- 파닉스: 클래스카드 암기 + 워크북(필기인증 링크) ----
const phonics = buildAutoHomework({ category: '파닉스', textbook: 'EFL Phonics 1', unit: 2, sets: [], notesLink: 'https://forms.gle/x' });
const pLines = phonics.split('\n').map(parseHomeworkLine);
assert.equal(pLines.length, 2);
assert.equal(pLines[1].link, 'https://forms.gle/x');

// ---- 생성 불가 케이스 ----
assert.equal(buildAutoHomework({ category: '리딩', textbook: '', unit: 3, sets: SETS }), '');
assert.equal(buildAutoHomework({ category: '리딩', textbook: 'Easy Link 5', unit: null, sets: SETS }), '');
assert.equal(buildAutoHomework({ category: '스피킹', textbook: 'X', unit: 1, sets: SETS }), '');

// ---- 테스트 정보 ----
const t1 = testInfoFor({ category: '문법', textbook: 'My Next Grammar 1', unit: 4, sets: SETS });
assert.equal(t1.링크, 'https://cc/g3t');
const t2 = testInfoFor({ category: '리딩', textbook: 'Easy Link 5', unit: 3, sets: SETS });
assert.equal(t2.링크, 'https://cc/u2');
assert.equal(testInfoFor({ category: '리딩', textbook: 'Easy Link 5', unit: 1, sets: SETS }), null); // 1회차
assert.equal(testInfoFor({ category: '파닉스', textbook: 'EFL Phonics 1', unit: 3, sets: SETS }), null);

console.log('curriculum.test.mjs: 전부 통과');
