import { lexileToLevel, VOCA_LEVEL_MAP, grammarStageToLevel, isValidPhone } from '../../../lib/adaptive';
import { appendRow, extractSheetId } from '../../../lib/sheetsWrite';
import { formatGaps, koreaTimeString } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

const SYSTEM = `너는 알유띵킹 어학원의 레벨테스트 진단 리포트 작성 비서야.

## 톤
직설적이고 단정적인 진단서 톤. 부드럽게 돌려 말하지 않는다.

## 경험 언급 — 매번 다른 표현을 쓸 것
원장의 대치동 경험을 언급할 때, 문장 틀과 빈도 표현을 매번 다르게 조합해서 써라.

문장 틀 예시:
- "대치동에서 200명 넘는 학생을 가르치며 ~"
- "대치동에서 200명 이상을 지도해오면서 ~"
- "200명 넘는 학생을 대치동에서 만나본 경험으로는 ~"
- "대치동 현장에서 200명 넘게 봐오며 ~"
- "200명이 넘는 아이들을 가르쳐본 입장에서 ~"

빈도·강조 표현 예시:
자주 / 많이 / 여러 번 / 종종 / 흔히 / 반복적으로 / 적잖이

## 추천 반과 구멍 연결 — 코멘트에 반드시 포함
추천 반을 단순히 나열하지 말고, 가장 중요한 구멍 1~2개를 골라 그 구멍과 추천 반을 잇는 문장을 코멘트에 반드시 넣어라.
형태: "추천 반 이름 + 그 수업에서 하는 훈련 + 그 훈련이 이 아이의 구멍을 어떻게 메우는지"
예시 (표현은 매번 바꿀 것):
- "Easy Link 4반에서는 지문을 읽고 무슨 이야기였는지 정리하는 훈련을 반복하기 때문에, ○○이의 주제 파악 구멍을 천천히 메워갈 수 있습니다."
- "이 구멍은 혼자 문제집으로는 잘 안 잡힙니다. 추천드린 반의 매 수업 어휘 확인 과정이 정확히 이 부분을 겨냥합니다."
훈련 내용은 그 교재·영역에서 당연히 참인 수준으로만 서술해라 (지문 독해 훈련, 단어 확인, 문법 문제 풀이 등). 그 반이 실제로 하는지 알 수 없는 구체적 활동(에세이 첨삭, 1:1 통화 등)은 지어내지 마.

## 절대 규칙
- 구체적 통계(%, 몇 명 중 몇 명)를 지어내지 마. 일반적 표현만 사용.
- 데이터에 없는 내용을 지어내지 마.
- 레벨 수치(렉사일 숫자, CEFR 등급, 단계 숫자)는 쓰지 마.
- 마크다운 기호(#, *, -)를 쓰지 마.

## 출력 형식 — 반드시 아래 JSON 형식으로만 답해라
{
  "summary": "종합 한 줄 요약 (직설적으로, 한 문장)",
  "comment": "전문가 코멘트 (3~5문장, 대치동 경험 언급 + 추천 반과 구멍을 잇는 문장 포함)"
}

다른 설명 없이 JSON만 출력해라.`;

function summarizeGrammarStage(stage) {
  const g = grammarStageToLevel(stage);
  return g ? `${g.label} ${g.권}권` : `${stage}단계`;
}

export async function POST(request) {
  const { phone, name, results } = await request.json();

  if (!isValidPhone(phone)) {
    return Response.json({ error: '전화번호를 정확히 입력해주세요. (010으로 시작하는 11자리)' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' });
  }

  if (!results || Object.values(results).every((v) => !v)) {
    return Response.json({ error: '채점할 시험 결과가 없습니다.' });
  }

  const sections = [];

  // 파닉스: 5단계 전부 통과한 아이만 섹션 제외, 그 외엔 시작 권수 추천 (2026-09-24 판별형)
  if (results.phonics && !results.phonics.passed) {
    const book = Math.max(1, Math.min(5, Number(results.phonics.level) || 1));
    sections.push({
      영역: '파닉스',
      구멍: [],
      추천반: `EFL Phonics ${book}권부터 시작`,
      비고: book <= 2
        ? '파닉스 기초를 먼저 다지는 게 우선이라, 리딩·단어는 가장 쉬운 단계부터 진단했고 문법 진단은 생략했습니다.'
        : (book >= 2 ? `${book - 1}권까지의 소리 규칙은 잡혀 있고, ${book}권 규칙부터 연습이 필요합니다.` : ''),
    });
  }

  if (results.reading) {
    const levelInfo = lexileToLevel(results.reading.lexile);
    sections.push({
      영역: '리딩',
      구멍: formatGaps(results.reading.gaps || []),
      추천반: levelInfo ? levelInfo.label : '상담 후 안내',
    });
  }

  if (results.voca) {
    const bookInfo = VOCA_LEVEL_MAP[results.voca.stage];
    sections.push({
      영역: '단어',
      구멍: formatGaps(results.voca.gaps || []),
      추천반: bookInfo || '상담 후 안내',
    });
  }

  if (results.grammar) {
    sections.push({
      영역: '문법',
      구멍: formatGaps(results.grammar.gaps || []),
      추천반: summarizeGrammarStage(results.grammar.stage),
    });
  }

  const dataText = sections
    .map((s) => {
      const gapText = s.구멍.length > 0 ? `발견된 구멍: ${s.구멍.join(', ')}` : '발견된 구멍: 없음';
      return `[${s.영역}] ${gapText} / 추천 반: ${s.추천반}`;
    })
    .join('\n');

  let summary = '';
  let comment = '';

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
        messages: [
          {
            role: 'user',
            content: `학생 이름: ${String(name || '').trim() || '(미입력)'}\n학생의 레벨테스트 결과:\n\n${dataText}\n\n위 데이터를 바탕으로 JSON을 작성해줘. 이름이 있으면 총평·코멘트에서 "OO 학생"으로 자연스럽게 불러줘 (매 문장 반복 금지, 처음 한두 번만).`,
          },
        ],
      }),
    });

    const json = await res.json();
    if (json.error) {
      return Response.json({ error: json.error.message });
    }

    let text = (json.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('')
      .trim();

    // JSON 파싱 (코드블록 감싸져 있어도 처리)
    text = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(text);
      summary = (parsed.summary || '').trim();
      comment = (parsed.comment || '').trim();
    } catch (e) {
      // JSON 파싱 실패 시, 전체 텍스트를 코멘트로 쓰고 요약은 기본값
      comment = text;
    }
  } catch (err) {
    return Response.json({ error: '요청 실패: ' + err.message });
  }

  // 누락 방지 — AI가 빼먹었으면 기본 문구로 채움
  if (!summary) {
    const gapCount = sections.reduce((n, s) => n + s.구멍.length, 0);
    summary =
      gapCount > 0
        ? '몇 가지 보완이 필요한 부분이 확인되었습니다.'
        : '전반적으로 안정적인 수준입니다.';
  }
  if (!comment) {
    comment = '자세한 진단 내용은 상담 시 안내드리겠습니다.';
  }

  // 영역별 텍스트
  const sectionText = sections
    .map((s) => {
      const lines = [`[${s.영역}]`];
      if (s.구멍.length > 0) lines.push(`- 발견된 구멍: ${s.구멍.join(', ')}`);
      lines.push(`- 추천 반: ${s.추천반}`);
      if (s.비고) lines.push(`- ${s.비고}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const fullText = `${summary}\n\n${comment}\n\n${sectionText}`;
  const submittedAt = koreaTimeString();

  // ===== 결과 시트에 자동 저장 =====
  const find = (name) => sections.find((s) => s.영역 === name);
  const phonicsSec = find('파닉스');
  const readingSec = find('리딩');
  const vocaSec = find('단어');
  const grammarSec = find('문법');

  const row = [
    phone,
    submittedAt,
    phonicsSec ? phonicsSec.추천반 : '',
    readingSec ? readingSec.추천반 : '',
    readingSec ? readingSec.구멍.join(', ') : '',
    vocaSec ? vocaSec.추천반 : '',
    vocaSec ? vocaSec.구멍.join(', ') : '',
    grammarSec ? grammarSec.추천반 : '',
    grammarSec ? grammarSec.구멍.join(', ') : '',
    '',
    fullText,
    String(name || '').trim(), // 12번째 열: 이름 (2026-09-24 추가)
  ];

  const sheetId = extractSheetId(process.env.NEXT_PUBLIC_LEVELTEST_SHEET_LINK);
  const saveResult = await appendRow(sheetId, '결과', row);

  return Response.json({
    summary,
    comment,
    sections,
    fullText,
    phone,
    submittedAt,
    saved: saveResult.ok,
    saveError: saveResult.ok ? null : saveResult.error,
  });
}
