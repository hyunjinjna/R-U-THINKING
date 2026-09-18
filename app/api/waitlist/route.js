import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_WAITLIST, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  let rows = [];
  let error = null;
  let demo = false;

  if (IS_DEMO || !SHEET_URLS.waitlist) {
    rows = DEMO_WAITLIST;
    demo = true;
  } else {
    const result = await fetchSheet(SHEET_URLS.waitlist);
    rows = result.data || [];
    error = result.error;
  }

  // 처리완료된 건 제외
  const pending = rows.filter((r) => !String(r['처리여부'] || '').trim());

  return Response.json({ demo, waitlist: pending, error });
}
