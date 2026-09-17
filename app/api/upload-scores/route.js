import * as XLSX from 'xlsx';
import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_STUDENTS, IS_DEMO } from '../../../lib/config';
import {
  parseClassCardRows,
  computeClassStats,
  analyzeStudent,
  matchStudents,
  resolveMetrics,
} from '../../../lib/classcard';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const className = formData.get('className') || '';
    const targetsRaw = formData.get('targets') || '{}';
    const dueDate = formData.get('dueDate') || '';

    if (!file) {
      return Response.json({ error: '파일이 없습니다.' });
    }

    let targets = {};
    try {
      targets = JSON.parse(targetsRaw);
    } catch (e) {
      targets = {};
    }

    // 엑셀 읽기
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const parsed = parseClassCardRows(rows);
    if (parsed.error) {
      return Response.json({ error: parsed.error });
    }

    // 과목 지표 결정 (세트 제목 기준)
    const metrics = resolveMetrics(parsed.setTitle);

    // 반 전체 통계
    const stats = computeClassStats(parsed.students, metrics);

    // 학생 명단 가져와서 매칭
    let roster = [];
    if (IS_DEMO || !SHEET_URLS.students) {
      roster = DEMO_STUDENTS;
    } else {
      const result = await fetchSheet(SHEET_URLS.students);
      roster = result.data || [];
    }

    // 반이 지정되면 그 반 학생만
    const filteredRoster = className
      ? roster.filter((r) => (r['반이름'] || '').trim() === className.trim())
      : roster;

    const { matched, unmatched } = matchStudents(
      parsed.students,
      filteredRoster.length > 0 ? filteredRoster : roster
    );

    // 학생별 분석
    const results = matched.map(({ excel, roster: r, name }) => {
      const analysis = analyzeStudent(excel, metrics, stats, targets, dueDate);
      return {
        name,
        반이름: r['반이름'] || '',
        values: analysis.values,
        insights: analysis.insights,
      };
    });

    return Response.json({
      setTitle: parsed.setTitle,
      metrics,
      totalInExcel: parsed.students.length,
      matchedCount: matched.length,
      results,
      unmatched: unmatched.map((u) => ({ name: u.name, reason: u.reason })),
      classAverage: Object.fromEntries(
        Object.entries(stats).map(([k, v]) => [k, Math.round(v.avg * 10) / 10])
      ),
    });
  } catch (err) {
    return Response.json({ error: '엑셀 처리 실패: ' + err.message });
  }
}
