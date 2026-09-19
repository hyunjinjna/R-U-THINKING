// 코치용: 포인트 교환 신청 목록 + 지급 완료 처리
import { dashboardSheetId } from '../../../lib/dashboardData';
import { readTab, updateCell } from '../../../lib/sheetsWrite';
import { koreaTimeString } from '../../../lib/utils';

export const dynamic = 'force-dynamic';
const EXCHANGE_TAB = '포인트교환';

export async function GET() {
  const sheetId = dashboardSheetId();
  if (!sheetId) return Response.json({ demo: true, pending: [], done: [] });
  const r = await readTab(sheetId, EXCHANGE_TAB);
  if (!r.ok) return Response.json({ error: r.error, pending: [], done: [] });
  if (r.missing) return Response.json({ pending: [], done: [], warning: '통합 대시보드 시트에 "포인트교환" 탭이 아직 없어요. 탭 이름만 만들어두면 됩니다 (헤더: 시각|이름|상품|가격|지급여부).' });
  const rows = r.rows || [];
  const pending = rows.filter((x) => !String(x['지급여부'] || '').trim());
  const done = rows.filter((x) => String(x['지급여부'] || '').trim()).reverse().slice(0, 30);
  return Response.json({ pending, done });
}

export async function POST(request) {
  const { _row } = await request.json();
  const sheetId = dashboardSheetId();
  if (!sheetId || !_row) return Response.json({ error: '처리할 수 없어요.' });
  const r = await updateCell(sheetId, EXCHANGE_TAB, _row, '지급여부', '지급완료 ' + koreaTimeString());
  return Response.json(r);
}
