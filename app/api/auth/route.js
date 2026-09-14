export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { password } = await request.json();
  const correct = process.env.TEACHER_PASSWORD || 'ruthinking';

  if (password === correct) {
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: '비밀번호가 맞지 않습니다.' });
}
