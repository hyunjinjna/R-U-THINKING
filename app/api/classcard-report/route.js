import * as XLSX from 'xlsx';
import { readTab, appendRows, upsertRows } from '../../../lib/sheetsWrite';
import { formatDate, getKoreaNow } from '../../../lib/week';
import { CLASSCARD_TAB, CLASSCARD_HEADERS, parseFullReport, mergeClassCardRecords } from '../../../lib/dashboard';
import { dashboardSheetId } from '../../../lib/dashboardData';

export const dynamic = 'force-dynamic';

/**
 * 클래스카드 "전체학생 리포트" 엑셀 업로드 → 클래스카드기록 탭에 병합 저장
 * 하루 1회, "7일 이후"로 뽑아 올리면 된다.
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return Response.json({ ok: false, error: '파일이 없습니다.' });
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    const today = formatDate(getKoreaNow());
    const parsed = parseFullReport(rows, getKoreaNow().getFullYear());
    if (parsed.error) return Response.json({ ok: false, error: parsed.error });

    const id = dashboardSheetId();
    if (!id) return Response.json({ ok: false, error: 'NEXT_PUBLIC_DASHBOARD_SHEET_LINK가 설정되지 않았습니다.', parsed: parsed.records.length });

    const existing = await readTab(id, CLASSCARD_TAB);
    if (!existing.ok) return Response.json({ ok: false, error: existing.error });
    const merged = mergeClassCardRecords(existing.rows, parsed.records, today);
    const res = await upsertRows(id, CLASSCARD_TAB, CLASSCARD_HEADERS, ['학생이름', '아이디', '클래스명', '세트명'], merged);
    const students = new Set(parsed.records.map((r) => r.학생이름));
    return Response.json({ ...res, 학생수: students.size, 세트수: parsed.records.length, 전체기록: merged.length });
  } catch (err) {
    return Response.json({ ok: false, error: err.message });
  }
}
