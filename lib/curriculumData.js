// 운영시트 "클래스카드 세트" 탭(세트이름|링크) 로더
// 운영시트는 이미 서비스 계정에 편집자로 공유되어 있어 readTab으로 읽는다.
// 탭이 없거나 키가 없으면 빈 배열 — 자동 조립이 제목만 생성하고 시스템은 계속 돈다.

import { extractSheetId, readTab } from './sheetsWrite';
import { IS_DEMO, DEMO_SETS } from './config';

export const SETS_TAB = '클래스카드 세트';

export async function loadClasscardSets() {
  if (IS_DEMO) return { sets: DEMO_SETS, warning: null };

  const sheetId = extractSheetId(process.env.NEXT_PUBLIC_CLASSES_SHEET_LINK || '');
  if (!sheetId) return { sets: [], warning: null };

  try {
    const r = await readTab(sheetId, SETS_TAB);
    if (!r.ok || r.missing) {
      return { sets: [], warning: r.missing ? `운영시트에 "${SETS_TAB}" 탭이 없습니다.` : r.error };
    }
    return { sets: r.rows || [], warning: null };
  } catch (err) {
    return { sets: [], warning: err.message };
  }
}
