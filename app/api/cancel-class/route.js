import { extractSheetId, readTab, updateCell } from '../../../lib/sheetsWrite';
import { sameName } from '../../../lib/utils';
import { parseCancellations, formatDate } from '../../../lib/week';

export const dynamic = 'force-dynamic';

/**
 * 휴강 등록: 운영시트 각 반의 휴강기록 칸에 날짜를 덧붙인다.
 * body: { 반이름들: string[], 날짜들: ['2026-10-03', ...] }
 * (부모 문자 발송은 알리고 키가 들어오면 여기서 이어서 처리)
 */
export async function POST(request) {
  try {
    const { 반이름들, 날짜들 } = await request.json();
    if (!Array.isArray(반이름들) || !Array.isArray(날짜들) || 반이름들.length === 0 || 날짜들.length === 0) {
      return Response.json({ ok: false, error: '반과 날짜를 하나 이상 골라주세요.' });
    }
    const sheetId = extractSheetId(process.env.NEXT_PUBLIC_CLASSES_SHEET_LINK || '');
    if (!sheetId) return Response.json({ ok: false, error: 'NEXT_PUBLIC_CLASSES_SHEET_LINK가 설정되지 않았습니다.' });
    const tab = process.env.CLASSES_SHEET_TAB || '운영시트';
    let read = await readTab(sheetId, tab);
    if (read.missing) read = await readTab(sheetId, 'Sheet1');
    if (!read.ok) return Response.json({ ok: false, error: read.error });
    if (read.missing) return Response.json({ ok: false, error: `운영시트 탭 이름을 찾지 못했습니다. 환경변수 CLASSES_SHEET_TAB에 탭 이름을 넣어주세요.` });

    const results = [];
    for (const name of 반이름들) {
      const row = read.rows.find((r) => sameName(r['반이름'], name));
      if (!row) { results.push({ 반이름: name, ok: false, error: '반 없음' }); continue; }
      const existing = parseCancellations(row['휴강기록']).map(formatDate);
      const merged = [...new Set([...existing, ...날짜들])].sort();
      const res = await updateCell(sheetId, tab, row._row, '휴강기록', merged.join(', '));
      results.push({ 반이름: name, ok: res.ok, error: res.error, 휴강기록: merged.join(', ') });
    }
    return Response.json({ ok: results.every((r) => r.ok), results });
  } catch (err) {
    return Response.json({ ok: false, error: err.message });
  }
}
