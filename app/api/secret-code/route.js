import { appendRows } from '../../../lib/sheetsWrite';
import { koreaTimeString, normalize } from '../../../lib/utils';
import { CODE_TAB, CODE_HEADERS } from '../../../lib/dashboard';
import { dashboardSheetId, loadClassesWithCurriculum, findClass } from '../../../lib/dashboardData';

export const dynamic = 'force-dynamic';

/** 학생이 수업 중 들은 시크릿코드를 입력 → 오늘 회차 코드와 비교 → 기록 */
export async function POST(request) {
  try {
    const { 반이름, 이름, 코드 } = await request.json();
    if (!반이름 || !이름 || !코드) return Response.json({ ok: false, error: '반이름, 이름, 코드가 필요합니다.' });
    const classes = await loadClassesWithCurriculum();
    const cls = findClass(classes, 반이름);
    if (!cls) return Response.json({ ok: false, error: '반을 찾을 수 없습니다.' });
    const expected = cls['시크릿코드'] || '';
    if (!expected) return Response.json({ ok: false, error: '이번 회차에는 시크릿코드가 없어요.' });
    const correct = normalize(expected) === normalize(코드);
    const id = dashboardSheetId();
    if (id) {
      const now = koreaTimeString();
      await appendRows(id, CODE_TAB, CODE_HEADERS, [{ 시각: now, 날짜: now.slice(0, 10), 반이름, 이름, 입력코드: 코드, 정답여부: correct ? 'O' : 'X' }]);
    }
    return Response.json({ ok: true, correct });
  } catch (err) {
    return Response.json({ ok: false, error: err.message });
  }
}
