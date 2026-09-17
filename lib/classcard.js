// 클래스카드 리포트 엑셀 파싱 + 분석
//
// 클래스카드 엑셀 구조 (실제 다운로드 파일 기준):
//   1행: 세트 제목 (예: "The Voca+ 3 - Unit 1 단어")
//   2행: 헤더 (학생명 / 아이디 / 암기 / 리콜 / 스펠 / 스피킹(%) / AI 평가 점수 /
//             매칭 최고 / 테스트 최고 / 테스트 제출일 / 맞은문항수 / 틀린문항수 /
//             완료여부 / 누적오답 단어복습)
//   3행~: 학생별 데이터

/**
 * 과목별로 "어떤 지표를 볼 것인지" 기본 설정
 * 시트에서 재정의할 수 있고, 없으면 이 기본값을 사용한다.
 */
export const DEFAULT_SUBJECT_METRICS = {
  단어: ['암기', '리콜', '매칭 최고', '테스트 최고'],
  보카: ['암기', '리콜', '매칭 최고', '테스트 최고'],
  voca: ['암기', '리콜', '매칭 최고', '테스트 최고'],
  문법: ['맞은문항수', '틀린문항수', '테스트 최고'],
  grammar: ['맞은문항수', '틀린문항수', '테스트 최고'],
  리딩: ['테스트 최고', '맞은문항수', '틀린문항수'],
  reading: ['테스트 최고', '맞은문항수', '틀린문항수'],
  'easy link': ['테스트 최고', '맞은문항수', '틀린문항수'],
  'subject link': ['테스트 최고', '맞은문항수', '틀린문항수'],
  스피킹: ['스피킹(%)', 'AI 평가 점수'],
  speaking: ['스피킹(%)', 'AI 평가 점수'],
  파닉스: ['암기', '리콜', '테스트 최고'],
  phonics: ['암기', '리콜', '테스트 최고'],
  기본: ['테스트 최고', '완료여부'],
};

/**
 * 과목명에서 어떤 지표 세트를 쓸지 결정
 */
export function resolveMetrics(subjectName, customMap = {}) {
  const name = String(subjectName || '').trim().toLowerCase();

  // 커스텀 설정 우선
  for (const key of Object.keys(customMap)) {
    if (name.includes(String(key).toLowerCase())) return customMap[key];
  }
  // 기본 설정
  for (const key of Object.keys(DEFAULT_SUBJECT_METRICS)) {
    if (key === '기본') continue;
    if (name.includes(key.toLowerCase())) return DEFAULT_SUBJECT_METRICS[key];
  }
  return DEFAULT_SUBJECT_METRICS['기본'];
}

/**
 * 셀 값을 숫자로 (빈 값/문자는 null)
 */
function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? null : n;
}

/**
 * 엑셀 rows(2차원 배열)를 파싱해서 학생별 기록으로 변환
 * @param {Array<Array>} rows - 시트 전체 행
 * @returns {{ setTitle, students: Array }}
 */
export function parseClassCardRows(rows) {
  if (!rows || rows.length < 3) {
    return { setTitle: '', students: [], error: '엑셀 형식이 예상과 다릅니다.' };
  }

  // 1행에서 세트 제목 찾기 (빈 칸이 아닌 첫 값)
  const setTitle = (rows[0] || []).find((c) => c && String(c).trim()) || '';

  // 헤더 행 찾기: "학생명"이 들어있는 행
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if ((rows[i] || []).some((c) => String(c || '').trim() === '학생명')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    return { setTitle, students: [], error: '"학생명" 열을 찾을 수 없습니다.' };
  }

  const headers = (rows[headerIdx] || []).map((h) => String(h || '').trim());
  const students = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const obj = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = row[idx] === undefined ? '' : row[idx];
    });

    const name = String(obj['학생명'] || '').trim();
    if (!name) continue;

    students.push(obj);
  }

  return { setTitle, students, error: null };
}

/**
 * 반 전체 데이터로 통계 계산 (순위, 평균 등)
 */
export function computeClassStats(students, metrics) {
  const stats = {};

  for (const metric of metrics) {
    const values = students
      .map((s) => toNum(s[metric]))
      .filter((v) => v !== null);

    if (values.length === 0) continue;

    const sorted = [...values].sort((a, b) => b - a);
    stats[metric] = {
      max: sorted[0],
      min: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      sorted,
      count: values.length,
    };
  }

  return stats;
}

/**
 * 한 학생의 기록을 분석해서 주간리포트용 인사이트 문장 재료 생성
 * @param {object} student - 그 학생의 엑셀 행
 * @param {Array<string>} metrics - 이 과목에서 볼 지표들
 * @param {object} stats - computeClassStats 결과
 * @param {object} targets - { 암기: 300, ... } 목표값 (선택)
 * @param {string} dueDate - 마감일 "9/15" 형식 (선택)
 */
export function analyzeStudent(student, metrics, stats, targets = {}, dueDate = '') {
  const insights = [];
  const values = {};

  for (const metric of metrics) {
    const raw = student[metric];
    const num = toNum(raw);
    values[metric] = raw;

    if (num === null) continue;

    // 목표 대비
    if (targets[metric] !== undefined) {
      const target = toNum(targets[metric]);
      if (target !== null && target > 0) {
        if (num < target) {
          insights.push(`${metric}: 목표 ${target} 대비 ${num} (미달)`);
        } else if (num > target * 1.3) {
          insights.push(`${metric}: 목표 ${target}을 크게 넘어선 ${num} (초과 달성)`);
        } else {
          insights.push(`${metric}: 목표 ${target} 달성 (${num})`);
        }
      }
    }

    // 반 내 순위
    const st = stats[metric];
    if (st && st.count > 1) {
      const rank = st.sorted.indexOf(num) + 1;
      const pct = Math.round((rank / st.count) * 100);
      if (rank === 1) {
        insights.push(`${metric}: 반 최고점 (${num})`);
      } else if (pct <= 30) {
        insights.push(`${metric}: 반 상위 ${pct}% (${num})`);
      } else if (pct >= 80) {
        insights.push(`${metric}: 반 하위권 (${num}, 평균 ${Math.round(st.avg)})`);
      }
    }
  }

  // 제출일 지각 여부
  const submitted = String(student['테스트 제출일'] || '').trim();
  if (submitted && dueDate) {
    insights.push(`테스트 제출일: ${submitted} (마감 ${dueDate})`);
  } else if (submitted) {
    insights.push(`테스트 제출일: ${submitted}`);
  } else if (metrics.includes('테스트 최고')) {
    insights.push('테스트 미응시');
  }

  // 완료 여부
  const done = String(student['완료여부'] || '').trim();
  if (done) insights.push(`완료여부: ${done}`);

  return { values, insights };
}

/**
 * 학생 명단과 엑셀 학생명을 자동 매칭
 * @returns {{ matched: Array, unmatched: Array }}
 */
export function matchStudents(excelStudents, roster) {
  const matched = [];
  const unmatched = [];

  // 이름 -> 명단 항목들
  const byName = {};
  for (const r of roster) {
    const n = String(r['이름'] || '').trim();
    if (!n) continue;
    if (!byName[n]) byName[n] = [];
    byName[n].push(r);
  }

  for (const s of excelStudents) {
    const name = String(s['학생명'] || '').trim();
    const candidates = byName[name] || [];

    if (candidates.length === 1) {
      matched.push({ excel: s, roster: candidates[0], name });
    } else if (candidates.length > 1) {
      unmatched.push({ excel: s, name, reason: '동명이인 — 어느 학생인지 확인 필요' });
    } else {
      unmatched.push({ excel: s, name, reason: '학생 명단에 없음' });
    }
  }

  return { matched, unmatched };
}
