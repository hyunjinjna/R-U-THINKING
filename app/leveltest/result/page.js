'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { gapDescription } from '../../../lib/gapDescriptions';

function ResultContent() {
  const params = useSearchParams();
  const phone = params.get('phone') || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!phone) {
      setError('전화번호 정보가 없습니다. 안내받으신 링크로 다시 들어와주세요.');
      setLoading(false);
      return;
    }
    fetch(`/api/leveltest-results?phone=${encodeURIComponent(phone)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else if (!j.results || j.results.length === 0) {
          setError('결과를 찾을 수 없습니다. 선생님께 문의해주세요.');
        } else {
          setData(j.results[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('결과를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, [phone]);

  if (loading) {
    return <main className="container"><div className="empty">불러오는 중...</div></main>;
  }

  if (error) {
    return (
      <main className="container">
        <div className="logo-row">
          <img src="/logo.png" alt="R U Thinking?" className="site-logo" />
          <span className="badge">R U Thinking?</span>
        </div>
        <div className="error-box" style={{ marginTop: 20 }}>{error}</div>
      </main>
    );
  }

  // 시트 열에서 영역별 정보 구성
  const areas = [
    { name: '리딩', 반: data['리딩추천반'], 구멍: data['리딩구멍'], emoji: '📖', color: 'var(--teal)' },
    { name: '단어', 반: data['단어추천반'], 구멍: data['단어구멍'], emoji: '🔤', color: 'var(--yellow)' },
    { name: '문법', 반: data['문법추천반'], 구멍: data['문법구멍'], emoji: '✏️', color: 'var(--pink)' },
  ].filter((a) => a.반 && String(a.반).trim());

  const phonics = data['파닉스결과'];

  // 리포트전문에서 요약/코멘트 분리 (첫 문단 = 요약, 두번째 문단 = 코멘트)
  const full = String(data['리포트전문'] || '');
  const beforeSections = full.split('\n\n[')[0];
  const paragraphs = beforeSections.split('\n\n').filter((p) => p.trim());
  const summary = paragraphs[0] || '';
  const comment = paragraphs.slice(1).join('\n\n');

  const recommendedLevels = areas.map((a) => a.반).filter(Boolean).join('|');

  return (
    <main className="container">
      <div className="logo-row">
        <img src="/logo.png" alt="알유띵킹 어학원" className="site-logo" />
        <span className="badge">레벨테스트 결과</span>
      </div>

      {String(data['이름'] || '').trim() && (
        <h1 className="page-title" style={{ marginTop: 14, fontSize: 22 }}>
          {String(data['이름']).trim()} 학생의 진단 결과
        </h1>
      )}

      {/* 총평 */}
      {summary && (
        <div
          style={{
            background: 'var(--navy)',
            color: '#fff',
            padding: '26px 22px',
            borderRadius: 16,
            marginTop: 18,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10, fontWeight: 700 }}>
            총평
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.6 }}>{summary}</div>
        </div>
      )}

      {/* 전문가 코멘트 */}
      {comment && (
        <div
          style={{
            background: 'var(--card)',
            padding: '22px 20px',
            borderRadius: 14,
            marginBottom: 26,
            borderLeft: '4px solid var(--yellow)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 10 }}>
            선생님 코멘트
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.9, color: 'var(--dark)', whiteSpace: 'pre-wrap' }}>
            {comment}
          </div>
        </div>
      )}

      {/* 파닉스 미통과 시에만 */}
      {phonics && String(phonics).trim() && (
        <div className="notice" style={{ marginBottom: 20 }}>
          <div className="notice-title">파닉스</div>
          {phonics}
        </div>
      )}

      {/* 영역별 결과 */}
      {areas.length > 0 && (
        <>
          <div className="section-label" style={{ fontSize: 15 }}>영역별 진단 결과</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {areas.map((a, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  border: '2px solid var(--border)',
                  borderRadius: 14,
                  padding: '20px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: a.color, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}
                  >
                    {a.emoji}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>
                    {a.name}
                  </div>
                </div>

                {a.구멍 && String(a.구멍).trim() && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, color: 'var(--med)', marginBottom: 6, fontWeight: 700 }}>
                      보완이 필요한 부분
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {String(a.구멍).split(',').map((g, j) => {
                        // 설명 버전은 전화번호+태그 시드로 고정 — 같은 리포트는 새로고침해도 같은 문장, 학생마다는 다양
                        const raw = g.trim();
                        const seed = (phone + raw).split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
                        const desc = gapDescription(raw, seed);
                        return (
                          <div key={j}>
                            <span
                              style={{
                                background: 'var(--soft-red)',
                                color: 'var(--red)',
                                padding: '5px 12px',
                                borderRadius: 999,
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              {raw}
                            </span>
                            {desc && (
                              <div style={{ fontSize: 13.5, color: 'var(--med)', marginTop: 5, paddingLeft: 4, lineHeight: 1.6 }}>
                                {desc}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    background: 'var(--soft-teal)',
                    borderRadius: 10,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--med)', marginBottom: 6, fontWeight: 700 }}>
                    추천 반
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.5 }}>
                    {a.반}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <a
            href={`/register?levels=${encodeURIComponent(recommendedLevels)}`}
            style={{ display: 'block', marginTop: 26 }}
          >
            <button className="btn">추천 수업 등록하러 가기</button>
          </a>
        </>
      )}

      <div className="notice" style={{ marginTop: 24 }}>
        궁금하신 점은 언제든 선생님께 문의해주세요.
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<main className="container"><div className="empty">불러오는 중...</div></main>}>
      <ResultContent />
    </Suspense>
  );
}
