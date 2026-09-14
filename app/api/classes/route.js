import { fetchSheet } from '../../../lib/sheets';
import { getCurrentCurriculum } from '../../../lib/week';
import { SHEET_URLS, DEMO_CLASSES, DEMO_CURRICULUM, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (IS_DEMO) {
    const enriched = DEMO_CLASSES.map((c) => {
      const rows = DEMO_CURRICULUM.filter((r) => r['레벨'] === c['레벨']);
      return { ...c, ...getCurrentCurriculum(c, rows) };
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
    return { ...c, ...getCurrentCurriculum(c, rows) };
  });

  return Response.json({
    demo: false,
    classes: enriched,
    error: curriculumResult.error,
  });
}
