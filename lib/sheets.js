// 구글 스프레드시트를 CSV로 읽어오는 유틸리티
// 시트는 "파일 > 공유 > 웹에 게시" 상태여야 합니다.

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char !== '\r') {
        field += char;
      }
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function rowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map((h) => (h || '').trim());

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell && cell.trim() !== ''))
    .map((row) => {
      const obj = {};
      headers.forEach((header, i) => {
        if (header) obj[header] = (row[i] || '').trim();
      });
      return obj;
    });
}

export async function fetchSheet(url) {
  if (!url) {
    return { error: '시트 URL이 설정되지 않았습니다.', data: [] };
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      return {
        error: `시트를 불러올 수 없습니다 (${res.status}). "웹에 게시" 설정을 확인해주세요.`,
        data: [],
      };
    }

    const text = await res.text();

    if (text.trim().startsWith('<')) {
      return {
        error: '시트가 CSV로 게시되지 않았습니다. "파일 > 공유 > 웹에 게시"에서 CSV 형식을 선택해주세요.',
        data: [],
      };
    }

    return { data: rowsToObjects(parseCSV(text)), error: null };
  } catch (err) {
    return { error: '시트 연결 실패: ' + err.message, data: [] };
  }
}
