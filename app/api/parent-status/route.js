// 18번 학부모 페이지 데이터
// 이름+학부모 전화번호(숫자만 비교)로 학생명단 대조 → 그 학생의 대시보드 기록만 반환
// 태도·특이사항은 절대 내보내지 않는다 (확정 원칙)
import { loadStudents, dashboardSheetId } from '../../../lib/dashboardData';
import { readTab } from '../../../lib/sheetsWrite';
import { DASHBOARD_TAB } from '../../../lib/dashboard';
import { sameName, splitMulti } from '../../../lib/utils';
import { IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

const digitsOnly = (s) => String(s || '').replace(/[^0-9]/g, '');

// 학부모에게 공개하는 칸만 (출석·숙제·테스트·단어점수 — Julia 확정, 지각 그대로 표시)
const PUBLIC_FIELDS = ['날짜', '회차', '반이름', '출석', '숙제', '재시결과', '단어점수'];

const DEMO_RECORDS = [
  { 날짜: '2026-09-14', 회차: '4', 반이름: 'Easy Link 5-A반', 이름: '김민준', 출석: '출석', 숙제: 'O', 재시결과: '통과', 단어점수: '95' },
  { 날짜: '2026-09-16', 회차: '5', 반이름: 'Easy Link 5-A반', 이름: '김민준', 출석: '지각', 숙제: '늦음', 재시결과: '재시통과', 단어점수: '92' },
  { 날짜: '2026-09-18', 회차: '6', 반이름: 'Easy Link 5-A반', 이름: '김민준', 출석: '출석', 숙제: 'O', 재시결과: '통과', 단어점수: '100' },
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get('name') || '').trim();
  const phone = digitsOnly(searchParams.get('phone') || '');

  if (!name || !phone) return Response.json({ error: '이름과 전화번호가 필요합니다.' });

  const students = await loadStudents();
  const mine = students.filter((s) =>
    sameName(s['이름'], name) &&
    digitsOnly(s['학부모 연락처'] || s['전화번호'] || '') === phone
  );
  if (mine.length === 0) {
    return Response.json({ error: '명단에서 찾지 못했어요. 등록하실 때 적어주신 이름과 전화번호 그대로 입력해주세요.' });
  }
  const myClasses = [...new Set(mine.flatMap((s) => splitMulti(s['반이름'])))];

  let records = [];
  const sheetId = dashboardSheetId();
  if (IS_DEMO || !sheetId) {
    records = DEMO_RECORDS.filter((r) => sameName(r['이름'], name) || true);
  } else {
    const r = await readTab(sheetId, DASHBOARD_TAB);
    if (r.ok) {
      records = (r.rows || []).filter((row) =>
        sameName(row['이름'], name) &&
        myClasses.some((c) => sameName(row['반이름'], c))
      );
    }
  }

  // 공개 칸만 추려서 내보냄 (태도·특이사항 차단)
  const safe = records.map((row) => {
    const out = {};
    for (const f of PUBLIC_FIELDS) out[f] = row[f] || '';
    return out;
  });

  return Response.json({ ok: true, 학생이름: name, 반들: myClasses, records: safe });
}
