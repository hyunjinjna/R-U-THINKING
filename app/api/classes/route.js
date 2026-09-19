import { fetchSheet } from '../../../lib/sheets';
import { getCurrentCurriculum } from '../../../lib/week';
import { extractUnit } from '../../../lib/dashboard';
import { buildAutoHomework, testInfoFor, findSetLink } from '../../../lib/curriculum';
import { loadClasscardSets } from '../../../lib/curriculumData';
import { splitMulti } from '../../../lib/utils';
import { SHEET_URLS, DEMO_CLASSES, DEMO_CURRICULUM, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

/**
 * 반 목록 + 현재 회차 커리큘럼.
 * 22번: `숙제범위`가 비어 있으면 과목 규칙으로 자동 조립해서 채운다 (직접 입력 우선).
 */
function assemble(c, sets) {
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

  // "단어 공부" 버튼용: 세트 탭의 현재 유닛 단어세트 (클래스카드URL 열 은퇴 — 있으면 예비로만)
  if (textbook && unit) {
    const wordSet = findSetLink(sets, `${textbook} - Unit ${unit}`);
    if (wordSet) out['단어공부링크'] = wordSet;
  }
  return out;
}

export async function GET() {
  const { sets, warning } = await loadClasscardSets();

  if (IS_DEMO) {
    const enriched = DEMO_CLASSES.map((c) => {
      const rows = DEMO_CURRICULUM.filter((r) => r['레벨'] === c['레벨']);
      return assemble({ ...c, ...getCurrentCurriculum(c, rows) }, sets);
    });
    return Response.json({ demo: true, classes: enriched, error: null });
  }

  const classResult = await fetchSheet(SHEET_URLS.classes);
  if (classResult.error) {
    return Response.json({ demo: false, classes: [], error: classResult.error });
  }

  const curriculumResult = await fetchSheet(SHEET_URLS.curriculum);
  const curriculumRows = curriculumResult.data || [];

  const enriched = classResult.data.map((c) => {
    const level = (c['레벨'] || '').trim();
    const rows = curriculumRows.filter((r) => (r['레벨'] || '').trim() === level);
    return assemble({ ...c, ...getCurrentCurriculum(c, rows) }, sets);
  });

  return Response.json({
    demo: false,
    classes: enriched,
    error: curriculumResult.error || warning,
  });
}
