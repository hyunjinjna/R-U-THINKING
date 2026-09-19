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
