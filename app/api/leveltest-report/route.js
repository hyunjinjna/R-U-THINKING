import { lexileToLevel, VOCA_LEVEL_MAP, grammarStageToLevel } from '../../../lib/adaptive';

export const dynamic = 'force-dynamic';

const SYSTEM = `너는 R U Thinking? 영어 학원의 레벨테스트 진단 리포트 작성 비서야.

## 톤 & 스타일
- 직설적이고 단정적인, 진단서 같은 톤. 부드럽게 돌려 말하지 않음.
- "많은 학생들이", "흔히 보이는" 같은 일반적 표현은 써도 되지만,
  "80%", "몇 명 중 몇 명" 같은 구체적 통계는 절대 지어내지 마.
- 대치동에서 200명 넘게 가르친 경험을 자연스럽게 한 번 이상 녹여서 신뢰감을 줘.

## 구조 (반드시 이 순서로)
1. 종합 한줄 요약 (직설적으로 핵심만)
2. 전문가 코멘트 (2~4문장, 대치동 경험 언급)
3. 영역별 결과 (파닉스/리딩/단어/문법 중 이번에 진행된 것만) — 각각:
   - 확정된 레벨/수치
   - 발견된 구멍 (있으면)
   - 추천 반

## 절대 규칙
- 데이터에 없는 내용을 지어내지 마
- 구체적 통계(%, 인원수)를 지어내지 마 — 일반적 표현만 사용
- 이 학생의 실제 오답 패턴(구멍 태그)에 근거해서만 진단 작성
- 리포트 본문만 출력해. 다른 설명 붙이지 마.`;

function summarizeGrammarStage(stage) {
  const g = grammarStageToLevel(stage);
  return g ? `${g.label} ${g.권}권` : `${stage}단계`;
}

export async function POST(request) {
  const { phone, results } = await request.json();
  // results 예상 형태:
  // {
  //   phonics: { passed, level } | null,
  //   reading: { lexile, gaps: [] } | null,
  //   voca: { stage, gaps: [] } | null,
  //   grammar: { stage, gaps: [] } | null,
  // }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' });
  }

  if (!phone || !phone.trim()) {
    return Response.json({ error: '전화번호를 입력해주세요.' });
  }

  if (!results || Object.values(results).every((v) => !v)) {
    return Response.json({ error: '채점할 시험 결과가 없습니다.' });
  }

  // 각 영역 결과를 실제 반 이름으로 변환
  const sections = [];

  if (results.phonics) {
    if (!results.phonics.passed) {
      sections.push({
        영역: '파닉스',
        결과: '파닉스 기초 단계 (게이트 미통과)',
        구멍: [],
        추천반: '파닉스 기초반 — 다른 영역 시험은 생략됨',
      });
    } else {
      sections.push({
        영역: '파닉스',
        결과: `게이트 통과, EFL Phonics ${results.phonics.level}권 수준`,
        구멍: [],
        추천반: `파닉스 ${results.phonics.level}`,
      });
    }
  }

  if (results.reading) {
    const levelInfo = lexileToLevel(results.reading.lexile);
    sections.push({
      영역: '리딩',
      결과: `렉사일 ${results.reading.lexile}L`,
      구멍: results.reading.gaps || [],
      추천반: levelInfo ? levelInfo.label : '해당 구간 교재 준비 중 (상담 필요)',
    });
  }

  if (results.voca) {
    const bookInfo = VOCA_LEVEL_MAP[results.voca.stage];
    sections.push({
      영역: '단어',
      결과: `CEFR ${results.voca.stage}`,
      구멍: results.voca.gaps || [],
      추천반: bookInfo || '해당 구간 교재 준비 중 (상담 필요)',
    });
  }

  if (results.grammar) {
    sections.push({
      영역: '문법',
      결과: `${results.grammar.stage}단계 (${summarizeGrammarStage(results.grammar.stage)})`,
      구멍: results.grammar.gaps || [],
      추천반: summarizeGrammarStage(results.grammar.stage),
    });
  }

  const dataText = sections
    .map((s) => {
      const gapText = s.구멍.length > 0 ? `발견된 구멍: ${s.구멍.join(', ')}` : '발견된 구멍: 없음';
      return `[${s.영역}]\n결과: ${s.결과}\n${gapText}\n추천 반: ${s.추천반}`;
    })
    .join('\n\n');

  const prompt = `학생의 레벨테스트 결과 데이터:\n\n${dataText}\n\n위 데이터를 바탕으로 리포트를 작성해줘.`;

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
        max_tokens: 1500,
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
      report: text,
      sections,
      phone,
    });
  } catch (err) {
    return Response.json({ error: '요청 실패: ' + err.message });
  }
}
