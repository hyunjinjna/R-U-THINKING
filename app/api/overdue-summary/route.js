import { dashboardSheetId } from '../../../lib/dashboardData';
import { readTab } from '../../../lib/sheetsWrite';
import { DASHBOARD_TAB } from '../../../lib/dashboard';
import { normalize } from '../../../lib/utils';
import { IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/overdue-summary
 * 반별로 "가장 최근 저장 기록의 숙제가 X인 학생 수"를 집계한다.
 * 코치 반 관리 목록의 미완료 배지용.
 */
export async function GET() {
  if (IS_DEMO) return Response.json({ counts: {} });

  const sheetId = dashboardSheetId();
  if (!sheetId) return Response.json({ counts: {} });

  const r = await readTab(sheetId, DASHBOARD_TAB);
  if (!r.ok) return Response.json({ counts: {}, error: r.error });

  // (반이름, 이름)별 가장 최근 날짜의 기록 하나만 남긴다
  const latest = new Map(); // key -> row
  for (const row of r.rows || []) {
    const cls = String(row['반이름'] || '').trim();
    const name = String(row['이름'] || '').trim();
    const date = String(row['날짜'] || '').trim();
    if (!cls || !name || !date) continue;
    const key = normalize(cls) + '|' + normalize(name);
    const prev = latest.get(key);
    if (!prev || String(prev['날짜']).localeCompare(date) < 0) {
      latest.set(key, row);
    }
  }

  // 반이름(원본 표기)별 숙제 X 카운트 + 기록이 하나라도 있는 반 목록
  const counts = {};
  const recorded = new Set();
  for (const row of latest.values()) {
    const cls = String(row['반이름'] || '').trim();
    recorded.add(cls);
    if (String(row['숙제'] || '').trim() !== 'X') continue;
    counts[cls] = (counts[cls] || 0) + 1;
  }

  return Response.json({ counts, recorded: [...recorded] });
}
