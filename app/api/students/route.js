import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_STUDENTS, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (IS_DEMO || !SHEET_URLS.students) {
    return Response.json({ demo: true, students: DEMO_STUDENTS, error: null });
  }

  const result = await fetchSheet(SHEET_URLS.students);
  return Response.json({
    demo: false,
    students: result.data || [],
    error: result.error,
  });
}
