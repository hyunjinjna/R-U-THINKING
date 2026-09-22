// 코치 일일 대시보드 — 자동 판정 로직
// 시트/네트워크에 의존하지 않는 순수 함수만 둔다 (테스트 가능하게).

import { normalize, sameName } from './utils';
import { parseDate } from './week';

export const DASHBOARD_TAB = '대시보드';
export const ENTRY_TAB = '입장기록';
export const CODE_TAB = '시크릿코드';
export const CLASSCARD_TAB = '클래스카드기록';
export const SETTINGS_TAB = '설정';

export const DASHBOARD_HEADERS = [
  '날짜', '회차', '반이름', '이름', '출석', '입장시각', '숙제', '재시결과',
  '시크릿코드', '수업태도', '필기인증', '특이사항', '단어점수', '저장시각',
];
export const ENTRY_HEADERS = ['시각', '날짜', '반이름', '이름'];
export const CODE_HEADERS = ['시각', '날짜', '반이름', '이름', '입력코드', '정답여부'];
export const CLASSCARD_HEADERS = [
  '학생이름', '아이디', '클래스명', '세트유형', '세트명', '학습일',
  '암기학습', '리콜학습', '스펠학습', '매칭', '테스트', '테스트제출일',
  '맞은문항수', '틀린문항수', '완료여부', '누적오답', '처음본날',
];

export const DEFAULT_SETTINGS = {
  암기기준: 200,
  리콜기준: 200,
  테스트통과: 90,
  지각기준분: 5,
  수업길이분: 50,
};

export const ATTITUDE_OPTIONS = ['집중', '보통', '산만', '졸음'];
export const ATTENDANCE_OPTIONS = ['출석', '지각', '결석', '사전결석'];
export const HOMEWORK_OPTIONS = ['O', '늦음', 'X'];
export const RETEST_OPTIONS = ['통과', '재시통과', '미달', '미응시'];

/** 설정 탭(키|값) → 객체. 없거나 숫자가 아니면 기본값 */
export function parseSettings(rows) {
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows || []) {
    const key = String(r['키'] || r['항목'] || '').trim();
    const val = parseFloat(String(r['값'] || '').replace(/[^0-9.]/g, ''));
    if (key in out && !isNaN(val)) out[key] = val;
  }
  return out;
}

/** "2026-09-19 17:03" 또는 "9/19 17:03" → Date (연도 없으면 기준 연도) */
export function parseDateTime(str, baseYear) {
  if (!str) return null;
  const s = String(str).trim();
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), 0, 0);
  // 구글폼 타임스탬프: "2026. 9. 16 오후 9:30:00" / "2026. 9. 16 오전 11:05:12"
  m = s.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*(오전|오후)?\s*(\d{1,2}):(\d{2})/);
  if (m) {
    let h = +m[5];
    if (m[4] === '오후' && h < 12) h += 12;
    if (m[4] === '오전' && h === 12) h = 0;
    return new Date(+m[1], +m[2] - 1, +m[3], h, +m[6], 0, 0);
  }
  m = s.match(/^(\d{1,2})[-./](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) {
    const year = baseYear || new Date().getFullYear();
    return new Date(year, +m[1] - 1, +m[2], +(m[3] || 0), +(m[4] || 0), 0, 0);
  }
  return null;
}

/** 반의 수업 시작 Date (날짜 문자열 + "17:00") */
export function classStartAt(dateStr, timeStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  const m = String(timeStr || '').match(/(\d{1,2}):(\d{2})/);
  if (m) d.setHours(+m[1], +m[2], 0, 0);
  return d;
}

/**
 * 줌 입장 클릭 시각 → 출석 / 지각 / 결석
 * @returns {{출석: string, 입장시각: string, 늦은분: number}}
 */
export function judgeAttendance(entryTime, classStart, settings = DEFAULT_SETTINGS) {
  if (!entryTime) return { 출석: '결석', 입장시각: '', 늦은분: 0 };
  const hh = String(entryTime.getHours()).padStart(2, '0');
  const mm = String(entryTime.getMinutes()).padStart(2, '0');
  const stamp = `${hh}:${mm}`;
  if (!classStart) return { 출석: '출석', 입장시각: stamp, 늦은분: 0 };
  const diffMin = Math.floor((entryTime - classStart) / 60000);
  if (diffMin >= settings.지각기준분) return { 출석: '지각', 입장시각: stamp, 늦은분: diffMin };
  return { 출석: '출석', 입장시각: stamp, 늦은분: 0 };
}

/** 커리큘럼 진도 문자열에서 유닛 번호 ("Unit 3", "unit3", "3단원") */
export function extractUnit(str) {
  const s = String(str || '');
  let m = s.match(/unit\s*(\d+)/i);
  if (m) return +m[1];
  m = s.match(/(\d+)\s*단원/);
  if (m) return +m[1];
  m = s.match(/\b(\d+)\b/);
  return m ? +m[1] : null;
}

/** 세트명에서 유닛 번호와 A/B/Test 구분 */
export function parseSetName(name) {
  const s = String(name || '');
  const m = s.match(/unit\s*(\d+)\s*([ab])?\b/i);
  const unit = m ? +m[1] : null;
  const part = m && m[2] ? m[2].toUpperCase() : '';
  const isTest = /test/i.test(s);
  const isReview = /review/i.test(s) && !unit;
  return { unit, part, isTest, isReview };
}

/** 클래스카드 전체학생 리포트 엑셀(header:1 배열) → 객체 배열 */
export function parseFullReport(rows, baseYear) {
  if (!rows || rows.length < 2) return { error: '엑셀에 데이터가 없습니다.', records: [] };
  const headerIdx = rows.findIndex((r) => r.some((c) => String(c).includes('학생이름')) && r.some((c) => String(c).includes('세트명')));
  if (headerIdx < 0) return { error: '"학생이름", "세트명" 열이 있는 클래스카드 전체학생 리포트 파일이 아닙니다.', records: [] };
  const headers = rows[headerIdx].map((h) => String(h || '').replace(/\s|\(%\)|\(.*?\)/g, ''));
  const col = (name) => headers.findIndex((h) => h.startsWith(name));
  const idx = {
    학생이름: col('학생이름'), 아이디: col('아이디'), 클래스명: col('클래스명'), 세트유형: col('세트유형'),
    세트명: col('세트명'), 학습일: col('학습일'), 암기학습: col('암기학습'), 리콜학습: col('리콜학습'),
    스펠학습: col('스펠학습'), 매칭: col('매칭'), 테스트: headers.findIndex((h) => h === '테스트'),
    테스트제출일: col('테스트제출일'), 맞은문항수: col('맞은문항수'), 틀린문항수: col('틀린문항수'),
    완료여부: col('완료여부'), 누적오답: col('누적오답'),
  };
  const get = (r, k) => (idx[k] >= 0 ? String(r[idx[k]] ?? '').trim() : '');
  const records = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const name = get(r, '학생이름');
    const setName = get(r, '세트명');
    if (!name || !setName) continue;
    // 클래스명 "Insight Link 3 (836581618)" → "Insight Link 3"
    const className = get(r, '클래스명').replace(/\s*\(\d+\)\s*$/, '').replace(/\n/g, ' ').trim();
    const rec = {
      학생이름: name, 아이디: get(r, '아이디'), 클래스명: className, 세트유형: get(r, '세트유형'),
      세트명: setName, 학습일: get(r, '학습일'), 암기학습: get(r, '암기학습'), 리콜학습: get(r, '리콜학습'),
      스펠학습: get(r, '스펠학습'), 매칭: get(r, '매칭'), 테스트: get(r, '테스트'),
      테스트제출일: get(r, '테스트제출일').replace(/^-$/, ''), 맞은문항수: get(r, '맞은문항수'),
      틀린문항수: get(r, '틀린문항수'), 완료여부: get(r, '완료여부'), 누적오답: get(r, '누적오답'),
    };
    // 누적오답 행은 세트명에만 "누적오답 단어복습 (n카드)"로 옴 → 별도 표시
    if (/누적오답/.test(setName)) {
      rec.세트유형 = '오답복습';
      rec.누적오답 = rec.누적오답 || rec.완료여부;
    }
    // 학습일에 연도가 없으면 붙여서 저장 (나중에 해석 흔들리지 않게)
    const dt = parseDateTime(rec.학습일, baseYear);
    if (dt) rec.학습일 = fmtDT(dt);
    const tdt = parseDateTime(rec.테스트제출일, baseYear);
    if (tdt) rec.테스트제출일 = fmtDT(tdt);
    records.push(rec);
  }
  return { error: null, records };
}

export function fmtDT(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 기존 기록과 새 업로드 병합.
 * 같은 학생·클래스·세트는 새 값으로 갱신하되, "처음본날"은 유지한다.
 * (학습일이 재학습으로 뒤로 밀려도, 처음 완료를 확인한 시점의 판정을 지키기 위해)
 */
export function mergeClassCardRecords(existing, incoming, today) {
  const key = (r) => [normalize(r.학생이름), normalize(r.아이디), normalize(r.클래스명), normalize(r.세트명)].join('|');
  const map = new Map();
  for (const r of existing || []) map.set(key(r), { ...r });
  for (const r of incoming) {
    const k = key(r);
    const old = map.get(k);
    const merged = { ...(old || {}), ...r };
    merged.처음본날 = (old && old.처음본날) || today;
    // 처음 본 날의 학습일이 더 이르면 그걸 유지 (재학습으로 밀린 경우)
    if (old && old.학습일 && r.학습일 && old.학습일 < r.학습일) merged.학습일 = old.학습일;
    map.set(k, merged);
  }
  return [...map.values()];
}

function pct(v) {
  const n = parseFloat(String(v || '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function matchesTextbook(className, textbooks) {
  if (!textbooks || textbooks.length === 0) return true;
  return textbooks.some((t) => normalize(className).includes(normalize(t)) || normalize(t).includes(normalize(className)));
}

/**
 * 한 학생의 "이번 수업 전까지 해왔어야 할 숙제" 판정
 *
 * @param {object} p
 * @param {Array}  p.records      클래스카드기록 전체
 * @param {string} p.studentName
 * @param {string} p.classcardId  학생명단의 클래스카드 아이디 (없으면 이름으로)
 * @param {string[]} p.textbooks  이 반의 교재 목록
 * @param {number} p.unit         지난 회차 유닛 번호 (이번 수업에서 확인할 숙제)
 * @param {Date}   p.deadline     이번 수업 시작 시각
 * @param {Date}   p.prevClassStart 지난 수업 시작 시각 (수업 중 테스트 판정용)
 * @param {object} p.settings
 */
export function judgeHomework(p) {
  const { records, studentName, classcardId, textbooks, unit, deadline, prevClassStart, settings = DEFAULT_SETTINGS } = p;
  const result = { 숙제: '', 재시결과: '', 단어점수: '', 근거: [] };
  if (!unit) return result;

  const inTextbook = (r) => matchesTextbook(r.클래스명, textbooks);
  const mine = (r) => (classcardId && r.아이디 ? normalize(r.아이디) === normalize(classcardId) : sameName(r.학생이름, studentName));

  // 이 반 교재에서 실제로 존재하는 세트 목록 (누군가 한 번이라도 열었으면 존재)
  const classSets = new Map();
  for (const r of records) {
    if (!inTextbook(r) || r.세트유형 === '오답복습') continue;
    const k = normalize(r.클래스명) + '|' + normalize(r.세트명);
    if (!classSets.has(k)) classSets.set(k, { 클래스명: r.클래스명, 세트명: r.세트명, 세트유형: r.세트유형, ...parseSetName(r.세트명) });
  }

  // 요구 세트: Unit u (A 또는 무표시, 단어/드릴), Unit u-1 B (매칭)
  const required = [...classSets.values()].filter((s) => {
    if (s.isTest) return false;
    if (s.unit === unit && s.part !== 'B') return true;
    if (s.unit === unit - 1 && s.part === 'B') return true;
    return false;
  });

  const myRecs = records.filter((r) => inTextbook(r) && mine(r));
  const findRec = (s) => myRecs.find((r) => normalize(r.클래스명) === normalize(s.클래스명) && normalize(r.세트명) === normalize(s.세트명));

  if (required.length > 0) {
    let missing = 0, late = 0;
    for (const s of required) {
      const r = findRec(s);
      let done = false, when = null;
      if (r) {
        if (s.part === 'B') {
          done = pct(r.매칭) > 0;
        } else if (/드릴/.test(s.세트유형)) {
          done = !!r.테스트제출일;
          when = parseDateTime(r.테스트제출일);
        } else {
          done = pct(r.암기학습) >= settings.암기기준 && pct(r.리콜학습) >= settings.리콜기준;
        }
        if (!when) when = parseDateTime(r.학습일);
      }
      if (!done) { missing++; result.근거.push(`${s.세트명}: 안 함`); continue; }
      if (deadline && when && when > deadline) { late++; result.근거.push(`${s.세트명}: 마감 후 완료`); }
      else result.근거.push(`${s.세트명}: 완료`);
    }
    result.숙제 = missing > 0 ? 'X' : late > 0 ? '늦음' : 'O';
  }

  // 수업 시작 테스트: Unit u 단어세트의 테스트 점수, 또는 "Unit u Test" 세트
  const testSets = [...classSets.values()].filter((s) => s.unit === unit && (s.isTest || (s.part !== 'B' && !/드릴/.test(s.세트유형))));
  let best = null;
  for (const s of testSets) {
    const r = findRec(s);
    if (!r) continue;
    const score = r.테스트 === '' ? null : pct(r.테스트);
    if (score === null || !r.테스트제출일) continue;
    if (!best || score > best.score) best = { score, at: parseDateTime(r.테스트제출일) };
  }
  if (best) {
    result.단어점수 = String(best.score);
    if (best.score >= settings.테스트통과) {
      const duringClass = prevClassStart && best.at && best.at >= prevClassStart && best.at <= new Date(prevClassStart.getTime() + settings.수업길이분 * 60000);
      result.재시결과 = duringClass ? '통과' : '재시통과';
    } else {
      result.재시결과 = '미달';
    }
  } else if (testSets.length > 0) {
    result.재시결과 = '미응시';
  }
  return result;
}

/**
 * 필기인증 구글폼 응답 → 해당 학생이 [지난 수업 시작 ~ 이번 수업 시작] 사이에 제출했는지
 * 응답 시트의 이름 열은 "이름"이 들어간 첫 열, 시각은 "타임스탬프" 열
 */
export function judgeNotes(formRows, studentName, fromDate, toDate) {
  if (!formRows || formRows.length === 0) return '';
  const headers = Object.keys(formRows[0]);
  const nameCol = headers.find((h) => /이름/.test(h) && !/학부모|부모/.test(h)) || headers.find((h) => /이름/.test(h));
  const tsCol = headers.find((h) => /타임스탬프|timestamp|제출/i.test(h)) || headers[0];
  if (!nameCol) return '';
  const hit = formRows.some((r) => {
    if (!sameName(r[nameCol], studentName)) return false;
    const t = parseDateTime(r[tsCol]);
    if (!t) return true;
    if (fromDate && t < fromDate) return false;
    if (toDate && t > toDate) return false;
    return true;
  });
  return hit ? 'O' : '';
}

/**
 * 사이트 리딩 숙제 판정 (리딩문제·리딩기록 탭 기반)
 * - 그 교재·유닛에 문제가 아예 없으면 '' (요구하지 않음 — 콘텐츠 준비 전 오판 방지)
 * - 문제 전부 풀었으면: 마지막 기록이 마감(이번 수업 시작) 전이면 'O', 후면 '늦음'
 * - 일부만/안 풀었으면 'X'
 */
export function judgeReadingHomework({ readingQuestions, readingRecords, studentName, textbooks, unit, deadline }) {
  const u = parseInt(unit, 10);
  if (isNaN(u) || u < 1) return { 리딩: '', 근거: [] };
  const inBook = (v) => matchesTextbook(v, textbooks);
  const qs = (readingQuestions || []).filter((q) => inBook(q.교재) && parseInt(q.유닛, 10) === u);
  if (qs.length === 0) return { 리딩: '', 근거: [] };

  const mine = (readingRecords || []).filter(
    (r) => sameName(r.이름, studentName) && inBook(r.교재) && parseInt(r.유닛, 10) === u
  );
  const doneIds = new Set(mine.map((r) => String(r.문항ID || '').trim()).filter(Boolean));
  const total = qs.length;
  const solved = qs.filter((q) => doneIds.has(String(q.문항ID || '').trim())).length;
  if (solved < total) {
    return { 리딩: 'X', 근거: [`리딩 문제 ${solved}/${total} 풀음`] };
  }
  let late = false;
  if (deadline instanceof Date && !isNaN(deadline)) {
    const times = mine.map((r) => new Date(String(r.시각 || '').replace(' ', 'T'))).filter((d) => !isNaN(d));
    if (times.length && Math.max(...times.map((d) => d.getTime())) > deadline.getTime()) late = true;
  }
  return { 리딩: late ? '늦음' : 'O', 근거: [`리딩 문제 ${total}/${total} 완료${late ? ' (마감 후)' : ''}`] };
}

/** 숙제 판정 병합: 클래스카드 판정과 리딩 판정 중 나쁜 쪽 (O > 늦음 > X, ''는 무시) */
export function mergeHomework(a, b) {
  const rank = { O: 3, '늦음': 2, X: 1 };
  const va = rank[a] || 0;
  const vb = rank[b] || 0;
  if (!va) return b || '';
  if (!vb) return a || '';
  return va <= vb ? a : b;
}
