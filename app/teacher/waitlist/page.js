'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WaitlistPage() {
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [sortMode, setSortMode] = useState('slot'); // slot | newest | oldest

  useEffect(() => {
    fetch('/api/waitlist')
      .then((r) => r.json())
      .then((j) => {
        setWaitlist(j.waitlist || []);
        setError(j.error);
        setIsDemo(j.demo);
        setLoading(false);
      })
      .catch(() => {
        setError('데이터를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <main className="container"><div className="empty">불러오는 중...</div></main>;
  }

  const sheetLink = process.env.NEXT_PUBLIC_WAITLIST_SHEET_LINK || '';

  // 슬롯별 그룹핑
  const grouped = {};
  for (const w of waitlist) {
    const key = `${w['레벨'] || ''}|${w['수업요일'] || ''}|${w['수업시간'] || ''}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  }

  const sortedFlat = [...waitlist].sort((a, b) => {
    const ta = String(a['타임스탬프'] || a['제출일시'] || '');
    const tb = String(b['타임스탬프'] || b['제출일시'] || '');
    return sortMode === 'newest' ? tb.localeCompare(ta) : ta.localeCompare(tb);
  });

  const btnStyle = (active) => ({
    flex: 1,
    padding: '10px 8px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: `2px solid ${active ? 'var(--navy)' : 'var(--border)'}`,
    background: active ? 'var(--navy)' : '#fff',
    color: active ? '#fff' : 'var(--med)',
    cursor: 'pointer',
  });

  return (
    <main className="container">
      <Link href="/teacher" className="back-link">← 선생님 페이지로</Link>

      <h1 className="page-title">대기 신청 목록</h1>
      <p className="page-sub">대기 중 {waitlist.length}명</p>

      {isDemo && (
        <div className="notice">
          지금은 예시 데이터로 보고 있어요. 대기 신청 시트를 연결하면 실제 신청이 나타납니다.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={btnStyle(sortMode === 'slot')} onClick={() => setSortMode('slot')}>
          슬롯별
        </button>
        <button style={btnStyle(sortMode === 'newest')} onClick={() => setSortMode('newest')}>
          최신순
        </button>
        <button style={btnStyle(sortMode === 'oldest')} onClick={() => setSortMode('oldest')}>
          오래된순
        </button>
      </div>

      {waitlist.length === 0 ? (
        <div className="empty">대기 중인 신청이 없어요.</div>
      ) : sortMode === 'slot' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {Object.entries(grouped).map(([key, people]) => {
            const [레벨, 요일, 시간] = key.split('|');
            return (
              <div key={key}>
                <div
                  style={{
                    background: 'var(--navy)',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: '10px 10px 0 0',
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {레벨} · {요일} {시간}
                  <span style={{ float: 'right', opacity: 0.85, fontSize: 13 }}>
                    대기 {people.length}명
                  </span>
                </div>
                <div style={{ border: '2px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                  {people.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '14px 16px',
                        borderBottom: i < people.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <span style={{ color: 'var(--med)', fontWeight: 700, fontSize: 14 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{p['이름']}</div>
                        <div style={{ fontSize: 13, color: 'var(--med)' }}>{p['연락처'] || ''}</div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--light)' }}>
                        {p['타임스탬프'] || p['제출일시'] || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-list">
          {sortedFlat.map((p, i) => (
            <div key={i} className="card" style={{ cursor: 'default' }}>
              <div className="card-icon" style={{ background: 'var(--yellow)', fontSize: 16 }}>⏳</div>
              <div style={{ flex: 1 }}>
                <div className="card-title">{p['이름']}</div>
                <div className="card-desc">
                  {p['레벨']} · {p['수업요일']} {p['수업시간']}
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--light)' }}>
                {p['타임스탬프'] || p['제출일시'] || ''}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="notice" style={{ marginTop: 22 }}>
        반에 배정하셨으면 대기 신청 시트의 <b>처리여부</b> 칸에 "완료"라고 적어주세요.
        완료 표시된 건은 이 목록과 대기 인원 카운트에서 자동으로 빠집니다.
      </div>

      {sheetLink && (
        <a href={sheetLink} target="_blank" rel="noopener noreferrer">
          <button className="btn btn-outline" style={{ marginTop: 12 }}>대기 신청 시트 열기</button>
        </a>
      )}
    </main>
  );
}
