// 신입생 첫 달 수강료 계산
// 규칙 (2026-09-21 확정):
//  - 반이 아직 개강 전(시작일이 오늘 이후) → 정액 (월수강료 그대로)
//  - 이미 진행 중인 반에 중간 합류 → 이번 달 남은 회차 / 이번 달 전체 회차 비율로 일할
//    (100원 단위 반올림, 코치가 복사 전에 금액 수정 가능)
import { parseWeekdays, parseDate, parseCancellations, getKoreaNow } from './week';

/** 이번 달(오늘 기준) 그 반의 수업일 수: { total, remaining }
 *  - total: 이번 달 전체 수업일 (수업요일 & 휴강 제외, 반 시작일 이전은 제외)
 *  - remaining: 오늘 포함 이후 남은 수업일
 */
export function monthSessions(cls, today = getKoreaNow()) {
  const weekdays = parseWeekdays(cls['수업요일'] || '');
  const cancellations = parseCancellations(cls['휴강기록'] || '');
  const startDate = parseDate(cls['시작일'] || '');
  if (weekdays.length === 0) return { total: 0, remaining: 0 };

  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  let total = 0;
  let remaining = 0;
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d);
    if (!weekdays.includes(date.getDay())) continue;
    if (startDate && date < startDate) continue;
    if (cancellations.some((c) => c.getFullYear() === year && c.getMonth() === month && c.getDate() === d)) continue;
    total += 1;
    if (d >= today.getDate()) remaining += 1;
  }
  return { total, remaining };
}

/** 첫 달 수강료: { amount, basis }  basis = 문구에 붙일 근거 텍스트('' 이면 정액) */
export function firstMonthFee(cls, today = getKoreaNow()) {
  const monthly = parseInt(String(cls['월수강료'] || '').replace(/[^0-9]/g, ''), 10) || 0;
  if (!monthly) return { amount: 0, basis: '' };
  const startDate = parseDate(cls['시작일'] || '');
  // 개강 전 합류 → 정액
  if (startDate && startDate > today) return { amount: monthly, basis: '' };
  const { total, remaining } = monthSessions(cls, today);
  if (total === 0 || remaining >= total) return { amount: monthly, basis: '' };
  if (remaining === 0) return { amount: monthly, basis: '다음 달부터 수업 시작 기준' };
  const raw = (monthly * remaining) / total;
  const amount = Math.round(raw / 100) * 100;
  return { amount, basis: `이번 달 ${total}회 중 ${remaining}회 수업` };
}

export function formatWon(n) {
  return (parseInt(n, 10) || 0).toLocaleString('ko-KR') + '원';
}
