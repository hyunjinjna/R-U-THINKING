import { loadClassesWithCurriculum, findClass } from '../../../lib/dashboardData';
import { curriculumRowForSession } from '../../../lib/week';

export const dynamic = 'force-dynamic';

/**
 * GET /api/makeup-video?반=파닉스1-A반&회차=5
 * 결석 보강 카드용 — 그 반의 특정 회차 영상URL·진도만 돌려준다.
 * (커리큘럼 전체를 공개 API로 노출하지 않기 위해 최소 정보만)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('반') || '';
  const session = searchParams.get('회차') || '';

  if (!className || !session) {
    return Response.json({ error: '반, 회차가 필요합니다.' });
  }

  const classes = await loadClassesWithCurriculum();
  const cls = findClass(classes, className);
  if (!cls) return Response.json({ error: `"${className}" 반을 찾을 수 없습니다.` });

  const row = curriculumRowForSession(cls._curriculum || [], session);
  const videoUrl = row ? (row['영상URL'] || row['영상url'] || row['영상 url'] || '') : '';

  return Response.json({ 영상URL: videoUrl, 진도: row ? row['진도'] || '' : '' });
}
