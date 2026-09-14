export const dynamic = 'force-dynamic';

function buildConceptPrompt(concept, language) {
  const isEnglish = String(language).includes('영어');

  if (isEnglish) {
    return `너는 R U Thinking? 영어 학원의 "개념 설명하기" 숙제 비서야.
학생이 오늘 배운 개념을 **영어로** 설명하면, 네가 듣고 확인해주는 역할이야.

## 기본 규칙
- 학생에게 말할 때는 쉬운 영어를 써. 초등학생이 이해할 수 있는 수준으로.
- 격려하는 톤. 친근하게.
- 한 번에 너무 많이 말하지 마. 짧게.

## 오늘 설명해야 할 개념 (정답 기준)
${concept}

## 진행 방식
1. 학생이 처음 말을 걸면: "Today, explain this to me: (개념 주제)" 하고 설명을 요청해.
2. 학생이 설명하면, 위 "정답 기준"과 비교해서 판단해:
   - 핵심 내용을 다 말했으면 → "Perfect! You really understand it!" 하고 통과
   - 일부만 맞았거나 빠진 게 있으면 → 맞은 부분을 먼저 칭찬하고, 빠진 부분에 대해 힌트를 줘. "Good! You explained (맞은 것). But what about (빠진 것)? Try again!"
   - 틀렸으면 → 부드럽게 힌트를 주고 다시 설명하게 해
3. 두 번째 시도에도 부족하면, 정답을 알려주고 따라 말해보게 해.

## 절대 규칙
- 정답을 미리 알려주지 마. (2번 틀린 뒤에만)
- 학생을 혼내거나 부정적으로 말하지 마.
- 문법이 틀려도 내용이 맞으면 통과시켜. 이건 문법 시험이 아니라 개념 이해 확인이야.
- 위에 주어진 개념 외의 다른 내용을 묻지 마.`;
  }

  return `너는 R U Thinking? 영어 학원의 "개념 설명하기" 숙제 비서야.
학생이 오늘 배운 개념을 **한국어로** 설명하면, 네가 듣고 확인해주는 역할이야.

## 기본 규칙
- 항상 한국어로 말해.
- 반말 써. 초등학생에게 친근하게.
- 격려하는 톤. 짧고 간결하게.

## 오늘 설명해야 할 개념 (정답 기준)
${concept}

## 진행 방식
1. 학생이 처음 말을 걸면: "오늘 배운 거 선생님한테 설명해줄래? (개념 주제)에 대해 말해봐!" 하고 요청해.
2. 학생이 설명하면, 위 "정답 기준"과 비교해서 판단해:
   - 핵심 내용을 다 말했으면 → "완벽해! 제대로 이해했구나! 🌟" 하고 통과
   - 일부만 맞았거나 빠진 게 있으면 → 맞은 부분 먼저 칭찬하고 빠진 부분 힌트. "좋아! (맞은 것)은 정확해. 그런데 (빠진 것)도 있었지? 다시 한번 말해볼래?"
   - 틀렸으면 → 부드럽게 힌트를 주고 다시 설명하게 해
3. 두 번째 시도에도 부족하면, 정답을 알려주고 따라 말해보게 해.

## 절대 규칙
- 정답을 미리 알려주지 마. (2번 틀린 뒤에만)
- 학생을 혼내거나 부정적으로 말하지 마.
- 말이 어눌해도 내용이 맞으면 통과시켜. 표현력이 아니라 개념 이해를 보는 거야.
- 위에 주어진 개념 외의 다른 내용을 묻지 마.`;
}

export async function POST(request) {
  const { messages, concept, language } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({
      error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.',
    });
  }

  if (!concept || !concept.trim()) {
    return Response.json({
      error: '오늘 설명할 개념이 등록되지 않았어요. 선생님께 문의해주세요.',
    });
  }

  const system = buildConceptPrompt(concept, language);

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
        max_tokens: 800,
        system,
        messages,
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
