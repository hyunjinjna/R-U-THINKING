'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { findTimeConflicts } from '../../lib/adaptive';
import { normalize } from '../../lib/utils';

const CATEGORY_STYLE = {
  파닉스: { color: 'var(--red)', emoji: '🔤' },
  리딩: { color: 'var(--teal)', emoji: '📖' },
  문법: { color: 'var(--yellow)', emoji: '✏️' },
  스피킹: { color: 'var(--pink)', emoji: '🗣️' },
};

function RegisterContent() {
  const searchParams = useSearchParams();
  const recommendedParam = searchParams.get('levels') || '';
  const recommendedLevels = recommendedParam
    ? recommendedParam.split('|').map((s) => s.trim()).filter(Boolean)
    : [];
  const [step, setStep] = useState('category');
  const [category, setCategory] = useState(null);
  const [level, setLevel] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetch('/api/slots')
      .then((r) => r.json())
      .then((j) => {
        setSlots(j.slots || []);
        setError(j.error);
        setIsDemo(j.demo);
        setLoading(false);
        if (recommendedLevels.length > 0) setStep('recommended');
      })
      .catch(() => {
        setError('데이터를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, []);

  const waitlistForm = process.env.NEXT_PUBLIC_WAITLIST_FORM_LINK || '';
  const enrollForm = process.env.NEXT_PUBLIC_ENROLL_FORM_LINK || '';

  const inCart = (s) =>
    cart.some(
      (c) =>
        c['레벨'] === s['레벨'] &&
        c['수업요일'] === s['수업요일'] &&
        c['수업시간'] === s['수업시간']
    );

  const addToCart = (s) => {
    if (inCart(s)) return;
    setCart([...cart, s]);
  };

  const removeFromCart = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const goToLevel = (lv) => {
    const slot = slots.find((s) => s['레벨'] === lv);
    if (slot) {
      setCategory(slot['대분류']);
      setLevel(lv);
      setStep('slots');
    }
  };

  const conflicts = findTimeConflicts(cart);

  if (loading) {
    return <main className="container"><div className="empty">불러오는 중...</div></main>;
  }

  const categories = [...new Set(slots.map((s) => s['대분류']).filter(Boolean))];
  const levelsInCategory = [
    ...new Set(slots.filter((s) => s['대분류'] === category).map((s) => s['레벨'])),
  ];

  let slotsInLevel = slots.filter((s) => s['대분류'] === category && s['레벨'] === level);
  if (onlyAvailable) slotsInLevel = slotsInLevel.filter((s) => s['상태'] === '등록가능');

  // ===== 추천 레벨 시간표 모아보기 (레벨테스트에서 넘어온 경우) =====
  if (step === 'recommended' && recommendedLevels.length > 0) {
    // 추천 레벨명과 일치하는 슬롯들을 레벨별로 묶음
    const groups = recommendedLevels
      .map((lv) => {
        const matched = slots.filter((s) =>
          normalize(String(lv)).includes(normalize(s['레벨'])) ||
          normalize(s['레벨']).includes(normalize(lv))
        );
        return { level: lv, slots: matched };
      })
      .filter((g) => g.slots.length > 0);

    return (
      <main className="container">
        <div className="logo-row">
          <img src="/logo.png" alt="R U Thinking?" className="site-logo" />
          <span className="badge">추천 수업</span>
        </div>
        <h1 className="page-title">추천받으신 수업</h1>
        <p className="page-sub">원하시는 시간대를 골라 담아주세요</p>

        {groups.length === 0 ? (
          <div className="empty">
            추천 레벨에 해당하는 시간표를 찾을 수 없어요.
            <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => setStep('category')}>
              전체 수업 보기
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {groups.map((g, gi) => (
              <div key={gi}>
                <div className="section-label" style={{ fontSize: 15, marginTop: 0 }}>
                  {g.level}
                </div>
                <div className="card-list">
                  {g.slots.map((s, i) => {
                    const open = s['상태'] === '등록가능';
                    const added = inCart(s);
                    return (
                      <div
                        key={i}
                        className="card"
                        style={{
                          cursor: 'default',
                          borderColor: added ? 'var(--navy)' : open ? 'var(--teal)' : 'var(--border)',
                          opacity: open ? 1 : 0.8,
                        }}
                      >
                        <div className="card-icon" style={{ background: open ? 'var(--teal)' : 'var(--light)', fontSize: 13 }}>
                          {open ? '가능' : '마감'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="card-title">{s['수업요일']} {s['수업시간']}</div>
                          <div className="card-desc">
                            {open ? '지금 등록할 수 있어요' : `대기 ${s['대기인원']}/${s['threshold']}명`}
                          </div>
                        </div>
                        <button
                          onClick={() => addToCart(s)}
                          disabled={added}
                          style={{
                            fontSize: 13, fontWeight: 700, padding: '8px 14px',
                            borderRadius: 8, whiteSpace: 'nowrap',
                            cursor: added ? 'default' : 'pointer',
                            background: added ? 'var(--border)' : 'var(--navy)',
                            color: added ? 'var(--med)' : '#fff',
                            border: 'none',
                          }}
                        >
                          {added ? '담김' : '담기'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <button className="btn" style={{ marginTop: 22 }} onClick={() => setStep('cart')}>
            담은 수업 {cart.length}개 보기
          </button>
        )}

        <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => setStep('category')}>
          다른 수업도 둘러보기
        </button>
      </main>
    );
  }

  // ===== 장바구니 화면 =====
  if (step === 'cart') {
    const openItems = cart.filter((c) => c['상태'] === '등록가능');
    const waitItems = cart.filter((c) => c['상태'] !== '등록가능');

    // ===== 구글폼 사전 채우기 =====
    // 등록폼: 과목 / 레벨 / (요일+시간 합쳐서) 각각 별도 필드
    const ENROLL_FIELDS = {
      과목: 'entry.264728761',
      레벨: 'entry.893298491',
      요일시간: 'entry.111945916',
    };

    // 대기폼: 레벨 / 요일 / 시간 각각 별도 필드
    const WAITLIST_FIELDS = {
      레벨: 'entry.743784151',
      요일: 'entry.1937195432',
      시간: 'entry.1294957404',
    };

    const buildUrl = (baseUrl, params) => {
      if (!baseUrl) return null;
      const sep = baseUrl.includes('?') ? '&' : '?';
      const query = Object.entries(params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      return `${baseUrl}${sep}usp=pp_url&${query}`;
    };

    const makeEnrollLink = (items) =>
      buildUrl(enrollForm, {
        [ENROLL_FIELDS.과목]: items.map((i) => i['대분류'] || '').join(', '),
        [ENROLL_FIELDS.레벨]: items.map((i) => i['레벨'] || '').join(', '),
        [ENROLL_FIELDS.요일시간]: items
          .map((i) => `${i['수업요일'] || ''} ${i['수업시간'] || ''}`.trim())
          .join(', '),
      });

    const makeWaitlistLink = (items) =>
      buildUrl(waitlistForm, {
        [WAITLIST_FIELDS.레벨]: items.map((i) => i['레벨'] || '').join(', '),
        [WAITLIST_FIELDS.요일]: items.map((i) => i['수업요일'] || '').join(', '),
        [WAITLIST_FIELDS.시간]: items.map((i) => i['수업시간'] || '').join(', '),
      });

    return (
      <main className="container">
        <button className="back-link" onClick={() => setStep('category')}>← 계속 담기</button>

        <h1 className="page-title">선택한 수업</h1>
        <p className="page-sub">{cart.length}개 담김</p>

        {conflicts.length > 0 && (
          <div className="error-box" style={{ fontSize: 15, lineHeight: 1.8 }}>
            {conflicts.map((c, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <b>{c.a['레벨']}</b>({c.days} {c.time})과{' '}
                <b>{c.b['레벨']}</b>({c.days} {c.time}) 시간이 겹쳐요.
                <br />
                둘 중 하나를 다른 시간대로 바꿔주세요.
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => goToLevel(c.a['레벨'])}
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 700,
                      borderRadius: 8, border: '1px solid var(--navy)',
                      background: '#fff', color: 'var(--navy)', cursor: 'pointer',
                    }}
                  >
                    {c.a['레벨']} 시간 바꾸기
                  </button>
                  <button
                    onClick={() => goToLevel(c.b['레벨'])}
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 700,
                      borderRadius: 8, border: '1px solid var(--navy)',
                      background: '#fff', color: 'var(--navy)', cursor: 'pointer',
                    }}
                  >
                    {c.b['레벨']} 시간 바꾸기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {cart.length === 0 && <div className="empty">아직 담은 수업이 없어요.</div>}

        {/* 등록 가능한 수업 */}
        {openItems.length > 0 && (
          <>
            <div className="section-label" style={{ color: 'var(--teal)', fontSize: 14 }}>
              지금 등록 가능 ({openItems.length}개)
            </div>
            <div className="card-list">
              {openItems.map((c, i) => (
                <div key={i} className="card" style={{ cursor: 'default', borderColor: 'var(--teal)' }}>
                  <div className="card-icon" style={{ background: 'var(--teal)', fontSize: 13 }}>가능</div>
                  <div style={{ flex: 1 }}>
                    <div className="card-title">{c['레벨']}</div>
                    <div className="card-desc">{c['수업요일']} {c['수업시간']}</div>
                  </div>
                  <button
                    onClick={() => removeFromCart(cart.indexOf(c))}
                    style={{ background: 'none', border: 'none', color: 'var(--med)', fontSize: 20, cursor: 'pointer', padding: '0 6px' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {conflicts.length === 0 && enrollForm && (
              <a href={makeEnrollLink(openItems)} target="_blank" rel="noopener noreferrer">
                <button className="btn" style={{ marginTop: 12 }}>
                  {openItems.length}개 수업 등록하기
                </button>
              </a>
            )}
          </>
        )}

        {/* 대기 필요한 수업 */}
        {waitItems.length > 0 && (
          <>
            <div className="section-label" style={{ color: 'var(--med)', fontSize: 14 }}>
              대기 신청 필요 ({waitItems.length}개)
            </div>
            <div className="card-list">
              {waitItems.map((c, i) => (
                <div key={i} className="card" style={{ cursor: 'default', opacity: 0.85 }}>
                  <div className="card-icon" style={{ background: 'var(--light)', fontSize: 13 }}>마감</div>
                  <div style={{ flex: 1 }}>
                    <div className="card-title">{c['레벨']}</div>
                    <div className="card-desc">
                      {c['수업요일']} {c['수업시간']} · 대기 {c['대기인원']}/{c['threshold']}명
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(cart.indexOf(c))}
                    style={{ background: 'none', border: 'none', color: 'var(--med)', fontSize: 20, cursor: 'pointer', padding: '0 6px' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {conflicts.length === 0 && waitlistForm && (
              <a href={makeWaitlistLink(waitItems)} target="_blank" rel="noopener noreferrer">
                <button className="btn btn-outline" style={{ marginTop: 12 }}>
                  {waitItems.length}개 수업 대기 신청하기
                </button>
              </a>
            )}
          </>
        )}

        {cart.length > 0 && conflicts.length === 0 && (
          <div className="notice" style={{ marginTop: 20 }}>
            신청서에 선택하신 수업 정보가 미리 입력되어 있어요. 이름과 연락처만 적어주시면 됩니다.
          </div>
        )}
      </main>
    );
  }

  // ===== 3단계: 시간표 =====
  if (step === 'slots' && level) {
    const availableCount = slots.filter(
      (s) => s['대분류'] === category && s['레벨'] === level && s['상태'] === '등록가능'
    ).length;

    return (
      <main className="container">
        <button className="back-link" onClick={() => setStep('level')}>← 레벨 목록으로</button>

        <h1 className="page-title">{level}</h1>
        <p className="page-sub">지금 등록 가능한 시간대 {availableCount}개</p>

        <label
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: onlyAvailable ? 'var(--soft-teal)' : 'var(--card)',
            border: `2px solid ${onlyAvailable ? 'var(--teal)' : 'var(--border)'}`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 18,
            cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--navy)',
          }}
        >
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
            style={{ width: 18, height: 18, margin: 0 }}
          />
          지금 가능한 시간대만 보기
        </label>

        {slotsInLevel.length === 0 ? (
          <div className="empty">
            {onlyAvailable ? '지금 등록 가능한 시간대가 없어요.' : '등록된 시간대가 없어요.'}
          </div>
        ) : (
          <div className="card-list">
            {slotsInLevel.map((s, i) => {
              const open = s['상태'] === '등록가능';
              const added = inCart(s);
              return (
                <div
                  key={i}
                  className="card"
                  style={{
                    cursor: 'default',
                    borderColor: added ? 'var(--navy)' : open ? 'var(--teal)' : 'var(--border)',
                    opacity: open ? 1 : 0.8,
                  }}
                >
                  <div className="card-icon" style={{ background: open ? 'var(--teal)' : 'var(--light)', fontSize: 13 }}>
                    {open ? '가능' : '마감'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="card-title">{s['수업요일']} {s['수업시간']}</div>
                    <div className="card-desc">
                      {open ? (
                        '지금 등록할 수 있어요'
                      ) : s['정원도달'] ? (
                        <span style={{ color: 'var(--red)', fontWeight: 700 }}>
                          대기 {s['대기인원']}명 — 곧 신규반이 열릴 예정이에요
                        </span>
                      ) : (
                        `대기 ${s['대기인원']}/${s['threshold']}명`
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(s)}
                    disabled={added}
                    style={{
                      fontSize: 13, fontWeight: 700, padding: '8px 14px',
                      borderRadius: 8, whiteSpace: 'nowrap', cursor: added ? 'default' : 'pointer',
                      background: added ? 'var(--border)' : 'var(--navy)',
                      color: added ? 'var(--med)' : '#fff',
                      border: 'none',
                    }}
                  >
                    {added ? '담김' : '담기'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {cart.length > 0 && (
          <button className="btn" style={{ marginTop: 20 }} onClick={() => setStep('cart')}>
            담은 수업 {cart.length}개 보기
          </button>
        )}

        <div className="notice" style={{ marginTop: 22 }}>
          마감된 시간대도 <b>담기</b> 후 대기 신청하실 수 있어요. 대기 인원이 모이면 같은 시간대에
          새로운 반을 열어드립니다.
        </div>
      </main>
    );
  }

  // ===== 2단계: 레벨 =====
  if (step === 'level' && category) {
    const style = CATEGORY_STYLE[category] || { color: 'var(--navy)', emoji: '📘' };

    return (
      <main className="container">
        <button className="back-link" onClick={() => setStep('category')}>← 처음으로</button>

        <h1 className="page-title">{category}</h1>
        <p className="page-sub">상담받으신 레벨을 선택해주세요</p>

        <div className="card-list">
          {levelsInCategory.map((lv) => {
            const openCount = slots.filter((s) => s['레벨'] === lv && s['상태'] === '등록가능').length;
            return (
              <button key={lv} className="card" onClick={() => { setLevel(lv); setStep('slots'); }}>
                <div className="card-icon" style={{ background: style.color }}>{style.emoji}</div>
                <div>
                  <div className="card-title">{lv}</div>
                  <div className="card-desc">
                    {openCount > 0 ? `등록 가능 ${openCount}개 시간대` : '현재 대기만 가능'}
                  </div>
                </div>
                <div className="card-arrow">→</div>
              </button>
            );
          })}
        </div>

        {cart.length > 0 && (
          <button className="btn" style={{ marginTop: 20 }} onClick={() => setStep('cart')}>
            담은 수업 {cart.length}개 보기
          </button>
        )}
      </main>
    );
  }

  // ===== 1단계: 대분류 =====
  return (
    <main className="container">
      <div className="logo-row">
        <img src="/logo.png" alt="R U Thinking?" className="site-logo" />
        <span className="badge">R U Thinking?</span>
      </div>
      <h1 className="page-title">수업 등록 안내</h1>
      <p className="page-sub">어떤 과목을 등록하시나요?</p>

      {isDemo && (
        <div className="notice">
          지금은 예시 데이터로 보고 있어요. 시간표 시트를 연결하면 실제 현황이 나타납니다.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <div className="card-list">
        {categories.map((cat) => {
          const style = CATEGORY_STYLE[cat] || { color: 'var(--navy)', emoji: '📘' };
          const openCount = slots.filter((s) => s['대분류'] === cat && s['상태'] === '등록가능').length;
          return (
            <button key={cat} className="card" onClick={() => { setCategory(cat); setStep('level'); }}>
              <div className="card-icon" style={{ background: style.color }}>{style.emoji}</div>
              <div>
                <div className="card-title">{cat}</div>
                <div className="card-desc">등록 가능 {openCount}개 시간대</div>
              </div>
              <div className="card-arrow">→</div>
            </button>
          );
        })}
      </div>

      {cart.length > 0 && (
        <button className="btn" style={{ marginTop: 20 }} onClick={() => setStep('cart')}>
          담은 수업 {cart.length}개 보기
        </button>
      )}
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="container"><div className="empty">불러오는 중...</div></main>}>
      <RegisterContent />
    </Suspense>
  );
}
