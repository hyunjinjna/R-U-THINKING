import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_ENROLLMENTS, IS_DEMO } from '../../../lib/config';
import { appendRow, extractSheetId, readTab, updateCell } from '../../../lib/sheetsWrite';
import { splitMulti, normalize, sameName, koreaTimeString } from '../../../lib/utils';
import { buildClasscardAccount, buildWelcomeNotice, textbooksOfClass } from '../../../lib/notice';
import { loadClassesWithCurriculum } from '../../../lib/dashboardData';

export const dynamic = 'force-dynamic';

const digitsOnly = (s) => String(s || '').replace(/[^0-9]/g, '');

function splitItems(r) {
  const 과목들 = splitMulti(r['신청 과목']);
  const 레벨들 = splitMulti(r['신청 레벨']);
  const 시간들 = splitMulti(r['희망 요일/시간대']);
  const max = Math.max(과목들.length, 레벨들.length, 시간들.length, 1);
  const items = [];
  for (let i = 0; i < max; i++) {
    items.push({ 과목: 과목들[i] || '', 레벨: 레벨들[i] || '', 희망시간: 시간들[i] || '' });
  }
  return items;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const wantDone = searchParams.get('done') === '1';

  let rows = [];
  let error = null;
  let demo = false;

  if (IS_DEMO || !SHEET_URLS.enrollments) {
    rows = DEMO_ENROLLMENTS;
    demo = true;
  } else {
    const result = await fetchSheet(SHEET_URLS.enrollments);
    rows = result.data || [];
    error = result.error;
  }

  const filtered = [...rows].filter((r) => {
    const done = !!String(r['처리여부'] || '').trim();
    return wantDone ? done : !done;
  });
  // 대기 목록은 오래된순(먼저 온 것부터 처리), 처리완료 목록은 최신순
  if (wantDone) filtered.reverse();

  const enriched = filtered.map((r) => ({ ...r, items: splitItems(r) }));

  return Response.json({ demo, enrollments: enriched, error });
}

/** 학생명단에서 이름+전화로 기존 클래스카드 계정 찾기 (재원생 추가 등록 시 재사용) */
function findExistingAccount(studentRows, name, phone) {
  const p = digitsOnly(phone);
  const hit = (studentRows || []).find((s) =>
    sameName(s['이름'], name) &&
    digitsOnly(s['학부모 연락처'] || s['전화번호'] || '') === p &&
    String(s['클래스카드아이디'] || '').trim()
  );
  return hit
    ? { 기존아이디: String(hit['클래스카드아이디']).trim(), 기존비번: String(hit['클래스카드비번'] || '').trim() }
    : {};
}

/** 배정된 반 이름들 → 반 정보 + 교재 링크로 안내문 조립 */
async function buildNoticeFor(name, 반이름들, 계정) {
  const classes = await loadClassesWithCurriculum();
  const tb = SHEET_URLS.textbooks ? await fetchSheet(SHEET_URLS.textbooks) : { data: [] };
  const textbookRows = tb.data || [];

  const 반들 = [];
  const missing = [];
  for (const n of 반이름들) {
    const cls = classes.find((c) => sameName(c['반이름'], n));
    if (!cls) { missing.push(n); continue; }
    반들.push({
      반이름: cls['반이름'], 대분류: cls['대분류'], 수업요일: cls['수업요일'],
      수업시간: cls['수업시간'], 시작일: cls['시작일'],
      교재목록: textbooksOfClass(cls, textbookRows),
    });
  }

  const kakao = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_LINK || '';
  const 안내문 = buildWelcomeNotice({ 학생이름: name, 반들, 계정, 카톡채널링크: kakao });
  return { 안내문, 반들, missing };
}

/** 등록 신청 시트에 처리여부 자동 기록 (탭 이름은 ENROLLMENTS_SHEET_TAB, 기본 "설문지 응답 시트1") */
async function markDone(enrollment) {
  const sheetId = extractSheetId(process.env.NEXT_PUBLIC_ENROLLMENTS_SHEET_LINK || '');
  if (!sheetId) return { ok: false, error: 'NEXT_PUBLIC_ENROLLMENTS_SHEET_LINK가 없어 처리여부를 자동 기록 못 했습니다.' };

  const candidates = [process.env.ENROLLMENTS_SHEET_TAB, '설문지 응답 시트1', 'Form Responses 1', 'Sheet1'].filter(Boolean);
  for (const tab of candidates) {
    const read = await readTab(sheetId, tab);
    if (!read.ok || read.missing) continue;
    const row = read.rows.find((r) =>
      String(r['타임스탬프'] || '') === String(enrollment['타임스탬프'] || '') &&
      sameName(r['학생 이름'], enrollment['학생 이름'])
    );
    if (!row) return { ok: false, error: '등록 시트에서 해당 신청을 찾지 못해 처리여부를 기록 못 했습니다.' };
    return await updateCell(sheetId, tab, row._row, '처리여부', '처리완료 ' + koreaTimeString());
  }
  return { ok: false, error: '등록 시트 탭을 찾지 못했습니다. 환경변수 ENROLLMENTS_SHEET_TAB에 탭 이름을 넣어주세요.' };
}

export async function POST(request) {
  const body = await request.json();

  // ===== 안내문 재열람 (처리완료 목록에서) =====
  if (body.mode === 'notice') {
    const { 이름, 전화 } = body;
    if (!이름) return Response.json({ error: '이름이 필요합니다.' });

    const studentsSheetId = extractSheetId(process.env.NEXT_PUBLIC_STUDENTS_SHEET_LINK || '');
    let studentRows = [];
    if (studentsSheetId) {
      const r = await readTab(studentsSheetId, '학생명단');
      if (r.ok && !r.missing) studentRows = r.rows;
    }
    const p = digitsOnly(전화);
    const mine = studentRows.filter((s) =>
      sameName(s['이름'], 이름) && (!p || digitsOnly(s['학부모 연락처'] || s['전화번호'] || '') === p)
    );
    if (mine.length === 0) return Response.json({ error: '학생명단에서 이 학생을 찾지 못했습니다.' });

    const 반이름들 = [...new Set(mine.flatMap((s) => splitMulti(s['반이름'])))];
    const acc = findExistingAccount(mine, 이름, 전화);
    const 계정 = { 아이디: acc.기존아이디 || '', 비번: acc.기존비번 || '' };
    const { 안내문, missing } = await buildNoticeFor(이름, 반이름들, 계정);
    return Response.json({ ok: true, 안내문, 계정, warnings: missing.map((m) => `"${m}" 반을 운영시트에서 못 찾았습니다.`) });
  }

  // ===== 처리완료 =====
  const { enrollment, assignments } = body;
  // assignments: [{ 과목, 레벨, 희망시간, 배정반 }]

  if (!enrollment || !assignments || assignments.length === 0) {
    return Response.json({ error: '배정 정보가 없습니다.' });
  }
  const missing = assignments.filter((a) => !a.배정반);
  if (missing.length > 0) {
    return Response.json({ error: '모든 과목에 반을 선택해주세요.' });
  }

  const studentsSheetId = extractSheetId(process.env.NEXT_PUBLIC_STUDENTS_SHEET_LINK);
  const results = [];
  const warnings = [];

  // 기존 계정 재사용 여부 확인 후, 없으면 규칙대로 생성
  let existingRows = [];
  if (studentsSheetId) {
    const r = await readTab(studentsSheetId, '학생명단');
    if (r.ok && !r.missing) existingRows = r.rows;
  }
  const acc = buildClasscardAccount({
    영어이름: enrollment['학생 영어이름'] || '',
    학부모연락처: enrollment['학부모 연락처'] || '',
    ...findExistingAccount(existingRows, enrollment['학생 이름'], enrollment['학부모 연락처']),
  });
  const 계정 = { 아이디: acc.아이디, 비번: acc.비번 };

  // 학생명단에 추가 (반마다 한 줄, A~G: 이름|반이름|학부모 연락처|학생 학년|등록시각|클래스카드아이디|클래스카드비번)
  for (const a of assignments) {
    const row = [
      enrollment['학생 이름'] || '',
      a.배정반,
      enrollment['학부모 연락처'] || '',
      enrollment['학생 학년'] || '',
      koreaTimeString(),
      계정.아이디,
      계정.비번,
    ];
    const r = await appendRow(studentsSheetId, '학생명단', row);
    results.push({ 대상: `학생명단 (${a.배정반})`, ok: r.ok, error: r.error });
  }

  // 등록 신청 시트에 처리여부 자동 기록
  const done = await markDone(enrollment);
  if (!done.ok && done.error) warnings.push(done.error);

  // 안내문 생성
  const 반이름들 = assignments.map((a) => a.배정반);
  const notice = await buildNoticeFor(enrollment['학생 이름'] || '', 반이름들, 계정);
  warnings.push(...notice.missing.map((m) => `"${m}" 반을 운영시트에서 못 찾았습니다.`));

  return Response.json({
    ok: results.every((r) => r.ok),
    results,
    warnings,
    안내문: notice.안내문,
    계정: { ...계정, 재사용: acc.재사용 },
  });
}
