import { fetchSheet } from '../../../lib/sheets';
import {
  SHEET_URLS,
  DEMO_PHONICS_Q,
  DEMO_READING_Q,
  DEMO_VOCA_Q,
  DEMO_GRAMMAR_Q,
  IS_DEMO,
} from '../../../lib/config';

export const dynamic = 'force-dynamic';

const SHEET_KEY_MAP = {
  phonics: 'phonicsQ',
  reading: 'readingQ',
  voca: 'vocaQ',
  grammar: 'grammarQ',
};

const DEMO_MAP = {
  phonics: DEMO_PHONICS_Q,
  reading: DEMO_READING_Q,
  voca: DEMO_VOCA_Q,
  grammar: DEMO_GRAMMAR_Q,
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');

  if (!subject || !SHEET_KEY_MAP[subject]) {
    return Response.json({ error: '올바르지 않은 영역입니다. (phonics/reading/voca/grammar 중 하나)' });
  }

  const sheetKey = SHEET_KEY_MAP[subject];
  const sheetUrl = SHEET_URLS[sheetKey];

  if (IS_DEMO || !sheetUrl) {
    return Response.json({ demo: true, questions: DEMO_MAP[subject], error: null });
  }

  const result = await fetchSheet(sheetUrl);
  return Response.json({
    demo: false,
    questions: result.data || [],
    error: result.error,
  });
}
