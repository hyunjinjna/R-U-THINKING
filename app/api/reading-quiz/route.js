// 사이트 리딩 숙제 — 문항 조회 + 풀이 기록
// 문제는 통합 대시보드 시트 "리딩문제" 탭 (교재|유닛|문항ID|지문|질문|보기1~4|정답번호|해설|보기1구멍~보기4구멍)
// 기록은 "리딩기록" 탭 (시각|이름|반이름|회차|교재|유닛|문항ID|첫시도|힌트사용)
import { readTab, appendRows } from '../../../lib/sheetsWrite';
import { dashboardSheetId } from '../../../lib/dashboardData';
import { sameName, normalize } from '../../../lib/utils';
import { koreaTimeString } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

const Q_TAB = '리딩문제';
const R_TAB = '리딩기록';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const book = searchParams.get('book') || '';
  const unit = parseInt(searchParams.get('unit') || '', 10);
  const name = searchParams.get('name') || '';
  const id = dashboardSheetId();
  if (!id) return Response.json({ error: '대시보드 시트가 설정되지 않았습니다.' });
  if (!book || isNaN(unit)) return Response.json({ error: '교재와 유닛이 필요합니다.' });

  const [q, r] = await Promise.all([
    readTab(id, Q_TAB).catch(() => ({ rows: [] })),
    readTab(id, R_TAB).catch(() => ({ rows: [] })),
  ]);
  const questions = (q.rows || [])
    .filter((row) => normalize(row['교재']) === normalize(book) && parseInt(row['유닛'], 10) === unit)
    .map((row) => ({
      문항ID: row['문항ID'] || '',
      지문: row['지문'] || '',
      질문: row['질문'] || '',
      보기: [row['보기1'], row['보기2'], row['보기3'], row['보기4']].map((v) => String(v || '')),
      정답번호: parseInt(row['정답번호'], 10) || 0,
      해설: row['해설'] || '',
    }))
    .filter((x) => x.문항ID && x.지문 && x.정답번호 >= 1);
  const doneIds = (r.rows || [])
    .filter((row) => sameName(row['이름'], name) && normalize(row['교재']) === normalize(book) && parseInt(row['유닛'], 10) === unit)
    .map((row) => String(row['문항ID'] || '').trim());
  return Response.json({ questions, doneIds: [...new Set(doneIds)] });
}

export async function POST(request) {
  const body = await request.json();
  const id = dashboardSheetId();
  if (!id) return Response.json({ error: '대시보드 시트가 설정되지 않았습니다.' });
  const { name, 반이름, 회차, book, unit, 문항ID, 첫시도, 힌트사용 } = body || {};
  if (!name || !문항ID) return Response.json({ error: '기록 정보가 부족합니다.' });
  try {
    await appendRows(id, R_TAB, [[
      koreaTimeString(), name, 반이름 || '', 회차 || '', book || '', unit || '', 문항ID,
      첫시도 === 'O' ? 'O' : 'X', 힌트사용 ? 'O' : '',
    ]]);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: '기록 저장 실패: ' + e.message + ' — 대시보드 시트에 "리딩기록" 탭이 있는지 확인해주세요.' });
  }
}
