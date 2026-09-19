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

// ===== 아래는 통합 대시보드용 확장 (읽기/여러 줄 쓰기/셀 수정) =====

function getSheetsClient() {
  const credentials = getCredentials();
  if (!credentials) return null;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function colLetter(n) {
  let s = '';
  n = n + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * 탭 전체를 읽어 헤더 기준 객체 배열로 반환.
 * CSV "웹에 게시"는 최대 5분 캐시가 있어서, 방금 쓴 값을 바로 봐야 하는
 * 대시보드류는 이 함수로 서비스 계정을 통해 직접 읽는다.
 * 탭이 없으면 { ok: true, rows: [], headers: [] }.
 */
export async function readTab(spreadsheetId, sheetName) {
  const sheets = getSheetsClient();
  if (!sheets) return { ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다.', rows: [], headers: [] };
  if (!spreadsheetId) return { ok: false, error: '스프레드시트 ID를 찾을 수 없습니다.', rows: [], headers: [] };
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
    const values = res.data.values || [];
    if (values.length === 0) return { ok: true, rows: [], headers: [], raw: [] };
    const headers = values[0].map((h) => String(h || '').trim());
    const rows = values.slice(1).map((r, i) => {
      const obj = { _row: i + 2 };
      headers.forEach((h, j) => { if (h) obj[h] = String(r[j] ?? '').trim(); });
      return obj;
    }).filter((o) => Object.keys(o).some((k) => k !== '_row' && o[k] !== ''));
    return { ok: true, rows, headers, raw: values };
  } catch (err) {
    // 탭이 없을 때는 빈 결과로 취급
    if (/Unable to parse range|not found/i.test(err.message)) {
      return { ok: true, rows: [], headers: [], raw: [], missing: true };
    }
    return { ok: false, error: err.message, rows: [], headers: [] };
  }
}

async function ensureTab(sheets, spreadsheetId, sheetName, headers) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = (meta.data.sheets || []).some((s) => s.properties.title === sheetName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }
}

/**
 * 여러 줄 추가. 탭이 없으면 헤더와 함께 만든다.
 */
export async function appendRows(spreadsheetId, sheetName, headers, rowsAsObjects) {
  const sheets = getSheetsClient();
  if (!sheets) return { ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다.' };
  if (!spreadsheetId) return { ok: false, error: '스프레드시트 ID를 찾을 수 없습니다.' };
  try {
    await ensureTab(sheets, spreadsheetId, sheetName, headers);
    const values = rowsAsObjects.map((o) => headers.map((h) => o[h] ?? ''));
    if (values.length === 0) return { ok: true, count: 0 };
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    return { ok: true, count: values.length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * 헤더 기준으로 특정 행(1부터 세는 시트 행 번호)을 통째로 덮어쓰기
 */
export async function updateRow(spreadsheetId, sheetName, headers, rowNumber, obj) {
  const sheets = getSheetsClient();
  if (!sheets) return { ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다.' };
  try {
    const values = [headers.map((h) => obj[h] ?? '')];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowNumber}:${colLetter(headers.length - 1)}${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * 셀 하나 수정 (헤더 이름으로 열을 찾음)
 */
export async function updateCell(spreadsheetId, sheetName, rowNumber, headerName, value) {
  const sheets = getSheetsClient();
  if (!sheets) return { ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다.' };
  try {
    const head = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!1:1` });
    const headers = (head.data.values || [[]])[0].map((h) => String(h || '').trim());
    let col = headers.indexOf(headerName);
    if (col < 0) {
      // 열이 없으면 맨 끝에 헤더 추가
      col = headers.length;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${colLetter(col)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [[headerName]] },
      });
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${colLetter(col)}${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * (키 컬럼들이 같은 행이 있으면 수정, 없으면 추가)
 * @param {string[]} keyHeaders 예: ['날짜','반이름','이름']
 */
export async function upsertRows(spreadsheetId, sheetName, headers, keyHeaders, rowsAsObjects) {
  const sheets = getSheetsClient();
  if (!sheets) return { ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다.' };
  if (!spreadsheetId) return { ok: false, error: '스프레드시트 ID를 찾을 수 없습니다.' };
  try {
    await ensureTab(sheets, spreadsheetId, sheetName, headers);
    const existing = await readTab(spreadsheetId, sheetName);
    if (!existing.ok) return existing;
    // 시트에 이미 있는 헤더 순서를 따르되, 새 헤더가 있으면 뒤에 붙인다
    const finalHeaders = [...existing.headers.filter(Boolean)];
    headers.forEach((h) => { if (!finalHeaders.includes(h)) finalHeaders.push(h); });
    if (finalHeaders.length !== existing.headers.filter(Boolean).length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `${sheetName}!A1`, valueInputOption: 'RAW',
        requestBody: { values: [finalHeaders] },
      });
    }
    const keyOf = (o) => keyHeaders.map((k) => String(o[k] ?? '').trim()).join('|');
    const index = new Map(existing.rows.map((r) => [keyOf(r), r]));
    const toAppend = [];
    let updated = 0;
    for (const obj of rowsAsObjects) {
      const found = index.get(keyOf(obj));
      if (found) {
        const merged = { ...found, ...obj };
        const r = await updateRow(spreadsheetId, sheetName, finalHeaders, found._row, merged);
        if (!r.ok) return r;
        updated++;
      } else {
        toAppend.push(obj);
      }
    }
    if (toAppend.length > 0) {
      const values = toAppend.map((o) => finalHeaders.map((h) => o[h] ?? ''));
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `${sheetName}!A:Z`, valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS', requestBody: { values },
      });
    }
    return { ok: true, updated, appended: toAppend.length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
