'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TeacherLevelTestPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/leveltest-results?includeSent=true')
      .then((r) => r.json())
      .then((j) => {
        setResults(j.results || []);
        setError(j.error);
        setIsDemo(j.demo);
        setLoading(false);
      })
      .catch(() => {
        setError('데이터를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, []);

  const [marked, setMarked] = useState('');

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // 복사하면 발송여부 자동 처리 + 목록에서도 즉시 제거 (되돌리기 누르면 다시 살아남)
    if (selected && !isDemo && !String(selected['발송여부'] || '').trim()) {
      markSent(selected, '완료');
      moveToDone(selected);
    }
  };

  // 처리완료 = 목록에서 지우지 않고 아래 '처리완료' 목록으로 이동 (2026-09-25)
  const moveToDone = (row) => {
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const stamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    setResults((list) => list.map((x) => (x === row ? { ...x, 발송여부: `완료 ${stamp}` } : x)));
    setSelected((sel) => (sel === row ? { ...sel, 발송여부: `완료 ${stamp}` } : sel));
  };
  const moveBack = (row) => {
    setResults((list) => list.map((x) => (x['전화번호'] === row['전화번호'] && x['제출일시'] === row['제출일시'] ? { ...x, 발송여부: '' } : x)));
  };

  // 등록 여부 손 체크 — 자동 대조보다 우선, 시트 '등록 여부' 열에 저장
  const [savingEnroll, setSavingEnroll] = useState('');
  const setEnrolled = async (row, enrolled) => {
    const key = `${row['전화번호']}|${row['제출일시']}`;
    setSavingEnroll(key);
    const value = enrolled ? '등록' : '미등록';
    setResults((list) => list.map((x) => (x === row ? { ...x, 등록됨: enrolled, 등록여부수동: value } : x)));
    if (!isDemo) {
      const res = await fetch('/api/leveltest-results', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: row['전화번호'], 제출일시: row['제출일시'], value, field: '등록여부' }),
      });
      const j = await res.json();
      if (!j.ok) setError('등록 여부 저장 실패: ' + j.error);
    }
    setSavingEnroll('');
  };
  const [openMonths, setOpenMonths] = useState(null); // null = 이번 달만 펼침

  const markSent = async (row, value) => {
    setMarked('처리 중...');
    const res = await fetch('/api/leveltest-results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: row['전화번호'], 제출일시: row['제출일시'], value }),
    });
    const j = await res.json();
    setMarked(j.ok ? (value ? '발송 처리됨 — 목록에서 사라져요' : '발송 처리 취소됨') : '자동 처리 실패: ' + j.error);
  };

  const sheetLink = process.env.NEXT_PUBLIC_LEVELTEST_SHEET_LINK || '';

  if (loading) {
    return <main className="container"><div className="empty">불러오는 중...</div></main>;
  }

  // 상세 보기
  if (selected) {
    const phone = selected['전화번호'] || '';
    const studentName = String(selected['이름'] || '').trim();
    const full = String(selected['리포트전문'] || '');
    const summary = full.split('\n\n')[0] || '';

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/leveltest/result?phone=${encodeURIComponent(phone)}`;

    const kakaoText = `${studentName ? `${studentName} 학생의 ` : ''}알유띵킹 레벨테스트 결과: ${summary}

자세한 진단 결과는 아래 링크에서 확인하세요.
${link}`;

    return (
      <main className="container">
        <button className="back-link" onClick={() => setSelected(null)}>← 목록으로</button>

        <h1 className="page-title">{studentName ? `${studentName} (${phone})` : phone}</h1>
        <p className="page-sub">{selected['제출일시']}</p>

        <div className="section-label">카톡으로 보낼 내용</div>
        <div
          className="result-box"
          style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}
        >
          {kakaoText}
        </div>

        <button className="btn" style={{ marginTop: 12 }} onClick={() => copy(kakaoText)}>
          {copied ? '복사됨! 카톡에 붙여넣으세요' : '카톡 발송용 복사하기'}
        </button>
        {marked && (
          <div className="notice" style={{ marginTop: 8, fontSize: 12 }}>
            {marked}
            {marked.startsWith('발송 처리됨') && (
              <button onClick={() => { markSent(selected, ''); moveBack(selected); }} style={{ marginLeft: 8, background: 'none', border: 0, color: 'var(--navy)', textDecoration: 'underline', cursor: 'pointer' }}>되돌리기</button>
            )}
          </div>
        )}

        <a href={link} target="_blank" rel="noopener noreferrer">
          <button className="btn btn-outline" style={{ marginTop: 10 }}>
            학부모가 볼 화면 미리보기
          </button>
        </a>

        {!String(selected['발송여부'] || '').trim() && (
          <button className="btn btn-outline" style={{ marginTop: 10 }}
            onClick={() => {
              if (isDemo) return;
              markSent(selected, '완료');
              moveToDone(selected);
              setSelected(null);
            }}>
            ✅ 처리완료 — 처리완료 목록으로 보내기
          </button>
        )}

        <div className="section-label">전체 리포트 (참고용)</div>
        <div
          className="result-box"
          style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}
        >
          {full}
        </div>

        <div className="notice" style={{ marginTop: 18 }}>
          "카톡 발송용 복사하기"를 누르거나 위 처리완료 버튼을 누르면 <b>발송여부</b>가 처리되고, 아래 처리완료 목록으로 내려갑니다. 실수로 눌렀으면 되돌리기.
        </div>
      </main>
    );
  }

  const nameOf = (r) => (String(r['이름'] || '').trim() ? `${String(r['이름']).trim()} (${r['전화번호']})` : r['전화번호']);
  const pending = results.filter((r) => !String(r['발송여부'] || '').trim());
  const done = results.filter((r) => String(r['발송여부'] || '').trim());
  const enrolledCount = done.filter((r) => r.등록됨).length;
  const monthOf = (r) => String(r['제출일시'] || '').slice(0, 7) || '날짜 없음';
  const monthMap = new Map();
  for (const r of done) monthMap.set(monthOf(r), [...(monthMap.get(monthOf(r)) || []), r]);
  const months = [...monthMap.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)); // 최신 달 먼저
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const thisMonth = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;

  return (
    <main className="container">
      <Link href="/teacher" className="back-link">← 선생님 페이지로</Link>

      <h1 className="page-title">레벨테스트 결과함</h1>
      <p className="page-sub">대기 중 {pending.length}건 · 처리완료 {done.length}건</p>

      {isDemo && (
        <div className="notice">
          지금은 예시 데이터로 보고 있어요. 레벨테스트 결과 시트를 연결하면 실제 결과가 나타납니다.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {pending.length === 0 ? (
        <div className="empty">처리할 레벨테스트가 없어요.</div>
      ) : (
        <div className="card-list">
          {pending.map((r, i) => (
            <button key={i} className="card" onClick={() => setSelected(r)}>
              <div className="card-icon" style={{ background: 'var(--teal)', fontSize: 18 }}>📋</div>
              <div>
                <div className="card-title">{nameOf(r)}</div>
                <div className="card-desc">{r['제출일시']}</div>
              </div>
              <div className="card-arrow">→</div>
            </button>
          ))}
        </div>
      )}

      {/* 처리완료 목록 (2026-09-25): 월별 접기, 등록 여부 체크 = 학생명단 자동 대조 + 손 체크 우선 */}
      {done.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 28 }}>
            처리완료 {done.length}건 · 등록 {enrolledCount}명 ({done.length ? Math.round((enrolledCount / done.length) * 100) : 0}%)
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--light)', margin: '0 0 10px' }}>
            체크 = 학생명단에 같은 학부모 번호가 있으면 자동으로 켜져요. 다르면 직접 바꿔주세요(그 값이 우선). 자세한 전환율은 전환율 화면에서.
          </p>
          {months.map(([month, list]) => {
            const opened = openMonths ? openMonths.includes(month) : month === thisMonth;
            const cnt = list.filter((r) => r.등록됨).length;
            return (
              <div key={month} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setOpenMonths((prev) => {
                    const base = prev || [thisMonth];
                    return base.includes(month) ? base.filter((m) => m !== month) : [...base, month];
                  })}
                  style={{ width: '100%', textAlign: 'left', background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}
                >
                  {opened ? '▾' : '▸'} {month.replace('-', '년 ')}월 · {list.length}건 · 등록 {cnt}명
                </button>
                {opened && (
                  <div style={{ padding: '6px 4px 0' }}>
                    {list.map((r, i) => {
                      const key = `${r['전화번호']}|${r['제출일시']}`;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                          <input
                            type="checkbox"
                            checked={!!r.등록됨}
                            disabled={savingEnroll === key}
                            onChange={(e) => setEnrolled(r, e.target.checked)}
                            style={{ width: 18, height: 18, accentColor: 'var(--navy)' }}
                            title={r.등록여부수동 ? '직접 체크한 값' : (r.등록반자동 ? '학생명단 자동 대조' : '')}
                          />
                          <button onClick={() => setSelected(r)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--dark)', fontSize: 14 }}>
                            <span style={{ fontWeight: 700 }}>{nameOf(r)}</span>
                            <span style={{ color: 'var(--light)', marginLeft: 8, fontSize: 12.5 }}>{String(r['제출일시'] || '').slice(0, 10)}</span>
                            <span style={{ marginLeft: 8, fontSize: 12.5, color: r.등록됨 ? 'var(--teal)' : 'var(--light)' }}>
                              {r.등록됨 ? `등록 완료${r.등록반자동 ? ` (${r.등록반자동})` : ''}` : '미등록'}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {sheetLink && (
        <>
          <div className="section-label">원본 시트</div>
          <a href={sheetLink} target="_blank" rel="noopener noreferrer">
            <button className="btn btn-outline">레벨테스트 결과 시트 열기</button>
          </a>
        </>
      )}
    </main>
  );
}
