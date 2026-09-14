'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COLORS = [
  'var(--navy)',
  'var(--teal)',
  'var(--yellow)',
  'var(--pink)',
  'var(--purple)',
  'var(--red)',
];

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetch('/api/resources')
      .then((r) => r.json())
      .then((json) => {
        setResources(json.resources || []);
        setError(json.error);
        setIsDemo(json.demo);
        setLoading(false);
      })
      .catch(() => {
        setError('자료를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, []);

  const sheetLink = process.env.NEXT_PUBLIC_RESOURCES_SHEET_LINK || '';

  if (loading) {
    return (
      <main className="container">
        <div className="empty">불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="container">
      <Link href="/teacher" className="back-link">
        ← 선생님 페이지로
      </Link>

      <h1 className="page-title">코치 자료</h1>
      <p className="page-sub">수업에 필요한 자료들</p>

      {isDemo && (
        <div className="notice">
          지금은 예시 데이터로 보고 있어요. 코치 자료 시트를 연결하면 실제 자료가 나타납니다.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {resources.length === 0 ? (
        <div className="empty">등록된 자료가 없어요.</div>
      ) : (
        <div className="card-list">
          {resources.map((r, i) => (
            <a
              key={i}
              href={r['링크'] || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="card"
            >
              <div
                className="card-icon"
                style={{ background: COLORS[i % COLORS.length] }}
              >
                {r['이모지'] || '📄'}
              </div>
              <div>
                <div className="card-title">{r['자료이름']}</div>
                {r['설명'] && <div className="card-desc">{r['설명']}</div>}
              </div>
              <div className="card-arrow">→</div>
            </a>
          ))}
        </div>
      )}

      <div className="section-label">자료 추가하기</div>

      <div className="notice">
        코치 자료 시트에 행을 추가하면 여기에 자동으로 버튼이 생깁니다.
        <br />
        <b>자료이름 · 링크 · 설명 · 이모지</b> 네 칸을 채우면 됩니다.
      </div>

      <a href={sheetLink} target="_blank" rel="noopener noreferrer">
        <button className="btn">코치 자료 시트 열기</button>
      </a>
    </main>
  );
}
