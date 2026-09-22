// 사이트 리딩 숙제 — AI 유도 질문(힌트) & 해설 생성
// 힌트: 아이가 고른 오답을 보고, 정답을 직접 말하지 않으면서 스스로 다시 생각하게 하는 질문 하나
// 해설: 정답인 이유 + 아이가 골랐던 오답이 틀린 이유
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' });
  const { mode, 지문, 질문, 보기, 정답번호, 선택번호 } = await request.json();
  if (!지문 || !질문 || !Array.isArray(보기)) return Response.json({ error: '문항 정보가 부족합니다.' });

  const optionsText = 보기.map((v, i) => `${i + 1}. ${v}`).join('\n');
  const prompt = mode === 'explain'
    ? `너는 초등학생 영어 리딩 선생님이야. 아이가 아래 문제를 두 번 틀렸어. 이제 답을 알려주고 가르쳐줘야 해.

[지문]
${지문}

[질문] ${질문}
[보기]
${optionsText}
[정답] ${정답번호}번
[아이가 고른 오답] ${선택번호}번

다음 형식으로, 초등학생에게 말하듯 쉽고 따뜻한 한국어로 짧게 설명해줘 (전체 4문장 이내):
1) 정답이 ${정답번호}번인 이유 — 지문의 어떤 내용이 근거인지
2) 아이가 고른 ${선택번호}번이 왜 아닌지 — 지문을 어떻게 잘못 읽으면 그걸 고르게 되는지
마크다운 기호 없이 줄글로만. 격려 한 마디로 끝내줘.`
    : `너는 초등학생 영어 리딩 선생님이야. 아이가 아래 문제에서 오답을 골랐어. 정답이나 정답 번호를 절대 직접 말하지 말고, 아이가 지문을 다시 보며 스스로 알아차리게 만드는 "유도 질문"을 딱 하나만 해줘.

[지문]
${지문}

[질문] ${질문}
[보기]
${optionsText}
[정답] ${정답번호}번 (절대 노출 금지)
[아이가 고른 오답] ${선택번호}번

규칙:
- "몇 번째 문장을 읽어봐" 같은 위치 지시 금지. 생각을 여는 질문이어야 함
- 아이가 고른 오답이 왜 매력적으로 보였는지 짚어서, 그 착각을 스스로 발견하게 하는 질문일 것
  (예: 시간 순서 착각이면 "박수는 언제 쳤을까? 긴장한 건 그 전이야, 후야?")
- 한 문장, 초등학생 눈높이의 친근한 한국어, 물음표로 끝낼 것
- 정답 단어를 질문에 넣지 말 것`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    const text = (data.content || []).map((c) => c.text || '').join('').trim();
    if (!text) return Response.json({ error: 'AI 응답이 비었습니다.' });
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: 'AI 호출 실패: ' + e.message });
  }
}
