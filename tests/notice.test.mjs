import assert from 'node:assert/strict';
import { buildClasscardAccount, firstClassLabel, textbooksOfClass, buildWelcomeNotice } from '../lib/notice.js';

// ---- 계정 규칙 ----
const a1 = buildClasscardAccount({ 영어이름: 'Seojun', 학부모연락처: '010-1234-4821' });
assert.equal(a1.아이디, 'seojun4821');
assert.equal(a1.비번, '4821ru');
assert.equal(a1.재사용, false);

// 영어이름 없으면 ru+뒷4
const a2 = buildClasscardAccount({ 영어이름: '', 학부모연락처: '01012344821' });
assert.equal(a2.아이디, 'ru4821');

// 기존 계정 재사용 (재원생 추가 등록)
const a3 = buildClasscardAccount({ 영어이름: 'Mina', 학부모연락처: '010-1111-2222', 기존아이디: 'mina9999', 기존비번: '9999ru' });
assert.equal(a3.아이디, 'mina9999');
assert.equal(a3.재사용, true);

// ---- 첫 수업 표기 ----
assert.equal(firstClassLabel({ 시작일: '2026-09-22', 수업시간: '18:00' }), '2026년 9월 22일 (화) 18:00');
assert.equal(firstClassLabel({ 시작일: '', 수업시간: '18:00' }), '추후 안내드리겠습니다');

// ---- 교재 조회 (이름 유연 매칭) ----
const books = textbooksOfClass(
  { 교재: 'Easy Link 4' },
  [{ 교재명: 'easy link4', 구입링크: 'https://kyobo/el4', 비고: '워크북 포함' }]
);
assert.equal(books.length, 1);
assert.equal(books[0].구입링크, 'https://kyobo/el4');
assert.equal(books[0].비고, '워크북 포함');

// ---- 안내문 ----
const notice = buildWelcomeNotice({
  학생이름: '김서준',
  반들: [{
    반이름: 'Easy Link 4-A반', 대분류: '리딩', 수업요일: '월수금', 수업시간: '18:00', 시작일: '2026-09-22',
    교재목록: [{ 교재명: 'Easy Link 4', 구입링크: 'https://kyobo/el4', 비고: '' }],
  }],
  계정: { 아이디: 'seojun4821', 비번: '4821ru' },
  카톡채널링크: '',
});
assert.ok(notice.includes('김서준 어머님'));
assert.ok(notice.includes('seojun4821'));
assert.ok(notice.includes('4821ru'));
assert.ok(notice.includes('2026년 9월 22일 (화) 18:00'));
assert.ok(notice.includes('https://kyobo/el4'));
assert.ok(notice.includes('문자 주세요')); // 카톡 채널 없을 때 문의 문구
assert.ok(!notice.includes('카카오톡 채널을 추가')); // 채널 단계 제외
assert.ok(!notice.includes('**') && !notice.includes('###')); // 마크다운 금지
assert.ok(!notice.includes('포인트')); // 포인트 앱 단계 삭제됨

// 채널 링크 있으면 채널 단계 포함 + 문의 문구 교체
const notice2 = buildWelcomeNotice({
  학생이름: '김서준', 반들: [], 계정: { 아이디: 'a', 비번: 'b' },
  카톡채널링크: 'https://pf.kakao.com/xxx',
});
assert.ok(notice2.includes('카카오톡 채널을 추가'));
assert.ok(notice2.includes('https://pf.kakao.com/xxx'));
assert.ok(!notice2.includes('문자 주세요'));

console.log('notice.test.mjs: 전부 통과');
