// 구글 스프레드시트 쓰기 (서비스 계정 인증)
//
// Vercel 환경변수 GOOGLE_SERVICE_ACCOUNT_KEY 에
// 서비스 계정 JSON 키 전체를 문자열로 넣어두면 동작한다.
// 대상 시트에 그 서비스 계정 이메일을 "편집자"로 공유해두어야 한다.

import { google } from 'googleapis';

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  try {
    // 환경변수에 그대로 붙여넣은 JSON 문자열
    return JSON.parse(raw);
  } catch (e) {
    // 혹시 줄바꿈이 이스케이프되어 들어온 경우 한 번 더 시도
    try {
      return JSON.parse(raw.replace(/\n/g, '\\n'));
    } catch (e2) {
      return null;
    }
  }
}

/**
 * 스프레드시트 ID를 편집 링크에서 추출
 * https://docs.google.com/spreadsheets/d/{ID}/edit -> ID
 */
export function extractSheetId(url) {
  if (!url) return null;
  const m = String(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

/**
 * 시트 맨 아래에 한 줄 추가
 * @param {string} spreadsheetId
 * @param {string} sheetName - 탭 이름 (예: '결과')
 * @param {Array} values - 한 행에 들어갈 값 배열
 */
export async function appendRow(spreadsheetId, sheetName, values) {
  const credentials = getCredentials();
  if (!credentials) {
    return { ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다.' };
  }
  if (!spreadsheetId) {
    return { ok: false, error: '스프레드시트 ID를 찾을 수 없습니다.' };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
