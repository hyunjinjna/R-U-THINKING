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

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sheetLink = process.env.NEXT_PUBLIC_LEVELTEST_SHEET_LINK || '';

  if (loading) {
    return <main className="container"><div className="empty">불러오는 중...</div></main>;
  }

  // 상세 보기
  if (selected) {
    return (
      <main className="container">
        <button className="back-link" onClick={() => setSelected(null)}>← 목록으로</button>

        <h1 className="page-title">{selected['전화번호']}</h1>
        <p className="page-sub">{selected['제출일시']}</p>

        <div
          className="result-box"
          style={{ fontSize: 16, lineHeight: 2 }}
        >
          {selected['리포트전문']}
        </div>

        <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => copy(selected['리포트전문'])}>
          {copied ? '복사됨! 카톡에 붙여넣으세요' : '리포트 복사하기'}
        </button>

        <div className="notice" style={{ marginTop: 18 }}>
          복사한 뒤 <b>{selected['전화번호']}</b> 번호로 카카오톡을 보내주세요.
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
                <div className="card-title">{r['전화번호']}</div>
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
