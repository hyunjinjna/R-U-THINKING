import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

const DEMO_RESULTS = [
  {
    전화번호: '010-1234-5678',
    제출일시: '2026-09-17 14:32',
    리포트: `읽기는 또래보다 앞서 있지만, 어휘력이 그 속도를 못 따라가고 있습니다.

대치동에서 200명 넘는 학생을 가르치며 여러 번 보았던 패턴입니다. 리딩 레벨은 올라갔는데 단어를 문장 속에서 만나는 연습이 부족했던 경우죠. 지금 방향을 잡지 않으면 지문이 길어질수록 격차가 벌어집니다.

[리딩]
- 발견된 구멍: 지시어 이해 부족, 원인결과 추론 부족
- 추천 반: Subject Link 1~3 / Insight Link 1~3 (교차)

[단어]
- 발견된 구멍: 문맥추론 부족
- 추천 반: 4000 Essential - Book 2

[문법]
- 발견된 구멍: 시제 구분 부족
- 추천 반: My Next Grammar 1권`,
  },
];

export async function GET() {
  if (IS_DEMO || !SHEET_URLS.leveltestResults) {
    return Response.json({ demo: true, results: DEMO_RESULTS, error: null });
  }

  const result = await fetchSheet(SHEET_URLS.leveltestResults);
  const rows = result.data || [];
  // 최신순
  rows.reverse();

  return Response.json({
    demo: false,
    results: rows,
    error: result.error,
  });
}
