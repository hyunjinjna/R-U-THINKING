import { dashboardSheetId } from '../../../lib/dashboardData';
import { readTab } from '../../../lib/sheetsWrite';
import { DASHBOARD_TAB } from '../../../lib/dashboard';
import { sameName } from '../../../lib/utils';
import { IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/student-status?이름=김민준&반들=파닉스1-A반,Easy Link 5-A반
 * 학생 홈 화면에서 "밀린 숙제"·"결석 보강" 판단에 쓸,
 * 반별 가장 최근 저장된 대시보드 기록을 돌려준다.
 * (코치가 [오늘 기록하기]로 저장한 값만 반영됨 — 자동판정 미리보기는 포함 안 함)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get('이름') || '').trim();
  const classNames = (searchParams.get('반들') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!name || classNames.length === 0) {
    return Response.json({ statuses: {} });
  }

  if (IS_DEMO) {
    return Response.json({ statuses: {} });
  }

  const sheetId = dashboardSheetId();
  if (!sheetId) {
    return Response.json({ statuses: {}, error: '대시보드 시트가 연결되어 있지 않습니다.' });
  }

  const r = await readTab(sheetId, DASHBOARD_TAB);
  if (!r.ok) {
    return Response.json({ statuses: {}, error: r.error });
  }

  const myRows = (r.rows || []).filter((row) => sameName(row['이름'], name));

  const statuses = {};
  for (const cn of classNames) {
    const rows = myRows
      .filter((row) => sameName(row['반이름'], cn) && row['날짜'])
      .sort((a, b) => String(a['날짜']).localeCompare(String(b['날짜'])));
    const latest = rows.length ? rows[rows.length - 1] : null;
    statuses[cn] = latest
      ? {
          날짜: latest['날짜'] || '',
          회차: latest['회차'] || '',
          출석: latest['출석'] || '',
          숙제: latest['숙제'] || '',
          재시결과: latest['재시결과'] || '',
        }
      : null;
  }

  return Response.json({ statuses });
}
