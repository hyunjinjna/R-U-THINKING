// 22번 커리큘럼 자동 조립 — 과목(대분류)별 숙제 기본값 생성 규칙
//
// 원칙:
// - 커리큘럼 마스터의 `숙제범위`가 비어 있을 때만 여기 규칙으로 채운다 (직접 입력이 항상 우선)
// - 생성 형식은 학생 화면이 이미 읽는 "제목 | 링크 [D+1]" 그대로
// - 세트 링크는 운영시트 "클래스카드 세트" 탭(세트이름|링크)에서 이름으로 찾는다
// - 링크를 못 찾으면 제목만 생성한다 (Julia가 링크를 아직 안 붙인 상태를 숨기지 않기 위해)
// - 규칙 변경은 이 파일만 고치면 된다

import { sameName } from './utils';

/** 세트 탭에서 이름으로 링크 찾기 (대소문자·띄어쓰기 무시) */
export function findSetLink(sets, name) {
  if (!Array.isArray(sets)) return '';
  const row = sets.find((r) => sameName(r['세트이름'], name));
  return row ? String(row['링크'] || '').trim() : '';
}

function line(title, link, isD1) {
  return title + (link ? ` | ${link}` : '') + (isD1 ? ' [D+1]' : '');
}

/**
 * 과목별 숙제 기본값 생성
 * @param {object} p
 * @param {string} p.category  대분류 (파닉스/리딩/문법/단어)
 * @param {string} p.textbook  교재명 (운영시트 반 탭 `교재` 열, 여러 개면 첫 번째)
 * @param {number} p.unit      이번 회차 유닛 번호 (진도 "Unit n"에서 추출)
 * @param {Array}  p.sets      클래스카드 세트 탭 rows
 * @param {string} p.notesLink 반의 필기인증링크 (파닉스 워크북용)
 * @returns {string} 숙제범위 형식 텍스트 ('' = 생성 불가)
 */
export function buildAutoHomework({ category, textbook, unit, sets, notesLink }) {
  const cat = String(category || '').trim();
  const book = String(textbook || '').trim();
  const n = parseInt(unit, 10);
  if (!book || isNaN(n) || n < 1) return '';

  const set = (name) => findSetLink(sets, name);
  const unitSet = (u) => set(`${book} - Unit ${u}`);
  const lines = [];

  if (cat === '리딩') {
    // 당일: 새 단어 암기·리콜 + Workbook 드릴 / D+1: 지난 유닛 매칭 + 예문 말하기
    lines.push(line(`🆕 Unit ${n} 단어 암기·리콜 (두 바퀴 돌기!)`, unitSet(n)));
    lines.push(line(`✏️ Unit ${n} Workbook 문제 (책 보고 풀기)`, set(`${book} - Unit ${n} Workbook`)));
    if (n > 1) lines.push(line(`🔁 Unit ${n - 1} 매칭 게임`, unitSet(n - 1), true));
    lines.push(line(`🗣️ Unit ${n} 예문 말하기`, set(`${book} - Unit ${n} Sentences`), true));
  } else if (cat === '단어') {
    // 당일: 새 단어 암기·리콜 + 예문 말하기 / D+1: 지난 유닛 매칭 + 문맥 빈칸 드릴
    lines.push(line(`🆕 Unit ${n} 단어 암기·리콜 (두 바퀴 돌기!)`, unitSet(n)));
    lines.push(line(`🗣️ Unit ${n} 예문 말하기`, set(`${book} - Unit ${n} Sentences`)));
    if (n > 1) lines.push(line(`🔁 Unit ${n - 1} 매칭 게임`, unitSet(n - 1), true));
    lines.push(line(`✏️ Unit ${n} 문제 풀기`, set(`${book} - Unit ${n} Drill`), true));
  } else if (cat === '문법') {
    // 당일: A 연습 드릴 / D+1: 지난 유닛 B 복습 드릴
    lines.push(line(`✏️ Unit ${n}A 연습 문제`, set(`${book} - Unit ${n}A`)));
    if (n > 1) lines.push(line(`🔁 Unit ${n - 1}B 복습 문제`, set(`${book} - Unit ${n - 1}B`), true));
  } else if (cat === '파닉스') {
    // 당일: 클래스카드 암기 + 워크북 필기인증 (끊어읽기·듣고 쓰기는 15번 완성 후 추가)
    lines.push(line(`🆕 Unit ${n} 단어 암기 (두 바퀴 돌기!)`, unitSet(n)));
    if (notesLink) lines.push(line(`✏️ Unit ${n} 워크북 풀고 사진 올리기`, notesLink));
  } else {
    return ''; // 모르는 과목은 자동 생성 안 함
  }

  return lines.join('\n');
}

/**
 * 수업 시작 5분 테스트 정보 (코치 화면용, 아이 화면엔 안 나감)
 * 리딩·단어: 지난 유닛 단어세트의 테스트 / 문법: 별도 "Unit n Test" 세트 / 파닉스: 없음(영상으로 시작)
 * 1회차는 "이전 교재 마지막 유닛" 규칙이라 자동 생성 안 함 (커리큘럼에 직접)
 */
export function testInfoFor({ category, textbook, unit, sets }) {
  const cat = String(category || '').trim();
  const book = String(textbook || '').trim();
  const n = parseInt(unit, 10);
  if (!book || isNaN(n) || n <= 1) return null;
  if (cat === '파닉스') return null;

  if (cat === '문법') {
    const name = `${book} - Unit ${n - 1} Test`;
    return { 세트: name, 링크: findSetLink(sets, name), 안내: `Unit ${n - 1} 테스트 드릴` };
  }
  if (cat === '리딩' || cat === '단어') {
    const name = `${book} - Unit ${n - 1}`;
    return { 세트: name, 링크: findSetLink(sets, name), 안내: `Unit ${n - 1} 단어 테스트 (세트 안 테스트 모드)` };
  }
  return null;
}
