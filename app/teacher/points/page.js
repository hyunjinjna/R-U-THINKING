'use client';
// 코치: 포인트 교환 신청 처리 — 아이가 신청한 상품을 실제로 주고 [지급 완료]를 누르면 차감 확정
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PointsAdminPage() {
  const [pending, setPending] = useState([]);
  const [done, setDone] = useState([]);
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = () => {
    fetch('/api/points-admin').then((r) => r.json()).then((j) => {
      setPending(j.pending || []); setDone(j.done || []); setWarning(j.warning || j.error || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const complete = async (row) => {
    setSaving(row._row);
    await fetch('/api/points-admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _row: row._row }),
    });
    setSaving(null);
    load();
  };

  return (
    <main className="container">
      <Link href="/teacher" className="back-link">← 선생님 홈</Link>
      <h1 className="page-title">포인트 교환 신청</h1>
      <p className="page-sub">아이에게 상품을 준 다음 [지급 완료]를 누르면 포인트가 차감됩니다.</p>

      {warning && <div className="notice" style={{ marginBottom: 14 }}>{warning}</div>}

      {loading ? <div className="empty">불러오는 중...</div> : (
        <>
          {pending.length === 0 ? <div className="empty">처리할 교환 신청이 없어요.</div> : (
            <div className="card-list">
              {pending.map((x) => (
                <div key={x._row} className="card" style={{ cursor: 'default' }}>
                  <div className="card-icon" style={{ background: 'var(--yellow)', color: '#fff' }}>🎁</div>
                  <div style={{ flex: 1 }}>
                    <div className="card-title">{x['이름']} — {x['상품']}</div>
                    <div className="card-desc">{x['가격']}P · {x['시각']}</div>
                  </div>
                  <button className="btn" style={{ width: 'auto', padding: '8px 14px', fontSize: 13, flexShrink: 0 }}
                    onClick={() => complete(x)} disabled={saving === x._row}>
                    {saving === x._row ? '...' : '지급 완료'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: 22 }}>지급 완료 (최근)</div>
              <div className="card-list">
                {done.map((x) => (
                  <div key={x._row} className="card" style={{ cursor: 'default', opacity: 0.7 }}>
                    <div className="card-icon" style={{ background: 'var(--teal)' }}>✓</div>
                    <div style={{ flex: 1 }}>
                      <div className="card-title" style={{ fontSize: 15 }}>{x['이름']} — {x['상품']} ({x['가격']}P)</div>
                      <div className="card-desc">{x['지급여부']}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
