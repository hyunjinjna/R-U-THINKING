import { appendRow, extractSheetId, readTab } from '../../../lib/sheetsWrite';

export const dynamic = 'force-dynamic';

// ===== 자체 등록폼 제출 (2026-09-24, 구글폼 은퇴) =====
// 기존 등록 신청 시트(구글폼 응답 시트)에 같은 열 구조로 직접 기록한다.
// 열 순서는 시트마다 다를 수 있으므로, 헤더 행을 읽어 문항 이름으로 위치를 찾아 채운다.
// → 코치 화면(등록 신청 목록)은 한 줄도 안 바꿔도 그대로 동작.

function koreaTimeString() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}-${p(now.getUTCMonth() + 1)}-${p(now.getUTCDate())} ${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())}`;
}

// 헤더 이름이 조금 달라도 찾을 수 있게 키워드 매칭
// 각 항목: [포함되어야 할 키워드들, 포함되면 안 되는 키워드들]
const HEADER_RULES = {
  타임스탬프: [['타임스탬프'], []],
  타임스탬프_en: [['timestamp'], []],
  신청종류: [['신청', '종류'], []],
  학부모이름: [['학부모', '이름'], []],
  학부모연락처: [['학부모', '연락'], []],
  학생이름: [['학생', '이름'], ['영어']],
  영어이름: [['영어'], []],
  학생연락처: [['학생', '연락'], []],
  학년: [['학년'], []],
  신청과목: [['과목'], []],
  신청레벨: [['레벨'], []],
  요일시간: [['요일'], []],
  학습경력: [['경력'], []],
  집주소: [['주소'], []],
  알게된경로: [['경로'], []],
  결제방법: [['결제'], []],
  결재방법: [['결재'], []],
  이전학습방식: [['이전', '학습'], []],
  걱정되는점: [['걱정'], []],
  // 영역별 학습 기간 (2026-09-25) — 헤더에 '경력' 단어 금지(학습경력 규칙과 충돌)
  파닉스여부: [['파닉스'], []],
  리딩기간: [['리딩', '기간'], []],
  문법기간: [['문법', '기간'], []],
  단어기간: [['단어', '기간'], []],
  스피킹기간: [['스피킹', '기간'], []],
  라이팅기간: [['라이팅', '기간'], []],
};

function findCol(headers, ruleKey) {
  const [must, ban] = HEADER_RULES[ruleKey];
  return headers.findIndex((h) => {
    const s = String(h || '').toLowerCase();
    if (!s) return false;
    return must.every((k) => s.includes(k)) && !ban.some((k) => s.includes(k));
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: '요청 형식이 올바르지 않습니다.' });
  }

  // 2026-09-25 통합 신청: 등록분·대기분을 한 번에 받아 시트에는 종류별로 한 줄씩 기록.
  // 예전 형식({kind, items})도 그대로 받는다.
  const f = body.form || {};
  const parts = [];
  if (Array.isArray(body.enrollItems) && body.enrollItems.length > 0) parts.push({ kind: '등록', items: body.enrollItems });
  if (Array.isArray(body.waitItems) && body.waitItems.length > 0) parts.push({ kind: '대기', items: body.waitItems });
  if (parts.length === 0) {
    parts.push({ kind: body.kind === '대기' ? '대기' : '등록', items: Array.isArray(body.items) ? body.items : [] });
  }
  const items = parts.flatMap((p) => p.items);

  // 서버 측 최소 검증
  const parentName = String(f.parentName || '').trim();
  const parentPhone = String(f.parentPhone || '').replace(/[^0-9]/g, '');
  const studentName = String(f.studentName || '').trim();
  if (!parentName || !studentName) {
    return Response.json({ ok: false, error: '이름이 비어 있습니다.' });
  }
  if (!/^010\d{8}$/.test(parentPhone)) {
    return Response.json({ ok: false, error: '학부모 연락처 형식이 올바르지 않습니다.' });
  }
  if (items.length === 0) {
    return Response.json({ ok: false, error: '신청할 수업이 없습니다.' });
  }

  const sheetId = extractSheetId(process.env.NEXT_PUBLIC_ENROLLMENTS_SHEET_LINK || '');
  if (!sheetId) {
    return Response.json({ ok: false, error: '등록 시트가 연결되어 있지 않습니다.' });
  }

  // 탭 찾기 (기존 처리여부 기록과 같은 후보 순서)
  const candidates = [process.env.ENROLLMENTS_SHEET_TAB, '설문지 응답 시트1', 'Form Responses 1', 'Sheet1'].filter(Boolean);
  let tab = null;
  let headers = [];
  for (const name of candidates) {
    const read = await readTab(sheetId, name);
    if (read.ok && !read.missing && (read.headers || []).length > 0) {
      tab = name;
      headers = read.headers;
      break;
    }
  }
  if (!tab) {
    return Response.json({ ok: false, error: '등록 시트 탭을 찾지 못했습니다. 환경변수 ENROLLMENTS_SHEET_TAB을 확인해주세요.' });
  }

  // 필수 열 확인 — 없으면 기록 위치가 틀어질 수 있으므로 실패 처리
  const required = ['학부모이름', '학부모연락처', '학생이름'];
  for (const key of required) {
    if (findCol(headers, key) < 0) {
      return Response.json({ ok: false, error: `등록 시트에 "${key}" 열을 찾지 못했습니다.` });
    }
  }

  // 값 조립
  const phoneFmt = `${parentPhone.slice(0, 3)}-${parentPhone.slice(3, 7)}-${parentPhone.slice(7)}`;
  const studentPhoneDigits = String(f.studentPhone || '').replace(/[^0-9]/g, '');
  const studentPhoneFmt = /^01\d{9}$/.test(studentPhoneDigits)
    ? `${studentPhoneDigits.slice(0, 3)}-${studentPhoneDigits.slice(3, 7)}-${studentPhoneDigits.slice(7)}`
    : String(f.studentPhone || '').trim();

  const buildValues = (kind, items) => ({
    타임스탬프: koreaTimeString(),
    타임스탬프_en: koreaTimeString(),
    신청종류: kind,
    학부모이름: parentName,
    학부모연락처: phoneFmt,
    학생이름: studentName,
    영어이름: String(f.englishName || '').trim(),
    학생연락처: studentPhoneFmt,
    학년: String(f.grade || '').trim(),
    신청과목: items.map((i) => i.과목 || '').filter(Boolean).join(', '),
    신청레벨: items.map((i) => i.레벨 || '').filter(Boolean).join(', '),
    요일시간: items.map((i) => i.요일시간 || '').filter(Boolean).join(', '),
    학습경력: String(f.experience || '').trim(),
    집주소: String(f.address || '').trim(),
    알게된경로: String(f.channel || '').trim(),
    결제방법: kind === '등록' ? String(f.payMethod || '').trim() : '',
    결재방법: kind === '등록' ? String(f.payMethod || '').trim() : '',
    이전학습방식: (Array.isArray(f.prevMethods) ? f.prevMethods : []).join(', '),
    걱정되는점: (Array.isArray(f.concerns) ? f.concerns : []).join(', '),
    파닉스여부: String((f.areas || {}).phonics || '').trim(),
    리딩기간: String((f.areas || {}).reading || '').trim(),
    문법기간: String((f.areas || {}).grammar || '').trim(),
    단어기간: String((f.areas || {}).voca || '').trim(),
    스피킹기간: String((f.areas || {}).speaking || '').trim(),
    라이팅기간: String((f.areas || {}).writing || '').trim(),
  });

  const toRow = (values) => {
    // 헤더 길이만큼 빈 배열 만들고, 매칭되는 위치에만 채움
    const row = new Array(headers.length).fill('');
    let wrote = 0;
    for (const [key, val] of Object.entries(values)) {
      if (!val) continue;
      const idx = findCol(headers, key);
      if (idx >= 0 && !row[idx]) {
        row[idx] = val;
        wrote += 1;
      }
    }
    return { row, wrote };
  };

  // 종류별로 한 줄씩 기록. 한쪽만 실패해도 어느 쪽이 됐는지 정확히 돌려준다.
  const results = {};
  let anyFail = false;
  for (const part of parts) {
    const values = buildValues(part.kind, part.items);
    const { row, wrote } = toRow(values);
    if (wrote === 0) {
      results[part.kind] = { ok: false, error: '기록할 열을 하나도 찾지 못했습니다.' };
      anyFail = true;
      continue;
    }
    const r = await appendRow(sheetId, tab, row);
    results[part.kind] = r.ok ? { ok: true } : { ok: false, error: r.error || '시트 기록에 실패했습니다.' };
    if (!r.ok) anyFail = true;
  }

  // 새 문항 열이 시트에 없으면 그 값은 조용히 빠짐 — 코치 화면에는 영향 없음
  const sample = buildValues(parts[0].kind, parts[0].items);
  const missingNew = ['이전학습방식', '걱정되는점', '파닉스여부', '리딩기간', '문법기간', '단어기간', '스피킹기간', '라이팅기간']
    .filter((k) => sample[k] && findCol(headers, k) < 0);

  if (anyFail) {
    const failedKinds = Object.entries(results).filter(([, v]) => !v.ok).map(([k]) => k);
    const okKinds = Object.entries(results).filter(([, v]) => v.ok).map(([k]) => k);
    return Response.json({
      ok: false,
      results,
      error: okKinds.length > 0
        ? `${okKinds.join('·')} 신청은 접수됐지만 ${failedKinds.join('·')} 신청은 기록에 실패했습니다.`
        : results[failedKinds[0]].error,
    });
  }
  return Response.json({ ok: true, results, missingColumns: missingNew });
}
