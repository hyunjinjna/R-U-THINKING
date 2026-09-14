import { fetchSheet } from '../../../lib/sheets';
import { getThisWeekRange, formatDate, parseDate } from '../../../lib/week';
import { DEMO_DASHBOARD, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

const SYSTEM = `너는 R U Thinking? 영어 학원의 학부모 주간 리포트 작성 비서야.
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
4. 다음 주 포인트 (개선이 필요하면 정중하게)
5. 마무리 인사

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

  if (IS_DEMO || !dashboardCSV) {
    dashboardRows = DEMO_DASHBOARD;
  } else {
    const result = await fetchSheet(dashboardCSV);
    if (result.error) {
      sheetError = result.error;
    }
    dashboardRows = result.data || [];
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
${dataText}
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
