// 26번 자동 포인트 — 순수 로직
// 포인트는 아이 자기 체크가 아니라 실제 판정 기록(대시보드) 기준으로 자동 계산한다.
// 규칙·상품은 통합 대시보드 시트의 "포인트규칙"/"포인트상품" 탭에서 Julia가 채우고,
// 비어 있는 동안은 아래 기본 점수표로 작동한다.

// 기본 점수표 (시트 값이 있으면 시트가 우선)
export const DEFAULT_POINT_RULES = {
  출석: 10,
  지각: 5,
  숙제O: 10,
  숙제늦음: 5,
  테스트통과: 10,
  재시통과: 5,
  시크릿코드: 5,
  필기인증: 5,
};

/** 포인트규칙 탭 rows(행동|점수) → 규칙 객체 (기본값 위에 덮어쓰기) */
export function mergePointRules(ruleRows) {
  const rules = { ...DEFAULT_POINT_RULES };
  for (const r of ruleRows || []) {
    const key = String(r['행동'] || '').trim();
    const val = parseInt(String(r['점수'] || '').trim(), 10);
    if (key && !isNaN(val)) rules[key] = val;
  }
  return rules;
}

/** 대시보드 기록 한 줄 → 포인트 */
export function pointsOfRecord(rec, rules) {
  let p = 0;
  const att = String(rec['출석'] || '').trim();
  if (att === '출석') p += rules.출석 || 0;
  else if (att === '지각') p += rules.지각 || 0;

  const hw = String(rec['숙제'] || '').trim();
  if (hw === 'O') p += rules.숙제O || 0;
  else if (hw === '늦음') p += rules.숙제늦음 || 0;

  const test = String(rec['재시결과'] || '').trim();
  if (test === '통과') p += rules.테스트통과 || 0;
  else if (test === '재시통과') p += rules.재시통과 || 0;

  if (String(rec['시크릿코드'] || '').trim() === 'O') p += rules.시크릿코드 || 0;
  if (String(rec['필기인증'] || '').trim() === 'O') p += rules.필기인증 || 0;
  return p;
}

/** 날짜 문자열이 이번 주(월~일)에 속하는지 */
export function isThisWeek(dateStr, today = new Date()) {
  const d = new Date(String(dateStr || '').slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return false;
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);
  const mon = new Date(now);
  const day = mon.getDay() === 0 ? 7 : mon.getDay(); // 일요일=7
  mon.setDate(mon.getDate() - (day - 1));
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return d >= mon && d <= sun;
}

/**
 * 총·이번주 포인트 계산
 * @param records 대시보드 기록 (이 학생 것만)
 * @param exchanges 포인트교환 기록 (이 학생 것만) — 지급여부에 글자가 있으면 차감 확정
 */
export function computePoints(records, exchanges, rules, today = new Date()) {
  let total = 0;
  let thisWeek = 0;
  for (const rec of records || []) {
    const p = pointsOfRecord(rec, rules);
    total += p;
    if (isThisWeek(rec['날짜'], today)) thisWeek += p;
  }
  let spent = 0;
  let pending = 0;
  for (const ex of exchanges || []) {
    const price = parseInt(String(ex['가격'] || '').trim(), 10) || 0;
    if (String(ex['지급여부'] || '').trim()) spent += price;
    else pending += price;
  }
  return { 총포인트: total - spent, 이번주: thisWeek, 사용: spent, 신청중: pending };
}

/**
 * 이번 주 포인트 내역 (감점 프레임 확정안)
 * - 부분 점수(지각·숙제늦음)는 만점으로 더한 뒤 차감 줄로 표시
 * - 0점(안 한 숙제·결석)은 "놓친 포인트" 안내 줄 (합계 영향 없음)
 * - 재시통과는 노력의 결과라 플러스 유지
 * 반환 항목: { label, count, points, kind } — kind: plus | minus | missed
 * plus·minus 합계 = 이번 주 실제 포인트와 일치해야 한다.
 */
export function weeklyBreakdown(records, rules, today = new Date()) {
  const week = (records || []).filter((r) => isThisWeek(r['날짜'], today));
  const cnt = {
    출석: 0, 지각: 0, 결석: 0,
    숙제O: 0, 숙제늦음: 0, 숙제X: 0,
    통과: 0, 재시통과: 0, 미달: 0,
    코드: 0, 필기: 0,
  };
  for (const r of week) {
    const att = String(r['출석'] || '').trim();
    if (att === '출석') cnt.출석++;
    else if (att === '지각') cnt.지각++;
    else if (att === '결석' || att === '사전결석') cnt.결석++;
    const hw = String(r['숙제'] || '').trim();
    if (hw === 'O') cnt.숙제O++;
    else if (hw === '늦음') cnt.숙제늦음++;
    else if (hw === 'X') cnt.숙제X++;
    const t = String(r['재시결과'] || '').trim();
    if (t === '통과') cnt.통과++;
    else if (t === '재시통과') cnt.재시통과++;
    else if (t === '미달' || t === '미응시') cnt.미달++;
    if (String(r['시크릿코드'] || '').trim() === 'O') cnt.코드++;
    if (String(r['필기인증'] || '').trim() === 'O') cnt.필기++;
  }

  const items = [];
  const push = (label, count, points, kind) => {
    if (count > 0 && (points !== 0 || kind === 'missed')) items.push({ label, count, points, kind });
  };

  // 수업 참여 = 출석 + 지각 (지각도 일단 만점으로 더하고 아래에서 깎는다)
  const 참여 = cnt.출석 + cnt.지각;
  push('🏫 수업 참여', 참여, 참여 * (rules.출석 || 0), 'plus');
  push('😢 지각', cnt.지각, -(cnt.지각 * ((rules.출석 || 0) - (rules.지각 || 0))), 'minus');

  const 숙제완료 = cnt.숙제O + cnt.숙제늦음;
  push('📚 숙제 완료', 숙제완료, 숙제완료 * (rules.숙제O || 0), 'plus');
  push('😢 늦게 낸 숙제', cnt.숙제늦음, -(cnt.숙제늦음 * ((rules.숙제O || 0) - (rules.숙제늦음 || 0))), 'minus');
  if (cnt.숙제X > 0) items.push({ label: '❌ 안 한 숙제', count: cnt.숙제X, points: cnt.숙제X * (rules.숙제O || 0), kind: 'missed' });

  push('📝 테스트 통과', cnt.통과, cnt.통과 * (rules.테스트통과 || 0), 'plus');
  push('💪 재시험으로 통과', cnt.재시통과, cnt.재시통과 * (rules.재시통과 || 0), 'plus');
  push('🔑 시크릿코드', cnt.코드, cnt.코드 * (rules.시크릿코드 || 0), 'plus');
  push('📸 필기 인증', cnt.필기, cnt.필기 * (rules.필기인증 || 0), 'plus');

  return items;
}
