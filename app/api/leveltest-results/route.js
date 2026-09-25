import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, IS_DEMO, DEMO_STUDENTS } from '../../../lib/config';

export const dynamic = 'force-dynamic';

const DEMO_RESULTS = [
  {
    전화번호: '010-1234-5678',
    제출일시: '2026-09-17 14:32',
    파닉스결과: '',
    리딩추천반: 'Subject Link 1~3 / Insight Link 1~3 (교차)',
    리딩구멍: '지시어 이해 부족, 원인·결과 추론 부족',
    단어추천반: '4000 Essential - Book 2',
    단어구멍: '문맥 추론 부족',
    문법추천반: 'My Next Grammar 1권',
    문법구멍: '시제 구분 부족',
    발송여부: '',
    리포트전문: `읽기는 또래보다 앞서 있지만, 어휘력이 그 속도를 못 따라가고 있습니다.

대치동에서 200명 넘는 학생을 가르치며 여러 번 보았던 패턴입니다. 리딩 레벨은 올라갔는데 단어를 문장 속에서 만나는 연습이 부족했던 경우죠. 지금 방향을 잡지 않으면 지문이 길어질수록 격차가 벌어집니다.

[리딩]
- 발견된 구멍: 지시어 이해 부족, 원인·결과 추론 부족
- 추천 반: Subject Link 1~3 / Insight Link 1~3 (교차)`,
  },
];

// 전화번호에서 숫자만 남겨서 비교 (010-1234-5678 == 01012345678)
function phoneKey(p) {
  return String(p || '').replace(/[^0-9]/g, '');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const includeSent = searchParams.get('includeSent') === 'true';

  let rows = [];
  let error = null;
  let demo = false;

  if (IS_DEMO || !SHEET_URLS.leveltestResults) {
    rows = DEMO_RESULTS;
    demo = true;
  } else {
    const result = await fetchSheet(SHEET_URLS.leveltestResults);
    rows = result.data || [];
    error = result.error;
  }

  // 최신순
  rows = [...rows].reverse();

  // 학부모용 — 전화번호로 조회 (발송여부 상관없이 본인 것 보여줌)
  if (phone) {
    const key = phoneKey(phone);
    const found = rows.filter((r) => phoneKey(r['전화번호']) === key);
    return Response.json({ demo, results: found, error });
  }

  // 코치용 — 기본은 발송완료된 건 제외. includeSent=true면 전부(처리완료 목록용)
  if (!includeSent) {
    rows = rows.filter((r) => !String(r['발송여부'] || '').trim());
  }

  // 등록 여부 자동 대조 (2026-09-25): 학생명단의 학부모 번호와 같으면 등록한 것으로 본다.
  // 손 체크(시트 '등록 여부' 열)는 자동보다 우선. 자동 결과는 시트에 저장하지 않고 매번 계산.
  let students = [];
  if (demo) students = DEMO_STUDENTS;
  else if (SHEET_URLS.students) students = (await fetchSheet(SHEET_URLS.students)).data || [];
  const classByPhone = new Map();
  for (const st of students) {
    const k = phoneKey(st['학부모 연락처'] || st['학부모연락처']);
    if (!k) continue;
    const cls = String(st['반이름'] || '').trim();
    classByPhone.set(k, [...(classByPhone.get(k) || []), cls].filter(Boolean));
  }
  rows = rows.map((r) => {
    const manualKey = Object.keys(r).find((h) => h.replace(/\s/g, '') === '등록여부');
    const manual = manualKey ? String(r[manualKey] || '').trim() : '';
    const auto = classByPhone.get(phoneKey(r['전화번호'])) || [];
    const enrolled = manual ? manual === '등록' : auto.length > 0;
    return { ...r, 등록여부수동: manual, 등록반자동: [...new Set(auto)].join(', '), 등록됨: enrolled };
  });

  return Response.json({ demo, results: rows, error });
}

/** POST { phone, 제출일시, value, field? } → 결과 시트의 발송여부(기본) 또는 '등록 여부' 칸 기록 */
export async function POST(request) {
  const { extractSheetId, readTab, updateCell } = await import('../../../lib/sheetsWrite');
  try {
    const { phone, 제출일시, value, field } = await request.json();
    const sheetId = extractSheetId(process.env.NEXT_PUBLIC_LEVELTEST_SHEET_LINK || '');
    if (!sheetId) return Response.json({ ok: false, error: 'NEXT_PUBLIC_LEVELTEST_SHEET_LINK가 설정되지 않았습니다.' });
    const tab = process.env.LEVELTEST_SHEET_TAB || '결과';
    const read = await readTab(sheetId, tab);
    if (!read.ok) return Response.json({ ok: false, error: read.error });
    // 헤더 띄어쓰기 차이("등록 여부"/"등록여부") 흡수 — 없으면 '등록 여부'로 새로 만든다
    const headers = read.headers || [];
    const column = field === '등록여부'
      ? (headers.find((h) => String(h || '').replace(/\s/g, '') === '등록여부') || '등록 여부')
      : '발송여부';
    const key = phoneKey(phone);
    const row = read.rows.find((r) => phoneKey(r['전화번호']) === key && (!제출일시 || r['제출일시'] === 제출일시));
    if (!row) return Response.json({ ok: false, error: '결과 시트에서 해당 행을 찾지 못했습니다.' });
    const res = await updateCell(sheetId, tab, row._row, column, value ?? '완료');
    return Response.json(res);
  } catch (err) {
    return Response.json({ ok: false, error: err.message });
  }
}
