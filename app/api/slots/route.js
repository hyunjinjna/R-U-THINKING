import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_SLOTS, DEMO_ENROLLMENTS, IS_DEMO } from '../../../lib/config';
import { normalize, splitMulti } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

const WAITLIST_THRESHOLD = 6;

// 슬롯 시트는 없어졌다. 운영시트 반 탭이 슬롯 역할을 겸한다:
// - 상태 = "등록가능" 인 행만 열린 것 (Julia가 직접 지정)
// - 종료여부 = "종료" 인 행은 현황판에서 제외
// - 반이름·시작일이 비어 있어도 됨 (시간대만 열어둔 빈 반 → 현황판에만 보임)

function slotKeyOf(레벨, 요일, 시간) {
  return normalize(레벨) + '|' + normalize(String(요일 || '') + String(시간 || ''));
}

export async function GET() {
  let classes = [];
  let slotError = null;

  if (IS_DEMO || !SHEET_URLS.classes) {
    classes = DEMO_SLOTS; // 데모: 반 탭 모양의 슬롯 데이터
  } else {
    const r = await fetchSheet(SHEET_URLS.classes);
    classes = r.data || [];
    slotError = r.error;
  }

  // 대기 카운트: 등록 신청 시트에서 신청 종류=대기 + 처리여부 빈 것만
  let enrollRows = [];
  if (IS_DEMO || !SHEET_URLS.enrollments) {
    enrollRows = DEMO_ENROLLMENTS;
  } else {
    const r = await fetchSheet(SHEET_URLS.enrollments);
    enrollRows = r.data || [];
  }

  const counts = {};
  for (const w of enrollRows) {
    if (String(w['처리여부'] || '').trim()) continue;
    if (String(w['신청 종류'] || '').trim() !== '대기') continue;
    // 여러 과목이면 쉼표로 나뉘어 옴 — 항목별로 카운트
    const 레벨들 = splitMulti(w['신청 레벨']);
    const 시간들 = splitMulti(w['희망 요일/시간대']);
    const max = Math.max(레벨들.length, 시간들.length, 1);
    for (let i = 0; i < max; i++) {
      const key = normalize(레벨들[i] || '') + '|' + normalize(시간들[i] || '');
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  const slots = classes
    .filter((c) => String(c['종료여부'] || '').trim() !== '종료' && String(c['상태'] || '').trim() !== '종료')
    .filter((c) => String(c['레벨'] || '').trim()) // 레벨 없는 행은 슬롯이 아님
    .map((c) => {
      const status = String(c['상태'] || '').trim() === '등록가능' ? '등록가능' : '대기필요';
      const waiting = counts[slotKeyOf(c['레벨'], c['수업요일'], c['수업시간'])] || 0;
      return {
        대분류: c['대분류'] || '',
        레벨: c['레벨'] || '',
        수업요일: c['수업요일'] || '',
        수업시간: c['수업시간'] || '',
        반이름: c['반이름'] || '',
        시작일: c['시작일'] || '',
        월수강료: String(c['월수강료'] || '').trim(), // 레테 결과 페이지 수강료 표시용 (2026-09-25)
        상태: status,
        대기인원: waiting,
        정원도달: waiting >= WAITLIST_THRESHOLD,
        threshold: WAITLIST_THRESHOLD,
      };
    });

  return Response.json({ demo: IS_DEMO || !SHEET_URLS.classes, slots, error: slotError });
}
