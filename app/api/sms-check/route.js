import { fetchSheet } from '../../../lib/sheets';
import { SHEET_URLS, DEMO_CLASSES, DEMO_STUDENTS, IS_DEMO } from '../../../lib/config';
import { formatDate } from '../../../lib/week';

export const dynamic = 'force-dynamic';

const DAY_COLUMNS = {
  0: '일가능시간',
  1: '월가능시간',
  2: '화가능시간',
  3: '수가능시간',
  4: '목가능시간',
  5: '금가능시간',
  6: '토가능시간',
};

/**
 * "18:00" 형식의 시간이 지금으로부터 최근 N분 이내에 시작됐는지
 */
function isTimeWindowNow(timeStr, windowMinutes = 15, now = new Date()) {
  if (!timeStr || !timeStr.trim()) return false;

  const parts = String(timeStr).trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (isNaN(h)) return false;

  const target = new Date(now);
  target.setHours(h, m, 0, 0);

  const diffMin = (now - target) / 60000;
  return diffMin >= 0 && diffMin < windowMinutes;
}

/**
 * SMS 발송 (알리고 기준, 다른 업체면 이 함수만 교체)
 */
async function sendSMS(phone, message) {
  const apiKey = process.env.SMS_API_KEY;
  const userId = process.env.SMS_USER_ID;
  const sender = process.env.SMS_SENDER;

  if (!apiKey || !userId || !sender) {
    return { ok: false, error: 'SMS 환경변수(SMS_API_KEY, SMS_USER_ID, SMS_SENDER)가 설정되지 않았습니다.' };
  }

  try {
    const body = new URLSearchParams({
      key: apiKey,
      user_id: userId,
      sender,
      receiver: String(phone).replace(/-/g, ''),
      msg: message,
    });

    const res = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const json = await res.json();
    return { ok: json.result_code === '1' || json.result_code === 1, raw: json };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function buildMessage(studentName, className, homeworkRange) {
  const range = homeworkRange ? ` (${homeworkRange})` : '';
  return `[R U Thinking?] ${studentName} 학생, 오늘 숙제${range}가 아직 제출되지 않았어요. 지금 바로 클래스카드 완료하고 숙제 제출해주세요!`;
}

export async function GET(request) {
  // Vercel Cron 인증 (선택)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const todayStr = formatDate(now);
  const dayColumn = DAY_COLUMNS[now.getDay()];

  const log = [];

  // 반 목록 가져오기
  let classes = [];
  if (IS_DEMO) {
    classes = DEMO_CLASSES;
  } else {
    const result = await fetchSheet(SHEET_URLS.classes);
    classes = result.data || [];
  }

  // 학생 명단 가져오기
  let students = [];
  if (IS_DEMO || !SHEET_URLS.students) {
    students = DEMO_STUDENTS;
  } else {
    const result = await fetchSheet(SHEET_URLS.students);
    students = result.data || [];
  }

  const activeClasses = classes.filter(
    (c) => (c['종료여부'] || '진행중').trim() !== '종료'
  );

  let sentCount = 0;

  for (const cls of activeClasses) {
    const dashboardCSV = cls['대시보드CSV'];
    if (!dashboardCSV) continue;

    // 이 반의 대시보드 읽기
    const dashResult = await fetchSheet(dashboardCSV);
    if (dashResult.error) {
      log.push(`${cls['반이름']}: 대시보드 읽기 실패`);
      continue;
    }

    // 오늘 날짜 + 숙제 미제출인 학생 찾기
    const todayRows = (dashResult.data || []).filter((row) => {
      const date = (row['날짜'] || '').trim();
      if (date !== todayStr) return false;

      const hw = (row['숙제'] || row['숙제제출'] || '').trim().toUpperCase();
      return hw === 'X' || hw === '미제출';
    });

    for (const row of todayRows) {
      const name = (row['이름'] || row['학생이름'] || '').trim();
      if (!name) continue;

      // 학생 명단에서 전화번호 + 오늘 가능시간 찾기
      const student = students.find(
        (s) => (s['이름'] || '').trim() === name
      );
      if (!student) {
        log.push(`${name}: 학생 명단에 없음`);
        continue;
      }

      const phone = (student['전화번호'] || '').trim();
      if (!phone) {
        log.push(`${name}: 전화번호 없음`);
        continue;
      }

      const availableTime = (student[dayColumn] || '').trim();
      if (!availableTime) {
        log.push(`${name}: 오늘(${dayColumn}) 가능시간 미등록`);
        continue;
      }

      // 지금이 그 학생의 가능시간인지 확인
      if (!isTimeWindowNow(availableTime, 15, now)) {
        continue;
      }

      const message = buildMessage(name, cls['반이름'], cls['숙제범위']);
      const result = await sendSMS(phone, message);

      if (result.ok) {
        sentCount++;
        log.push(`${name}: 발송 완료 (${availableTime})`);
      } else {
        log.push(`${name}: 발송 실패 - ${result.error || JSON.stringify(result.raw)}`);
      }
    }
  }

  return Response.json({
    checkedAt: now.toISOString(),
    today: todayStr,
    sent: sentCount,
    log,
  });
}
