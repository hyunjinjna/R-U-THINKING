// 26번 자동 포인트 + 마켓
// GET  ?name=&phone= : 총·이번주 포인트, 상품 목록, 내 교환 신청
// POST { name, phone, 상품, 가격 } : 교환 신청 (포인트교환 탭에 기록)
// 규칙·상품·교환 기록은 통합 대시보드 시트의 탭: 포인트규칙(행동|점수) / 포인트상품(상품|가격) / 포인트교환
import { loadStudents, dashboardSheetId } from '../../../lib/dashboardData';
import { readTab, appendRow } from '../../../lib/sheetsWrite';
import { DASHBOARD_TAB } from '../../../lib/dashboard';
import { mergePointRules, computePoints, weeklyBreakdown } from '../../../lib/points';
import { sameName, splitMulti, koreaTimeString } from '../../../lib/utils';
import { IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

const RULES_TAB = '포인트규칙';
const GOODS_TAB = '포인트상품';
const EXCHANGE_TAB = '포인트교환';

const digitsOnly = (s) => String(s || '').replace(/[^0-9]/g, '');

const DEMO_GOODS = [
  { 상품: '연필 세트', 가격: '30' },
  { 상품: '캐릭터 스티커', 가격: '50' },
  { 상품: '문화상품권 5천원', 가격: '300' },
];

async function verifyStudent(name, phone) {
  const students = await loadStudents();
  const mine = students.filter((s) =>
    sameName(s['이름'], name) &&
    digitsOnly(s['학부모 연락처'] || s['전화번호'] || '') === digitsOnly(phone)
  );
  if (mine.length === 0) return null;
  return [...new Set(mine.flatMap((s) => splitMulti(s['반이름'])))];
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get('name') || '').trim();
  const phone = searchParams.get('phone') || '';
  if (!name || !phone) return Response.json({ error: '이름과 전화번호가 필요합니다.' });

  const myClasses = await verifyStudent(name, phone);
  if (!myClasses) return Response.json({ error: '명단에서 찾지 못했어요.' });

  const sheetId = dashboardSheetId();
  let records = [];
  let ruleRows = [];
  let goods = DEMO_GOODS;
  let exchanges = [];

  if (!IS_DEMO && sheetId) {
    const [rec, rules, g, ex] = await Promise.all([
      readTab(sheetId, DASHBOARD_TAB),
      readTab(sheetId, RULES_TAB),
      readTab(sheetId, GOODS_TAB),
      readTab(sheetId, EXCHANGE_TAB),
    ]);
    records = (rec.rows || []).filter((r) => sameName(r['이름'], name) && myClasses.some((c) => sameName(r['반이름'], c)));
    ruleRows = rules.rows || [];
    goods = (g.rows || []).filter((r) => String(r['상품'] || '').trim());
    exchanges = (ex.rows || []).filter((r) => sameName(r['이름'], name));
  }

  const rules = mergePointRules(ruleRows);
  const points = computePoints(records, exchanges, rules);
  const 이번주내역 = weeklyBreakdown(records, rules);
  const myExchanges = exchanges.map((e) => ({
    시각: e['시각'] || '', 상품: e['상품'] || '', 가격: e['가격'] || '',
    상태: String(e['지급여부'] || '').trim() ? '🚚 상품을 보냈어요! 곧 도착할 거예요' : '신청 중',
  })).reverse();

  return Response.json({ ok: true, ...points, 이번주내역, 상품목록: goods, 내신청: myExchanges });
}

export async function POST(request) {
  const { name, phone, 상품, 가격 } = await request.json();
  if (!name || !phone || !상품) return Response.json({ error: '신청 정보가 부족합니다.' });

  const myClasses = await verifyStudent(name, phone);
  if (!myClasses) return Response.json({ error: '명단에서 찾지 못했어요.' });

  const sheetId = dashboardSheetId();
  if (!sheetId) return Response.json({ error: '포인트 시트가 아직 연결되지 않았어요.' });

  // 잔여 포인트 확인 (신청 중 금액까지 잠금)
  const [rec, rules, ex] = await Promise.all([
    readTab(sheetId, DASHBOARD_TAB),
    readTab(sheetId, RULES_TAB),
    readTab(sheetId, EXCHANGE_TAB),
  ]);
  const records = (rec.rows || []).filter((r) => sameName(r['이름'], name) && myClasses.some((c) => sameName(r['반이름'], c)));
  const exchanges = (ex.rows || []).filter((r) => sameName(r['이름'], name));
  const p = computePoints(records, exchanges, mergePointRules(rules.rows || []));
  const price = parseInt(String(가격 || '').trim(), 10) || 0;
  if (p.총포인트 - p.신청중 < price) {
    return Response.json({ error: `포인트가 부족해요. (지금 쓸 수 있는 포인트: ${p.총포인트 - p.신청중}P)` });
  }

  // 포인트교환 탭: 시각 | 이름 | 상품 | 가격 | 지급여부
  const r = await appendRow(sheetId, EXCHANGE_TAB, [koreaTimeString(), name, 상품, String(price), '']);
  if (!r.ok) return Response.json({ error: '신청 저장에 실패했어요: ' + (r.error || '') + ' — 포인트교환 탭이 있는지 확인해주세요.' });
  return Response.json({ ok: true });
}
