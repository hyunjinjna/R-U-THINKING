import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, IS_DEMO } from '../../../lib/config';

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

  // 코치용 — 발송완료된 건 목록에서 제외
  if (!includeSent) {
    rows = rows.filter((r) => !String(r['발송여부'] || '').trim());
  }

  return Response.json({ demo, results: rows, error });
}
