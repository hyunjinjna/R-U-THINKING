// 코치용: 포인트 교환 신청 목록 + 지급 완료 처리
import { dashboardSheetId, loadStudents } from '../../../lib/dashboardData';
import { readTab, updateCell } from '../../../lib/sheetsWrite';
import { koreaTimeString, sameName, splitMulti } from '../../../lib/utils';

export const dynamic = 'force-dynamic';
const EXCHANGE_TAB = '포인트교환';

export async function GET() {
  const sheetId = dashboardSheetId();
  if (!sheetId) return Response.json({ demo: true, pending: [], done: [] });
  const r = await readTab(sheetId, EXCHANGE_TAB);
  if (!r.ok) return Response.json({ error: r.error, pending: [], done: [] });
  if (r.missing) return Response.json({ pending: [], done: [], warning: '통합 대시보드 시트에 "포인트교환" 탭이 아직 없어요. 탭 이름만 만들어두면 됩니다 (헤더: 시각|이름|상품|가격|지급여부).' });
  const rows = r.rows || [];

  // 학생명단 대조: 배송용으로 반·집주소를 붙여서 내려줌 (기록에 저장하지 않고 항상 최신 조회)
  let students = [];
  try { students = await loadStudents(); } catch (e) {}
  const enrich = (x) => {
    const mine = students.filter((s) => sameName(s['이름'], x['이름']));
    const 반들 = [...new Set(mine.flatMap((s) => splitMulti(s['반이름'])))];
    const 주소 = (mine.map((s) => String(s['집주소'] || '').trim()).find(Boolean)) || '';
    return { ...x, 반들: 반들.join(', '), 집주소: 주소 || '미입력' };
  };
  const pending = rows.filter((x) => !String(x['지급여부'] || '').trim()).map(enrich);
  const done = rows.filter((x) => String(x['지급여부'] || '').trim()).reverse().slice(0, 30).map(enrich);
  return Response.json({ pending, done });
}

export async function POST(request) {
  const { _row } = await request.json();
  const sheetId = dashboardSheetId();
  if (!sheetId || !_row) return Response.json({ error: '처리할 수 없어요.' });
  const r = await updateCell(sheetId, EXCHANGE_TAB, _row, '지급여부', '지급완료 ' + koreaTimeString());
  return Response.json(r);
}
