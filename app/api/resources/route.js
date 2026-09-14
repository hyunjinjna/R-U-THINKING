import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_RESOURCES, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (IS_DEMO || !SHEET_URLS.resources) {
    return Response.json({ demo: true, resources: DEMO_RESOURCES, error: null });
  }

  const result = await fetchSheet(SHEET_URLS.resources);
  return Response.json({
    demo: false,
    resources: result.data || [],
    error: result.error,
  });
}
