import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_SLOTS, DEMO_WAITLIST, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

const WAITLIST_THRESHOLD = 6;

function slotKey(row) {
  return [
    (row['레벨'] || '').trim(),
    (row['수업요일'] || '').trim(),
    (row['수업시간'] || '').trim(),
  ].join('|');
}

export async function GET() {
  // 슬롯 목록
  let slots = [];
  let slotError = null;

  if (IS_DEMO || !SHEET_URLS.slots) {
    slots = DEMO_SLOTS;
  } else {
    const r = await fetchSheet(SHEET_URLS.slots);
    slots = r.data || [];
    slotError = r.error;
  }

  // 대기 신청 목록
  let waitlist = [];
  if (IS_DEMO || !SHEET_URLS.waitlist) {
    waitlist = DEMO_WAITLIST;
  } else {
    const r = await fetchSheet(SHEET_URLS.waitlist);
    waitlist = r.data || [];
  }

  // 처리되지 않은 대기만 슬롯별로 카운트
  const counts = {};
  for (const w of waitlist) {
    const done = (w['처리여부'] || '').trim();
    if (done) continue; // 처리완료된 건 제외
    const key = slotKey(w);
    counts[key] = (counts[key] || 0) + 1;
  }

  const enriched = slots.map((s) => {
    const key = slotKey(s);
    const waiting = counts[key] || 0;
    const status = (s['상태'] || '마감').trim();
    return {
      ...s,
      상태: status,
      대기인원: waiting,
      정원도달: waiting >= WAITLIST_THRESHOLD,
      threshold: WAITLIST_THRESHOLD,
    };
  });

  return Response.json({
    demo: IS_DEMO || !SHEET_URLS.slots,
    slots: enriched,
    error: slotError,
  });
}
