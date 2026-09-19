import { fetchSheet } from '../../../lib/sheets';
import { getCurrentCurriculum } from '../../../lib/week';
import { buildAutoHomework, testInfoFor, findSetLink, buildWeekendReview, unitsOfSessions } from '../../../lib/curriculum';
import { weekendReviewWindow } from '../../../lib/week';
import { extractUnit } from '../../../lib/dashboard';
import { loadClasscardSets } from '../../../lib/curriculumData';
import { splitMulti } from '../../../lib/utils';
import { SHEET_URLS, DEMO_CLASSES, DEMO_CURRICULUM, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

/**
 * 반 목록 + 현재 회차 커리큘럼.
 * 22번: `숙제범위`가 비어 있으면 과목 규칙으로 자동 조립해서 채운다 (직접 입력 우선).
 */
function assemble(c, sets, curriculumRows) {
  const textbook = splitMulti(c['교재'])[0] || '';
  const unit = extractUnit(c['진도'] || '');
  const out = { ...c };

  if (!String(c['숙제범위'] || '').trim() && c.status === '진행중') {
    const auto = buildAutoHomework({
      category: c['대분류'], textbook, unit,
      sets, notesLink: c['필기인증링크'] || '',
    });
    if (auto) {
      out['숙제범위'] = auto;
      out['숙제자동'] = true;
    }
  }

  const test = testInfoFor({ category: c['대분류'], textbook, unit, sets });
  if (test) {
    out['테스트세트'] = test.세트; out['테스트링크'] = test.링크; out['테스트안내'] = test.안내;
    out['테스트유닛'] = unit ? unit - 1 : '';
  }

  // 13번 주말 리뷰: 토요일 0시 ~ 다음 수업 전, 이번 주 완료 유닛 기준
  const wr = weekendReviewWindow(c);
  if (wr) {
    const units = unitsOfSessions(curriculumRows, wr.sessions, extractUnit);
    const items = buildWeekendReview({ category: c['대분류'], textbook, units, sets, curriculumRows });
    if (items.length > 0) { out['주말리뷰'] = items; out['주말리뷰키'] = wr.satKey; }
  }
  return out;
}

export async function GET() {
  const { sets, warning } = await loadClasscardSets();

  if (IS_DEMO) {
    const enriched = DEMO_CLASSES.map((c) => {
      const rows = DEMO_CURRICULUM.filter((r) => r['레벨'] === c['레벨']);
      return assemble({ ...c, ...getCurrentCurriculum(c, rows) }, sets, rows);
    });
    return Response.json({ demo: true, classes: enriched, error: null });
  }

  const classResult = await fetchSheet(SHEET_URLS.classes);
  if (classResult.error) {
    return Response.json({ demo: false, classes: [], error: classResult.error });
  }

  const curriculumResult = await fetchSheet(SHEET_URLS.curriculum);
  const curriculumRows = curriculumResult.data || [];

  const enriched = classResult.data.filter((c) => String(c['반이름'] || '').trim()).map((c) => {
    const level = (c['레벨'] || '').trim();
    const rows = curriculumRows.filter((r) => (r['레벨'] || '').trim() === level);
    return assemble({ ...c, ...getCurrentCurriculum(c, rows) }, sets, rows);
  });

  return Response.json({
    demo: false,
    classes: enriched,
    error: curriculumResult.error || warning,
  });
}
