// 공통 유틸리티

/**
 * 이름 비교용 표준화
 * 대소문자, 띄어쓰기 차이를 무시하고 비교할 수 있게 만든다.
 *
 * "Easy Link 4"  -> "easylink4"
 * "easy link4"   -> "easylink4"
 * "EasyLink  4 " -> "easylink4"
 */
export function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

/**
 * 두 이름이 (대소문자/띄어쓰기 무시하고) 같은지
 */
export function sameName(a, b) {
  return normalize(a) === normalize(b) && normalize(a) !== '';
}

/**
 * 구멍 태그를 화면에 보여줄 때 띄어쓰기 넣기
 * 원본 데이터(문제은행)는 붙여쓴 형태를 유지하고, 표시할 때만 변환한다.
 */
const GAP_LABELS = {
  어휘부족: '어휘 부족',
  문맥추론부족: '문맥 추론 부족',
  주제요지파악부족: '주제·요지 파악 부족',
  세부사항파악부족: '세부사항 파악 부족',
  지시어이해부족: '지시어 이해 부족',
  원인결과추론부족: '원인·결과 추론 부족',
  문장구조이해부족: '문장 구조 이해 부족',
  순서구조파악부족: '순서·구조 파악 부족',
  어조의도파악부족: '어조·의도 파악 부족',
  읽기속도부족: '읽기 속도 부족',
  단어뜻모름: '단어 뜻을 모름',
  유사단어혼동: '비슷한 단어 혼동',
  품사형태변형부족: '품사·형태 변형 이해 부족',
  형태변화규칙미숙지: '형태 변화 규칙 미숙지',
  시제구분부족: '시제 구분 부족',
  오류찾기부족: '오류 찾기 능력 부족',
  규칙적용부족: '규칙 적용 부족',
};

export function formatGap(tag) {
  const clean = String(tag || '').trim();
  if (!clean) return '';
  if (GAP_LABELS[clean]) return GAP_LABELS[clean];

  // 목록에 없으면 공백 제거한 형태로도 한 번 찾아본다
  const key = Object.keys(GAP_LABELS).find((k) => normalize(k) === normalize(clean));
  return key ? GAP_LABELS[key] : clean;
}

export function formatGaps(tags) {
  const list = Array.isArray(tags)
    ? tags
    : String(tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  return list.map(formatGap);
}

/**
 * 한국 시간 기준 현재 시각 문자열
 */
export function koreaTimeString() {
  const now = new Date();
  const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${kst.getFullYear()}-${p(kst.getMonth() + 1)}-${p(kst.getDate())} ${p(kst.getHours())}:${p(kst.getMinutes())}`;
}

/**
 * 시트 셀에 여러 줄로 들어온 값을 배열로 분리
 * 줄바꿈, 쉼표 둘 다 지원
 */
export function splitMulti(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * 반 헤더용 요일·시간 표기 — "월수금 18:00" (요일 붙여쓰기, 시작 시각만)
 * 수업요일 "월, 수, 금" / "월수금" / "월·수·금" 모두 → "월수금"
 * 수업시간 "18:00~18:50" / "18:00" → "18:00"
 */
export function formatSchedule(weekdays, time) {
  const days = String(weekdays || '').replace(/[^월화수목금토일]/g, '');
  const m = String(time || '').match(/\d{1,2}:\d{2}/);
  const t = m ? m[0] : '';
  return [days, t].filter(Boolean).join(' ');
}

/**
 * 문제은행 행 키 정규화 — 시트 헤더에 괄호 설명이 붙어 있어도 코드 키로 읽히게.
 * "게이트단계(1-5)" → "게이트단계", "문장(빈칸포함)" → "문장", "난이도 (1-12)" → "난이도"
 * 원래 키도 그대로 남긴다(다른 코드 영향 없음). 정규화된 키가 이미 있으면 덮어쓰지 않는다.
 */
export function normalizeQuestionRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const [k, v] of Object.entries(row)) {
    const nk = String(k).replace(/\s*[(（][^)）]*[)）]\s*/g, '').replace(/\s+/g, '').trim();
    if (nk && nk !== k && !(nk in out)) out[nk] = v;
  }
  return out;
}
