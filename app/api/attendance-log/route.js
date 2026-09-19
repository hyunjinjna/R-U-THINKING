import { appendRows } from '../../../lib/sheetsWrite';
import { koreaTimeString } from '../../../lib/utils';
import { ENTRY_TAB, ENTRY_HEADERS } from '../../../lib/dashboard';
import { dashboardSheetId } from '../../../lib/dashboardData';

export const dynamic = 'force-dynamic';

/** 학생이 "수업 입장"을 누른 시각 기록. 실패해도 줌 입장은 막지 않는다. */
export async function POST(request) {
  try {
    const { 반이름, 이름 } = await request.json();
    if (!반이름 || !이름) return Response.json({ ok: false, error: '반이름, 이름이 필요합니다.' });
    const id = dashboardSheetId();
    if (!id) return Response.json({ ok: false, error: '대시보드 시트가 설정되지 않았습니다.' });
    const now = koreaTimeString();
    const res = await appendRows(id, ENTRY_TAB, ENTRY_HEADERS, [{ 시각: now, 날짜: now.slice(0, 10), 반이름, 이름 }]);
    return Response.json(res);
  } catch (err) {
    return Response.json({ ok: false, error: err.message });
  }
}
