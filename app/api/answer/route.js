import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_FAQ, IS_DEMO } from '../../../lib/config';

export const dynamic = 'force-dynamic';

const SYSTEM = `너는 알유띵킹 어학원의 학부모 응대 도우미야.
학부모님이 보내신 질문에 대해, 코치가 카카오톡으로 보낼 답변 초안을 작성해줘.

## 톤 & 스타일
- 정중하고 따뜻한 존댓말
- 카카오톡으로 보내기 좋은 길이 (3~5문장, 너무 길지 않게)
- 학부모님이 안심할 수 있도록 신뢰감 있게
- 이모지는 쓰지 않거나 최소한으로

## 절대 규칙
- 아래 "답변 가이드"에 있는 방침을 반드시 따를 것
- 결제/환불/레벨조정처럼 원장님 확인이 필요한 사안은, 임의로 확정하지 말고 "확인 후 안내드리겠다"고 답할 것
- 학원 정책에 없는 내용을 지어내지 말 것
- 답변 본문만 출력해. 다른 설명이나 머리말을 붙이지 마.`;

export async function POST(request) {
  const { question, studentName, className, extraContext } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({
      error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. Vercel 환경변수를 확인하고 Redeploy 해주세요.',
    });
  }

  if (!question || !question.trim()) {
    return Response.json({ error: '학부모님 질문을 입력해주세요.' });
  }

  // FAQ 자료 가져오기
  let faqRows = [];
  if (IS_DEMO || !SHEET_URLS.faq) {
    faqRows = DEMO_FAQ;
  } else {
    const result = await fetchSheet(SHEET_URLS.faq);
    faqRows = result.data || [];
  }

  const faqText = faqRows
    .map((row) => {
      const type = row['질문유형'] || '';
      const example = row['예시질문'] || '';
      const guide = row['표준답변가이드'] || row['표준답변 가이드'] || '';
      return `[${type}]\n  예시 질문: ${example}\n  답변 방침: ${guide}`;
    })
    .join('\n\n');

  const prompt = `## 학원의 답변 가이드
${faqText || '(등록된 가이드 없음 - 일반적인 학원 응대 기준으로 답변)'}

---

## 학부모님 질문
${question}

${studentName ? `\n학생 이름: ${studentName}` : ''}
${className ? `반: ${className}` : ''}
${extraContext ? `\n코치가 알려준 추가 상황: ${extraContext}` : ''}

위 가이드를 참고해서 학부모님께 보낼 답변 초안을 작성해줘.`;

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
        max_tokens: 1000,
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

    return Response.json({ text });
  } catch (err) {
    return Response.json({ error: '요청 실패: ' + err.message });
  }
}
