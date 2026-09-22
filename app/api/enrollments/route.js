import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_ENROLLMENTS, IS_DEMO } from '../../../lib/config';
import { appendRow, extractSheetId, readTab, updateCell } from '../../../lib/sheetsWrite';
import { splitMulti, normalize, sameName, koreaTimeString } from '../../../lib/utils';
import { buildClasscardAccount, buildWelcomeNotice, textbooksOfClass } from '../../../lib/notice';
import { loadClassesWithCurriculum, dashboardSheetId } from '../../../lib/dashboardData';
import { firstMonthFee, formatWon } from '../../../lib/fee';

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


// 응답 시트에서 집주소 칸 찾기 (문항 제목이 조금 달라도 "주소"가 들어간 칸을 찾음)
function addressOf(enrollment) {
  for (const key of Object.keys(enrollment || {})) {
    if (String(key).includes('주소')) {
      const v = String(enrollment[key] || '').trim();
      if (v) return v;
    }
  }
  return '';
}


// 대기 건 상태 인코딩 (처리여부 칸 하나로 관리)
// '' = 신규 / "연락함 시각" / "결제대기|반이름|시각" → 아직 진행 중이므로 미처리 목록에 남김
// "연락마침 시각" / "등록전환|반이름|시각" / "처리완료 시각" → 처리완료 보기로
export function waitStatusOf(value) {
  const v = String(value || '').trim();
  if (!v) return { key: 'new', label: '' };
  if (v.startsWith('연락함')) return { key: 'contacted', label: '📞 연락함' };
  if (v.startsWith('결제대기')) {
    const parts = v.split('|');
    const 반 = (parts[1] || '').trim();
    return { key: 'pending_pay', label: '💳 결제 대기', 반, 반들: 반.split(',').map((s) => s.trim()).filter(Boolean) };
  }
  return { key: 'closed', label: v.startsWith('등록전환') ? '등록 전환' : '처리 완료' };
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
    const st = waitStatusOf(r['처리여부']);
    const done = st.key === 'closed';
    return wantDone ? done : !done;
  });
  // 대기 목록은 오래된순(먼저 온 것부터 처리), 처리완료 목록은 최신순
  if (wantDone) filtered.reverse();

  const enriched = filtered.map((r) => ({ ...r, items: splitItems(r) }));

  return Response.json({ demo, enrollments: enriched, error });
}

/** 학생명단 스프레드시트의 실제 탭 이름 찾기 (탭 이름이 "학생명단"이 아닐 수 있음) */
async function resolveStudentsTab(sheetId) {
  const candidates = [process.env.STUDENTS_SHEET_TAB, '학생명단', 'Sheet1', '시트1'].filter(Boolean);
  for (const tab of candidates) {
    const r = await readTab(sheetId, tab);
    if (r.ok && !r.missing) return { tab, rows: r.rows };
  }
  return { tab: null, rows: [] };
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
  return markDoneWith(enrollment, '처리완료 ' + koreaTimeString());
}

/** 처리여부 칸에 지정한 값을 기록 (대기 상태 머신: 연락함/결제대기/연락마침/등록전환) */
async function markDoneWith(enrollment, value) {
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
    return await updateCell(sheetId, tab, row._row, '처리여부', value);
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
      const found = await resolveStudentsTab(studentsSheetId);
      studentRows = found.rows;
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

  // ===== 등록: 반 배정 → 결제 대기 (아직 학생명단에 안 넣음, 배정 반들을 처리여부에 저장) =====
  if (body.mode === 'enrollassign') {
    const list = body.assignments || [];
    if (list.length === 0 || list.some((a) => !a.배정반)) {
      return Response.json({ error: '모든 과목에 반을 선택해주세요.' });
    }
    const 반들 = list.map((a) => a.배정반).join(',');
    const r = await markDoneWith(body.enrollment, `결제대기|${반들}|` + koreaTimeString());
    return Response.json(r.ok ? { ok: true, 반들 } : r);
  }

  // ===== 결제 안내 문구 (신입생 원비 안내문) — 결제 대기 상태에서 복사용 =====
  if (body.mode === 'feenotice') {
    const enrollment = body.enrollment || {};
    const 반이름들 = (body.반이름들 || []).filter(Boolean);
    if (반이름들.length === 0) return Response.json({ error: '배정된 반이 없습니다.' });

    const classes = await loadClassesWithCurriculum();
    const warnings = [];

    // 설정 탭에서 수강료계좌
    let 계좌 = '';
    const dashId = dashboardSheetId();
    if (dashId) {
      const st = await readTab(dashId, '설정').catch(() => ({ rows: [] }));
      const hit = (st.rows || []).find((r) => String(r['키'] || r['항목'] || '').trim() === '수강료계좌');
      계좌 = hit ? String(hit['값'] || '').trim() : '';
    }
    if (!계좌) { 계좌 = '(계좌번호)'; warnings.push('대시보드 설정 탭에 "수강료계좌" 키가 없어요 — 넣으면 자동으로 채워집니다.'); }

    const feeLines = [];
    const classLines = [];
    let total = 0;
    let anyMissing = false;
    for (const n of 반이름들) {
      const cls = classes.find((c) => sameName(c['반이름'], n));
      if (!cls) {
        warnings.push(`"${n}" 반을 운영시트에서 못 찾았습니다.`);
        classLines.push(`📚 수업: ${n}`);
        feeLines.push(반이름들.length > 1 ? `  · ${n}: OOO원` : '💰 첫 달 수강료: OOO원');
        anyMissing = true;
        continue;
      }
      classLines.push(`📚 수업: ${cls['반이름']} (${cls['수업요일'] || ''} ${cls['수업시간'] || ''})`.trim());
      const fee = firstMonthFee(cls);
      if (!fee.amount) {
        anyMissing = true;
        warnings.push(`"${n}" 반의 월수강료가 비어 있어요 — 운영시트 반 탭 월수강료 열에 금액을 넣으면 자동 계산됩니다.`);
        feeLines.push(반이름들.length > 1 ? `  · ${n}: OOO원` : '💰 첫 달 수강료: OOO원');
      } else {
        total += fee.amount;
        const basisTxt = fee.basis ? ` (${fee.basis})` : '';
        feeLines.push(반이름들.length > 1 ? `  · ${n}: ${formatWon(fee.amount)}${basisTxt}` : `💰 첫 달 수강료: ${formatWon(fee.amount)}${basisTxt}`);
      }
    }
    if (반이름들.length > 1) feeLines.push(`💰 첫 달 수강료 합계: ${anyMissing ? 'OOO원' : formatWon(total)}`);

    const 학생 = String(enrollment['학생 이름'] || '').trim();
    const 학부모 = String(enrollment['학부모 이름'] || '').trim();
    const 문구 = [
      `[R U Thinking?] ${학부모 ? 학부모 + ' 학부모님' : '학부모님'}, 안녕하세요 😊`,
      '',
      `${학생} 학생의 등록 신청 잘 받았습니다!`,
      '',
      ...classLines,
      ...feeLines,
      `🏦 입금 계좌: ${계좌}`,
      `✏️ 입금자명: ${학생} (학생 이름으로 부탁드려요)`,
      '',
      '입금이 확인되면 등록 확정과 함께',
      '첫 수업 준비 안내를 보내드리겠습니다.',
      '',
      '궁금하신 점은 이 카톡으로 편하게 남겨주세요. 감사합니다!',
    ].join('\n');

    return Response.json({ ok: true, 문구, warnings });
  }

  // ===== 대기: 연락함 기록 (수업 열렸어요 문구 복사 시) =====
  if (body.mode === 'waitcontact') {
    const r = await markDoneWith(body.enrollment, '연락함 ' + koreaTimeString());
    return Response.json(r);
  }

  // ===== 대기: 반 배정 → 결제 대기 (아직 학생명단에 안 넣음) =====
  if (body.mode === 'waitassign') {
    const 반 = String(body.반이름 || '').trim();
    if (!반) return Response.json({ error: '배정할 반을 선택해주세요.' });
    const r = await markDoneWith(body.enrollment, `결제대기|${반}|` + koreaTimeString());
    return Response.json(r);
  }

  // ===== 대기 처리완료 (처리여부만 기록) =====
  if (body.mode === 'waitdone') {
    if (!body.enrollment) return Response.json({ error: '신청 정보가 없습니다.' });
    const done = await markDoneWith(body.enrollment, '연락마침 ' + koreaTimeString());
    if (!done.ok) return Response.json({ error: done.error || '처리여부 기록에 실패했습니다.' });
    return Response.json({ ok: true });
  }

  // ===== 처리완료 (일반 등록) / 결제 완료(대기 전환, mode:'waitpaid') =====
  // waitpaid: 대기 건이 결제 대기 상태에서 입금 확인됐을 때 — 이 시점에만 학생명단 추가·계정·안내문 실행
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

  // 학생명단 탭 이름 자동 탐색 (기존 계정 조회 + 추가 저장에 같이 씀)
  const studentsTab = studentsSheetId ? await resolveStudentsTab(studentsSheetId) : { tab: null, rows: [] };
  if (studentsSheetId && !studentsTab.tab) {
    return Response.json({ error: '학생명단 시트에서 탭을 못 찾았습니다. 탭 이름을 "학생명단"으로 바꾸거나, 환경변수 STUDENTS_SHEET_TAB에 실제 탭 이름을 넣어주세요.' });
  }
  const existingRows = studentsTab.rows;
  const acc = buildClasscardAccount({
    영어이름: enrollment['학생 영어이름'] || '',
    학부모연락처: enrollment['학부모 연락처'] || '',
    ...findExistingAccount(existingRows, enrollment['학생 이름'], enrollment['학부모 연락처']),
  });
  const 계정 = { 아이디: acc.아이디, 비번: acc.비번 };

  // 학생명단에 추가 (반마다 한 줄, A~H: 이름|반이름|학부모 연락처|학생 학년|등록시각|클래스카드아이디|클래스카드비번|집주소)
  for (const a of assignments) {
    const row = [
      enrollment['학생 이름'] || '',
      a.배정반,
      enrollment['학부모 연락처'] || '',
      enrollment['학생 학년'] || '',
      koreaTimeString(),
      계정.아이디,
      계정.비번,
      addressOf(enrollment),
    ];
    const r = await appendRow(studentsSheetId, studentsTab.tab || '학생명단', row);
    results.push({ 대상: `학생명단 (${a.배정반})`, ok: r.ok, error: r.error });
  }

  // 등록 신청 시트에 처리여부 자동 기록 (대기 전환 건은 "등록전환"으로 구분 — 24번 전환율용)
  const done = body.mode === 'waitpaid'
    ? await markDoneWith(enrollment, `등록전환|${assignments.map((a) => a.배정반).join(',')}|` + koreaTimeString())
    : await markDone(enrollment);
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
