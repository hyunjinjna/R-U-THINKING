import { lexileToLevel, VOCA_LEVEL_MAP, grammarStageToLevel, isValidPhone } from '../../../lib/adaptive';

export const dynamic = 'force-dynamic';

const SYSTEM = `너는 R U Thinking? 영어 학원의 레벨테스트 진단 리포트 작성 비서야.

## 톤
직설적이고 단정적인 진단서 톤. 부드럽게 돌려 말하지 않는다.

## 경험 언급 — 매번 다른 표현을 쓸 것 (중요)
원장의 대치동 경험을 언급할 때, 아래처럼 문장 틀과 빈도 표현을 매번 다르게 조합해서 써라.
같은 문장을 반복하면 안 된다.

문장 틀 예시 (이 중 하나를 고르거나, 비슷한 느낌으로 새로 만들어도 됨):
- "대치동에서 200명 넘는 학생을 가르치며 ~"
- "대치동에서 200명 이상을 지도해오면서 ~"
- "200명 넘는 학생을 대치동에서 만나본 경험으로는 ~"
- "대치동 현장에서 200명 넘게 봐오며 ~"
- "200명이 넘는 아이들을 가르쳐본 입장에서 ~"

빈도·강조 표현 예시 (역시 매번 다르게):
자주 / 많이 / 여러 번 / 종종 / 흔히 / 반복적으로 / 적잖이

이 둘을 조합하되, 매번 새롭게 구성해라.

## 절대 규칙
- 구체적 통계(%, 몇 명 중 몇 명)를 지어내지 마. 일반적 표현만 사용.
- 데이터에 없는 내용을 지어내지 마.
- 이 학생의 실제 오답 패턴(구멍 태그)에만 근거해서 진단해라.

## 출력 형식 (반드시 지킬 것)
- 마크다운 기호(#, *, -, ---)를 절대 쓰지 마. 카카오톡에 붙여넣을 텍스트다.
- 섹션 구분은 빈 줄로만 한다.
- 레벨 수치(렉사일 숫자, CEFR 등급, 단계 숫자)는 본문에 쓰지 마. 추천 반 이름만 언급해라.

## 구조
1) 종합 한 줄 요약 (직설적으로)
2) 빈 줄
3) 전문가 코멘트 (2~4문장, 대치동 경험 언급 — 위 규칙대로 매번 다르게)

영역별 상세 결과는 시스템이 따로 표시하므로 리포트 본문에 반복하지 마라.
리포트 본문만 출력하고 다른 설명은 붙이지 마.`;

function summarizeGrammarStage(stage) {
  const g = grammarStageToLevel(stage);
  return g ? `${g.label} ${g.권}권` : `${stage}단계`;
}

export async function POST(request) {
  const { phone, results } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!isValidPhone(phone)) {
    return Response.json({ error: '전화번호를 정확히 입력해주세요. (010으로 시작하는 11자리)' });
  }

  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' });
  }

  if (!results || Object.values(results).every((v) => !v)) {
    return Response.json({ error: '채점할 시험 결과가 없습니다.' });
  }

  const sections = [];

  // 파닉스: 게이트 통과하면 섹션에서 제외, 미통과일 때만 표시
  if (results.phonics && !results.phonics.passed) {
    sections.push({
      영역: '파닉스',
      구멍: [],
      추천반: '파닉스 기초반부터 시작',
      비고: '파닉스 기초가 먼저 필요해서 다른 영역 진단은 진행하지 않았습니다.',
    });
  }

  if (results.reading) {
    const levelInfo = lexileToLevel(results.reading.lexile);
    sections.push({
      영역: '리딩',
      구멍: results.reading.gaps || [],
      추천반: levelInfo ? levelInfo.label : '상담 후 안내',
    });
  }

  if (results.voca) {
    const bookInfo = VOCA_LEVEL_MAP[results.voca.stage];
    sections.push({
      영역: '단어',
      구멍: results.voca.gaps || [],
      추천반: bookInfo || '상담 후 안내',
    });
  }

  if (results.grammar) {
    sections.push({
      영역: '문법',
      구멍: results.grammar.gaps || [],
      추천반: summarizeGrammarStage(results.grammar.stage),
    });
  }

  const dataText = sections
    .map((s) => {
      const gapText = s.구멍.length > 0 ? `발견된 구멍: ${s.구멍.join(', ')}` : '발견된 구멍: 없음';
      return `[${s.영역}] ${gapText} / 추천 반: ${s.추천반}`;
    })
    .join('\n');

  const prompt = `학생의 레벨테스트 결과:

${dataText}

위 데이터를 바탕으로 종합 요약과 전문가 코멘트를 작성해줘.
(영역별 상세는 시스템이 따로 표시하니 본문에서 반복하지 마)`;

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
        temperature: 1,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const json = await res.json();

    if (json.error) {
      return Response.json({ error: json.error.message });
    }

    let text = (json.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    // 혹시 남아있을 마크다운 기호 제거
    text = text
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      .replace(/^---+$/gm, '')
      .trim();

    // 카톡 발송용 전체 텍스트
    const sectionText = sections
      .map((s) => {
        const lines = [`[${s.영역}]`];
        if (s.구멍.length > 0) lines.push(`- 발견된 구멍: ${s.구멍.join(', ')}`);
        lines.push(`- 추천 반: ${s.추천반}`);
        if (s.비고) lines.push(`- ${s.비고}`);
        return lines.join('\n');
      })
      .join('\n\n');

    const fullText = `${text}\n\n${sectionText}`;

    return Response.json({
      report: text,
      sections,
      fullText,
      phone,
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: '요청 실패: ' + err.message });
  }
}
