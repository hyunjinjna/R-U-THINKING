import { fetchSheet } from '../../../lib/sheets';
import { getThisWeekRange, formatDate, parseDate } from '../../../lib/week';
import { DEMO_DASHBOARD, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

const SYSTEM = `너는 알유띵킹 어학원의 학부모 주간 리포트 작성 비서야.
코치의 일일 대시보드 기록을 읽고, 학부모님께 보낼 주간 리포트를 작성해줘.

## 톤 & 스타일
- 정중하고 신뢰감 있는 존댓말
- 전문적이지만 따뜻하게
- 숫자를 나열만 하지 말고, 그 의미를 해석해서 설명
- 학부모가 1분 안에 읽을 수 있는 분량 (300자 내외)
- 카톡으로 보내기 좋게 문단을 짧게

## 구조
1. 인사 및 리포트 기간
2. 이번 주 학습 현황 (단어시험, 숙제, 수업 참여 등)
3. 잘한 점 (구체적으로, 칭찬)
4. 리딩 문제 풀이 패턴 (리딩 기록이 있을 때만): 같은 함정 유형이 2회 이상 반복되면 "이런 문제가 나오면 ~하는 식으로 고르는 경향이 보입니다"처럼 패턴을 짚고, 수업과 숙제 힌트가 그 습관을 어떻게 교정하고 있는지 한두 문장으로 설명. 다음 주에 확인할 지표(첫 시도 정답률 변화)로 마무리. 리딩 기록이 없거나 반복 패턴이 없으면 이 문단은 통째로 생략
5. 다음 주 포인트 (개선이 필요하면 정중하게)
6. 마무리 인사

## 절대 규칙
- 데이터에 없는 내용을 지어내지 마.
- 기록이 없는 항목은 언급하지 마.
- 부정적인 내용도 있는 그대로 전달하되 건설적인 톤으로.
- 리포트 본문만 출력해. 다른 설명 붙이지 마.`;

export async function POST(request) {
  const { studentName, className, dashboardCSV, extraNote } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({
      error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. Vercel 환경변수를 확인하고 Redeploy 해주세요.',
    });
  }

  // 대시보드 데이터 가져오기
  let dashboardRows = [];
  let sheetError = null;

  // 통합 대시보드 시트가 있으면 그걸 우선 (반이름으로 걸러냄), 없으면 예전 반별 CSV
  const { dashboardSheetId } = await import('../../../lib/dashboardData');
  const { readTab } = await import('../../../lib/sheetsWrite');
  const { DASHBOARD_TAB } = await import('../../../lib/dashboard');
  const { sameName } = await import('../../../lib/utils');
  const unifiedId = dashboardSheetId();

  if (IS_DEMO) {
    dashboardRows = DEMO_DASHBOARD;
  } else if (unifiedId) {
    const r = await readTab(unifiedId, DASHBOARD_TAB);
    if (!r.ok) sheetError = r.error;
    dashboardRows = (r.rows || []).filter((row) => !className || sameName(row['반이름'], className));
  } else if (dashboardCSV) {
    const result = await fetchSheet(dashboardCSV);
    if (result.error) sheetError = result.error;
    dashboardRows = result.data || [];
  } else {
    dashboardRows = DEMO_DASHBOARD;
  }

  // 이번 주 + 해당 학생 기록만 필터
  const { start, end } = getThisWeekRange();

  const studentRows = dashboardRows.filter((row) => {
    const name = (row['학생이름'] || row['이름'] || '').trim();
    if (name !== studentName.trim()) return false;

    const dateStr = row['날짜'] || '';
    const date = parseDate(dateStr);
    if (!date) return true; // 날짜가 없으면 일단 포함

    return date >= start && date <= end;
  });

  if (studentRows.length === 0) {
    return Response.json({
      error: sheetError
        ? `대시보드를 읽지 못했습니다: ${sheetError}`
        : `이번 주(${formatDate(start)} ~ ${formatDate(end)}) ${studentName} 학생의 기록이 없습니다. 대시보드에 기록이 있는지 확인해주세요.`,
    });
  }

  // 이번 주 리딩 숙제 기록 (오류 패턴 진단용) — 탭이 없거나 비면 조용히 생략
  let readingText = '';
  if (unifiedId) {
    try {
      const rr = await readTab(unifiedId, '리딩기록');
      const recs = (rr.rows || []).filter((row) => {
        if (!sameName(row['이름'], studentName)) return false;
        if (className && row['반이름'] && !sameName(row['반이름'], className)) return false;
        const d = parseDate(String(row['시각'] || '').slice(0, 10));
        return d && d >= start && d <= end;
      });
      if (recs.length > 0) {
        const total = recs.length;
        const firstTryO = recs.filter((r2) => r2['첫시도'] === 'O').length;
        const gapCount = {};
        recs.forEach((r2) => {
          const g = String(r2['오답구멍'] || '').trim();
          if (g) gapCount[g] = (gapCount[g] || 0) + 1;
        });
        const gapText = Object.entries(gapCount)
          .sort((a, b) => b[1] - a[1])
          .map(([g, c]) => `${g} ${c}회`)
          .join(', ');
        readingText = `\n## 이번 주 리딩 문제 풀이 기록 (사이트 숙제)\n- 푼 문제 ${total}개 중 첫 시도 정답 ${firstTryO}개\n${gapText ? `- 처음에 틀렸을 때 걸린 함정 유형: ${gapText}` : ''}`;
      }
    } catch (e) {}
  }

  // AI에게 보낼 데이터 정리
  const dataText = studentRows
    .map((row) => {
      const parts = Object.entries(row)
        .filter(([k, v]) => v && v.trim() !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(' / ');
      return `- ${parts}`;
    })
    .join('\n');

  const prompt = `학생 이름: ${studentName}
반: ${className}
리포트 기간: ${formatDate(start)} ~ ${formatDate(end)}

## 이번 주 수업 기록
${dataText}${readingText}
${extraNote ? `\n## 코치 추가 메모\n${extraNote}` : ''}

위 기록을 바탕으로 학부모님께 보낼 주간 리포트를 작성해줘.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const json = await res.json();

    if (json.error) {
      return Response.json({ error: json.error.message });
    }

    const text = (json.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    return Response.json({
      text,
      recordCount: studentRows.length,
      period: `${formatDate(start)} ~ ${formatDate(end)}`,
    });
  } catch (err) {
    return Response.json({ error: '요청 실패: ' + err.message });
  }
}
