import { testInfoFor } from '../../../lib/curriculum';
import { loadClasscardSets } from '../../../lib/curriculumData';
import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, IS_DEMO } from '../../../lib/config';
import { formatDate, getKoreaNow, hasClassToday } from '../../../lib/week';
import { readTab, upsertRows } from '../../../lib/sheetsWrite';
import { sameName, splitMulti, koreaTimeString } from '../../../lib/utils';
import {
  DASHBOARD_TAB, ENTRY_TAB, CODE_TAB, CLASSCARD_TAB, DASHBOARD_HEADERS,
  judgeAttendance, judgeHomework, judgeNotes, extractUnit, classStartAt, parseDateTime,
} from '../../../lib/dashboard';
import {
  dashboardSheetId, loadClassesWithCurriculum, loadStudents, loadSettings,
  findClass, studentsOfClass, sessionInfo, previousClassDate, loadReadingData } from '../../../lib/dashboardData';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard                → 반 목록(오늘 수업 여부 포함)
 * GET /api/dashboard?class=X&date=Y → 그 반 학생 전원 + 자동 판정 미리 채움
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class');
  const date = searchParams.get('date') || formatDate(getKoreaNow());

  const classes = await loadClassesWithCurriculum();
  if (!className) {
    return Response.json({
      demo: IS_DEMO,
      date,
      classes: classes.filter((c) => (c['종료여부'] || '') !== '종료').map((c) => ({
        반이름: c['반이름'], 대분류: c['대분류'], 수업요일: c['수업요일'], 수업시간: c['수업시간'],
        today: hasClassToday(c), sessions: c.sessions, status: c.status,
      })),
    });
  }

  const cls = findClass(classes, className);
  if (!cls) return Response.json({ error: `"${className}" 반을 찾을 수 없습니다.` });

  const [students, settings] = await Promise.all([loadStudents(), loadSettings()]);
  const roster = studentsOfClass(students, cls['반이름']);
  const { session, row, prevRow } = sessionInfo(cls, date);

  const sheetId = dashboardSheetId();
  const warnings = [];
  let saved = [], entries = [], codes = [], ccRecords = [], notesRows = [];

  if (sheetId && !IS_DEMO) {
    const [d, e, c, cc] = await Promise.all([
      readTab(sheetId, DASHBOARD_TAB), readTab(sheetId, ENTRY_TAB), readTab(sheetId, CODE_TAB), readTab(sheetId, CLASSCARD_TAB),
    ]);
    [d, e, c, cc].forEach((r) => { if (!r.ok) warnings.push(r.error); });
    saved = d.rows; entries = e.rows; codes = c.rows; ccRecords = cc.rows;
  } else if (!IS_DEMO) {
    warnings.push('NEXT_PUBLIC_DASHBOARD_SHEET_LINK가 없어서 자동 판정·저장이 꺼져 있습니다.');
  }
  const notesUrl = cls['필기인증CSV'] || SHEET_URLS.notes;
  if (notesUrl) {
    const r = await fetchSheet(notesUrl);
    if (r.error) warnings.push('필기인증 응답 시트: ' + r.error); else notesRows = r.data;
  }

  const classStart = classStartAt(date, cls['수업시간']);
  const prevDate = previousClassDate(cls, date);
  const prevStart = prevDate ? classStartAt(formatDate(prevDate), cls['수업시간']) : null;
  const unit = prevRow ? extractUnit(prevRow['진도']) : null;
  const textbooks = splitMulti(cls['교재']);
  // 수업 시작 5분 테스트 (오늘 회차 유닛 n의 지난 유닛 n-1)
  const { sets: ccSets } = await loadClasscardSets();
  const testInfo = testInfoFor({
    category: cls['대분류'], textbook: textbooks[0] || '',
    unit: row ? extractUnit(row['진도']) : null, sets: ccSets,
  });
  const expectedCode = row ? (row['시크릿코드'] || row['시크릿 코드'] || '') : '';

  const reading = await loadReadingData();

  const rows = roster.map((s) => {
    const name = s['이름'];
    const existing = saved.find((r) => r['날짜'] === date && sameName(r['반이름'], cls['반이름']) && sameName(r['이름'], name));

    // 출석: 그날 이 반 첫 입장 클릭
    const myEntries = entries.filter((r) => r['날짜'] === date && sameName(r['반이름'], cls['반이름']) && sameName(r['이름'], name))
      .map((r) => parseDateTime(r['시각'])).filter(Boolean).sort((a, b) => a - b);
    const att = judgeAttendance(myEntries[0] || null, classStart, settings);

    // 시크릿코드: 그날 정답 입력이 있으면 O
    const codeHit = codes.some((r) => r['날짜'] === date && sameName(r['반이름'], cls['반이름']) && sameName(r['이름'], name) && r['정답여부'] === 'O');

    const hw = judgeHomework({
      records: ccRecords, studentName: name, classcardId: s['클래스카드아이디'] || s['클래스카드ID'] || '',
      textbooks, unit, deadline: classStart, prevClassStart: prevStart, settings,
    });
    // 사이트 리딩 숙제 판정을 병합 (그 유닛 문제가 있을 때만 요구, 나쁜 쪽 우선)
    const rd = judgeReadingHomework({
      readingQuestions: reading.questions, readingRecords: reading.records,
      studentName: name, textbooks, unit, deadline: classStart,
    });
    hw.숙제 = mergeHomework(hw.숙제, rd.리딩);
    hw.근거 = [...(hw.근거 || []), ...(rd.근거 || [])];
    const notes = judgeNotes(notesRows, name, prevStart, classStart);

    const auto = {
      출석: myEntries.length ? att.출석 : '', 입장시각: att.입장시각, 숙제: hw.숙제, 재시결과: hw.재시결과,
      단어점수: hw.단어점수, 시크릿코드: expectedCode ? (codeHit ? 'O' : 'X') : '', 필기인증: notes, 근거: hw.근거,
    };
    const base = { 이름: name, 출석: '', 입장시각: '', 숙제: '', 재시결과: '', 시크릿코드: '', 수업태도: '', 필기인증: '', 특이사항: '', 단어점수: '' };
    // 저장된 값이 있으면 그걸 우선, 없으면 자동 판정
    const merged = { ...base };
    for (const k of Object.keys(base)) { if (k === '이름') continue; merged[k] = (existing && existing[k]) || auto[k] || ''; }
    return { ...merged, auto, savedAt: existing ? existing['저장시각'] : '' };
  });

  return Response.json({
    demo: IS_DEMO, warnings, date, 반이름: cls['반이름'], 수업시간: cls['수업시간'], 회차: session,
    진도: row ? row['진도'] : '', 숙제유닛: unit, 시크릿코드: expectedCode, 교재: textbooks,
    테스트: testInfo,
    settings, rows, canSave: !!sheetId && !IS_DEMO,
  });
}

/** POST: 반 전체 한 번에 저장 */
export async function POST(request) {
  const body = await request.json();
  const { 반이름, 날짜, 회차, rows } = body || {};
  if (!반이름 || !날짜 || !Array.isArray(rows)) return Response.json({ ok: false, error: '반이름, 날짜, rows가 필요합니다.' });
  const sheetId = dashboardSheetId();
  if (!sheetId) return Response.json({ ok: false, error: 'NEXT_PUBLIC_DASHBOARD_SHEET_LINK가 설정되지 않았습니다.' });
  const now = koreaTimeString();
  const objs = rows.map((r) => ({
    날짜, 회차: String(회차 ?? ''), 반이름, 이름: r.이름,
    출석: r.출석 || '', 입장시각: r.입장시각 || '', 숙제: r.숙제 || '', 재시결과: r.재시결과 || '',
    시크릿코드: r.시크릿코드 || '', 수업태도: r.수업태도 || '', 필기인증: r.필기인증 || '',
    특이사항: r.특이사항 || '', 단어점수: r.단어점수 || '', 저장시각: now,
  }));
  const res = await upsertRows(sheetId, DASHBOARD_TAB, DASHBOARD_HEADERS, ['날짜', '반이름', '이름'], objs);
  return Response.json(res);
}
