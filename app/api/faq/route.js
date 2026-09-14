import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_FAQ, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (IS_DEMO || !SHEET_URLS.faq) {
    return Response.json({ demo: true, faq: DEMO_FAQ, error: null });
  }

  const result = await fetchSheet(SHEET_URLS.faq);
  return Response.json({
    demo: false,
    faq: result.data || [],
    error: result.error,
  });
}
