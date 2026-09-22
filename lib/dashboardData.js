// 대시보드 API가 공통으로 쓰는 시트 접근 (서버 전용)
import { fetchSheet } from './sheets';
import { SHEET_URLS, DEMO_CLASSES, DEMO_CURRICULUM, DEMO_STUDENTS, IS_DEMO } from './config';
import { getCurrentCurriculum, countSessions, parseWeekdays, parseCancellations, parseDate, formatDate, getKoreaNow } from './week';
import { extractSheetId, readTab } from './sheetsWrite';
import { sameName, splitMulti } from './utils';
import { SETTINGS_TAB, parseSettings } from './dashboard';

export function dashboardSheetId() {
  return extractSheetId(process.env.NEXT_PUBLIC_DASHBOARD_SHEET_LINK || '');
}

export async function loadClassesWithCurriculum() {
  if (IS_DEMO) {
    return DEMO_CLASSES.map((c) => ({ ...c, ...getCurrentCurriculum(c, DEMO_CURRICULUM.filter((r) => r['레벨'] === c['레벨'])), _curriculum: DEMO_CURRICULUM.filter((r) => r['레벨'] === c['레벨']) }));
  }
  const [cls, cur] = await Promise.all([fetchSheet(SHEET_URLS.classes), fetchSheet(SHEET_URLS.curriculum)]);
  const curriculumRows = cur.data || [];
  return (cls.data || []).filter((c) => String(c['반이름'] || '').trim()).map((c) => {
    const level = (c['레벨'] || '').trim();
    const rows = curriculumRows.filter((r) => (r['레벨'] || '').trim() === level);
    return { ...c, ...getCurrentCurriculum(c, rows), _curriculum: rows };
  });
}

export async function loadStudents() {
  if (IS_DEMO || !SHEET_URLS.students) return DEMO_STUDENTS;
  const r = await fetchSheet(SHEET_URLS.students);
  return r.data || [];
}

export async function loadSettings() {
  const id = dashboardSheetId();
  if (!id) return parseSettings([]);
  const r = await readTab(id, SETTINGS_TAB);
  return parseSettings(r.rows || []);
}

export function findClass(classes, name) {
  return classes.find((c) => sameName(c['반이름'], name));
}

export function studentsOfClass(students, className) {
  return students.filter((s) => splitMulti(s['반이름']).some((n) => sameName(n, className)) || sameName(s['반이름'], className));
}

/** 회차 번호와 그 회차 커리큘럼 행 */
export function sessionInfo(cls, dateStr) {
  const date = parseDate(dateStr) || getKoreaNow();
  const n = countSessions(cls['시작일'], cls['수업요일'], cls['휴강기록'], date);
  const rowOf = (k) => (cls._curriculum || []).find((r) => parseInt(String(r['회차'] || r['주차'] || '').replace(/[^0-9]/g, ''), 10) === k) || null;
  return { session: n, row: rowOf(n), prevRow: rowOf(n - 1) };
}

/** 기준일 이전의 가장 최근 수업일 (휴강 제외) */
export function previousClassDate(cls, dateStr) {
  const base = parseDate(dateStr);
  if (!base) return null;
  const weekdays = parseWeekdays(cls['수업요일']);
  const cancels = parseCancellations(cls['휴강기록']);
  const start = parseDate(cls['시작일']);
  for (let i = 1; i <= 21; i++) {
    const d = new Date(base); d.setDate(base.getDate() - i);
    if (start && d < start) return null;
    if (weekdays.includes(d.getDay()) && !cancels.some((c) => formatDate(c) === formatDate(d))) return d;
  }
  return null;
}

const READING_Q_TAB = '리딩문제';
const READING_R_TAB = '리딩기록';

/** 사이트 리딩 숙제 데이터 (탭 없으면 빈 배열 — 기능 미사용 시 무해) */
export async function loadReadingData() {
  const id = dashboardSheetId();
  if (!id) return { questions: [], records: [] };
  const [q, r] = await Promise.all([
    readTab(id, READING_Q_TAB).catch(() => ({ rows: [] })),
    readTab(id, READING_R_TAB).catch(() => ({ rows: [] })),
  ]);
  return { questions: q.rows || [], records: r.rows || [] };
}
