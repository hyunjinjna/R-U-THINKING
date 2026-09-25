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
    fetch('/api/leveltest-results')
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
    if (selected && !isDemo) {
      markSent(selected, '완료');
      setResults((list) => list.filter((x) => x !== selected));
    }
  };

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
              <button onClick={() => { markSent(selected, ''); setResults((list) => (list.includes(selected) ? list : [selected, ...list])); }} style={{ marginLeft: 8, background: 'none', border: 0, color: 'var(--navy)', textDecoration: 'underline', cursor: 'pointer' }}>되돌리기</button>
            )}
          </div>
        )}

        <a href={link} target="_blank" rel="noopener noreferrer">
          <button className="btn btn-outline" style={{ marginTop: 10 }}>
            학부모가 볼 화면 미리보기
          </button>
        </a>

        <button className="btn btn-outline" style={{ marginTop: 10 }}
          onClick={() => {
            if (isDemo) return;
            markSent(selected, '완료');
            setResults((list) => list.filter((x) => x !== selected));
            setSelected(null);
          }}>
          ✅ 처리완료 — 목록에서 보내기
        </button>

        <div className="section-label">전체 리포트 (참고용)</div>
        <div
          className="result-box"
          style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}
        >
          {full}
        </div>

        <div className="notice" style={{ marginTop: 18 }}>
          "카톡 발송용 복사하기"를 누르거나 위 처리완료 버튼을 누르면 <b>발송여부</b>가 처리됩니다. 실수로 눌렀으면 되돌리기.
          완료 표시된 건은 이 목록에서 자동으로 사라집니다.
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <Link href="/teacher" className="back-link">← 선생님 페이지로</Link>

      <h1 className="page-title">레벨테스트 결과함</h1>
      <p className="page-sub">제출된 레벨테스트 {results.length}건</p>

      {isDemo && (
        <div className="notice">
          지금은 예시 데이터로 보고 있어요. 레벨테스트 결과 시트를 연결하면 실제 결과가 나타납니다.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {results.length === 0 ? (
        <div className="empty">아직 제출된 레벨테스트가 없어요.</div>
      ) : (
        <div className="card-list">
          {results.map((r, i) => (
            <button key={i} className="card" onClick={() => setSelected(r)}>
              <div className="card-icon" style={{ background: 'var(--teal)', fontSize: 18 }}>📋</div>
              <div>
                <div className="card-title">{String(r['이름'] || '').trim() ? `${String(r['이름']).trim()} (${r['전화번호']})` : r['전화번호']}</div>
                <div className="card-desc">{r['제출일시']}</div>
              </div>
              <div className="card-arrow">→</div>
            </button>
          ))}
        </div>
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
