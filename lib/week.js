// 수업 회차 자동 계산
// 레벨 하나(예: Easy Link 5) 안에서 1회차 ~ n회차로 진행되는 구조.
// 주 2회 수업이면 한 주에 2회차, 주 3회면 한 주에 3회차가 나감.

const WEEKDAY_MAP = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

/**
 * 서버(Vercel)는 UTC로 돌아가는데 학원은 한국 시간 기준이라,
 * new Date()를 그대로 쓰면 한국시간 자정~오전9시 사이에 날짜가 하루
 * 이르게 계산되는 버그가 생긴다. 항상 이 함수로 "오늘"을 구한다.
 */
export function getKoreaNow() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 9 * 60 * 60000);
}

export function parseWeekdays(str) {
  if (!str) return [];
  const days = [];
  for (const char of String(str)) {
    if (WEEKDAY_MAP[char] !== undefined) days.push(WEEKDAY_MAP[char]);
  }
  return days;
}

export function parseDate(str) {
  if (!str) return null;
  const cleaned = String(str).trim().replace(/[./]/g, '-');
  const parts = cleaned.split('-').map((p) => parseInt(p, 10));
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseCancellations(str) {
  if (!str) return [];
  return String(str)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => parseDate(s))
    .filter(Boolean);
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 시작일부터 오늘까지 실제로 진행된 수업 회차 수 (휴강 제외)
 * @returns {number} 0 = 개강 전
 */
export function countSessions(startDateStr, weekdaysStr, cancellationsStr, today = getKoreaNow()) {
  const start = parseDate(startDateStr);
  if (!start) return 0;

  const weekdays = parseWeekdays(weekdaysStr);
  if (weekdays.length === 0) return 0;

  const cancellations = parseCancellations(cancellationsStr);

  const now = new Date(today);
  now.setHours(0, 0, 0, 0);

  if (now < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  let guard = 0;

  while (cursor <= now && guard < 365 * 5) {
    const isClassDay = weekdays.includes(cursor.getDay());
    const isCancelled = cancellations.some((c) => isSameDay(c, cursor));
    if (isClassDay && !isCancelled) count++;
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }

  return count;
}

/**
 * 커리큘럼 행에서 회차 번호 추출
 * "1회차", "1주차", "1" 등 어떤 표기든 숫자만 뽑음
 */
function extractSessionNumber(row) {
  const raw = row['회차'] || row['주차'] || row['차시'] || '';
  const num = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? null : num;
}

/**
 * 반 정보 + 커리큘럼 → 현재 회차의 수업 자료
 */
export function getCurrentCurriculum(classData, curriculumRows, today = getKoreaNow()) {
  const startDate = classData['시작일'];
  const weekdays = classData['수업요일'];
  const cancellations = classData['휴강기록'];
  const totalSessions = parseInt(classData['총회차'], 10) || 0;

  const sessions = countSessions(startDate, weekdays, cancellations, today);

  const empty = {
    sessions: 0,
    totalSessions,
    진도: '',
    클래스카드URL: '',
    숙제범위: '',
    영상URL: '',
    개념설명숙제: '',
    설명언어: '',
    시크릿코드: '',
  };

  if (sessions === 0) {
    return { ...empty, status: '개강 전' };
  }

  if (totalSessions > 0 && sessions > totalSessions) {
    return { ...empty, sessions: totalSessions, status: '커리큘럼 완료' };
  }

  const match = curriculumRows.find((row) => extractSessionNumber(row) === sessions);

  if (!match) {
    return { ...empty, sessions, status: '커리큘럼 완료' };
  }

  return {
    sessions,
    totalSessions,
    status: '진행중',
    진도: match['진도'] || '',
    클래스카드URL: match['클래스카드URL'] || match['클래스카드'] || '',
    숙제범위: match['숙제범위'] || '',
    영상URL: match['영상URL'] || match['영상url'] || match['영상 url'] || '',
    개념설명숙제: match['개념설명숙제'] || '',
    설명언어: match['설명언어'] || '한국어',
    시크릿코드: match['시크릿코드'] || match['시크릿 코드'] || '',
  };
}

/**
 * 이번 주 날짜 범위 (월요일 ~ 일요일)
 */
export function getThisWeekRange(today = getKoreaNow()) {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 오늘 수업이 있는 반인지
 */
export function hasClassToday(classData, today = getKoreaNow()) {
  const weekdays = parseWeekdays(classData['수업요일']);
  if (weekdays.length === 0) return false;

  const cancellations = parseCancellations(classData['휴강기록']);
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);

  if (cancellations.some((c) => isSameDay(c, now))) return false;

  return weekdays.includes(now.getDay());
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export function getTodayName(today = getKoreaNow()) {
  return DAY_NAMES[today.getDay()];
}

/**
 * 지난 수업일로부터 오늘이 며칠째인지 계산 (D+0 = 수업 당일)
 */
export function daysSinceLastClass(classData, today = getKoreaNow()) {
  const weekdays = parseWeekdays(classData['수업요일']);
  if (weekdays.length === 0) return 0;

  const cancellations = parseCancellations(classData['휴강기록']);
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);

  // 오늘부터 최대 14일 거슬러 올라가며 가장 최근 수업일 찾기
  for (let i = 0; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const isClassDay = weekdays.includes(d.getDay());
    const isCancelled = cancellations.some((c) => isSameDay(c, d));
    if (isClassDay && !isCancelled) return i;
  }
  return 0;
}

/**
 * 숙제 항목을 일차별로 필터링
 * 숙제범위 문자열 안에 [D+1], [D+2] 태그가 있으면 그 일차에만 공개.
 * 태그가 없는 항목은 항상 공개.
 *
 * 예: "1. 단어학습 [D+1]\n2. 워크북 [D+2]"
 */
export function filterHomeworkByDay(homeworkText, dayOffset) {
  if (!homeworkText) return { visible: '', locked: '' };

  const lines = String(homeworkText).split(/\n/);
  const visible = [];
  const locked = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/\[D\+(\d+)\]/i);
    if (!match) {
      visible.push(trimmed);
      continue;
    }

    const requiredDay = parseInt(match[1], 10);
    const cleaned = trimmed.replace(/\s*\[D\+\d+\]\s*/i, '').trim();

    if (dayOffset >= requiredDay) {
      visible.push(cleaned);
    } else {
      locked.push({ text: cleaned, opensAt: requiredDay });
    }
  }

  return {
    visible: visible.join('\n'),
    locked,
  };
}
