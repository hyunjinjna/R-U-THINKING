import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_ENROLLMENTS, IS_DEMO } from '../../../lib/config';
import { appendRow, extractSheetId } from '../../../lib/sheetsWrite';
import { splitMulti, normalize, koreaTimeString } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  let rows = [];
  let error = null;
  let demo = false;

  if (IS_DEMO || !SHEET_URLS.enrollments) {
    rows = DEMO_ENROLLMENTS;
    demo = true;
  } else {
    const result = await fetchSheet(SHEET_URLS.enrollments);
    rows = result.data || [];
    error = result.error;
  }

  // 처리완료된 건 제외, 최신순
  const pending = [...rows]
    .filter((r) => !String(r['처리여부'] || '').trim())
    .reverse();

  // 과목별로 쪼개서 표로 보여줄 수 있게 가공
  const enriched = pending.map((r) => {
    const 과목들 = splitMulti(r['신청 과목']);
    const 레벨들 = splitMulti(r['신청 레벨']);
    const 시간들 = splitMulti(r['희망 요일/시간대']);

    const max = Math.max(과목들.length, 레벨들.length, 시간들.length, 1);
    const items = [];
    for (let i = 0; i < max; i++) {
      items.push({
        과목: 과목들[i] || '',
        레벨: 레벨들[i] || '',
        희망시간: 시간들[i] || '',
      });
    }

    return { ...r, items };
  });

  return Response.json({ demo, enrollments: enriched, error });
}

// 처리완료 — 학생명단 + 운영시트에 자동 추가
export async function POST(request) {
  const { enrollment, assignments } = await request.json();
  // assignments: [{ 과목, 레벨, 희망시간, 배정반 }]

  if (!enrollment || !assignments || assignments.length === 0) {
    return Response.json({ error: '배정 정보가 없습니다.' });
  }

  const missing = assignments.filter((a) => !a.배정반);
  if (missing.length > 0) {
    return Response.json({ error: '모든 과목에 반을 선택해주세요.' });
  }

  const studentsSheetId = extractSheetId(process.env.NEXT_PUBLIC_STUDENTS_SHEET_LINK);
  const classesSheetId = extractSheetId(process.env.NEXT_PUBLIC_CLASSES_SHEET_LINK);
  const enrollSheetId = extractSheetId(process.env.NEXT_PUBLIC_ENROLLMENTS_SHEET_LINK);

  const results = [];

  // 학생명단에 추가 (반마다 한 줄)
  for (const a of assignments) {
    const row = [
      enrollment['학생 이름'] || '',
      a.배정반,
      enrollment['학부모 연락처'] || '',
      enrollment['학생 학년'] || '',
      koreaTimeString(),
    ];
    const r = await appendRow(studentsSheetId, '학생명단', row);
    results.push({ 대상: `학생명단 (${a.배정반})`, ok: r.ok, error: r.error });
  }

  return Response.json({
    ok: results.every((r) => r.ok),
    results,
  });
}
