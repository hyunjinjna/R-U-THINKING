'use client';

import { useState, useEffect } from 'react';

const CATEGORY_STYLE = {
  파닉스: { color: 'var(--red)', emoji: '🔤' },
  리딩: { color: 'var(--teal)', emoji: '📖' },
  문법: { color: 'var(--yellow)', emoji: '✏️' },
  스피킹: { color: 'var(--pink)', emoji: '🗣️' },
};

export default function RegisterPage() {
  const [step, setStep] = useState('category');
  const [category, setCategory] = useState(null);
  const [level, setLevel] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    fetch('/api/slots')
      .then((r) => r.json())
      .then((j) => {
        setSlots(j.slots || []);
        setError(j.error);
        setIsDemo(j.demo);
        setLoading(false);
      })
      .catch(() => {
        setError('데이터를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, []);

  const waitlistForm = process.env.NEXT_PUBLIC_WAITLIST_FORM_LINK || '';
  const enrollForm = process.env.NEXT_PUBLIC_ENROLL_FORM_LINK || '';

  if (loading) {
    return <main className="container"><div className="empty">불러오는 중...</div></main>;
  }

  const categories = [...new Set(slots.map((s) => s['대분류']).filter(Boolean))];
  const levelsInCategory = [
    ...new Set(slots.filter((s) => s['대분류'] === category).map((s) => s['레벨'])),
  ];

  let slotsInLevel = slots.filter(
    (s) => s['대분류'] === category && s['레벨'] === level
  );
  if (onlyAvailable) {
    slotsInLevel = slotsInLevel.filter((s) => s['상태'] === '등록가능');
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
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: onlyAvailable ? 'var(--soft-teal)' : 'var(--card)',
            border: `2px solid ${onlyAvailable ? 'var(--teal)' : 'var(--border)'}`,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 18,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--navy)',
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
              return (
                <div
                  key={i}
                  className="card"
                  style={{
                    cursor: 'default',
                    borderColor: open ? 'var(--teal)' : 'var(--border)',
                    opacity: open ? 1 : 0.75,
                  }}
                >
                  <div
                    className="card-icon"
                    style={{
                      background: open ? 'var(--teal)' : 'var(--light)',
                      fontSize: 14,
                    }}
                  >
                    {open ? '가능' : '마감'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="card-title">
                      {s['수업요일']} {s['수업시간']}
                    </div>
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
                  {(open ? enrollForm : waitlistForm) && (
                    <a
                      href={open ? enrollForm : waitlistForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: open ? 'var(--navy)' : '#fff',
                        color: open ? '#fff' : 'var(--navy)',
                        border: open ? 'none' : '1px solid var(--navy)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {open ? '등록하기' : '대기 신청'}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="notice" style={{ marginTop: 22 }}>
          마감된 시간대도 <b>대기 신청</b>을 하실 수 있어요. 대기 인원이 모이면 같은 시간대에
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
            const openCount = slots.filter(
              (s) => s['레벨'] === lv && s['상태'] === '등록가능'
            ).length;
            return (
              <button
                key={lv}
                className="card"
                onClick={() => {
                  setLevel(lv);
                  setStep('slots');
                }}
              >
                <div className="card-icon" style={{ background: style.color }}>
                  {style.emoji}
                </div>
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
      </main>
    );
  }

  // ===== 1단계: 대분류 =====
  return (
    <main className="container">
      <span className="badge">R U Thinking?</span>
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
          const openCount = slots.filter(
            (s) => s['대분류'] === cat && s['상태'] === '등록가능'
          ).length;
          return (
            <button
              key={cat}
              className="card"
              onClick={() => {
                setCategory(cat);
                setStep('level');
              }}
            >
              <div className="card-icon" style={{ background: style.color }}>
                {style.emoji}
              </div>
              <div>
                <div className="card-title">{cat}</div>
                <div className="card-desc">등록 가능 {openCount}개 시간대</div>
              </div>
              <div className="card-arrow">→</div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
