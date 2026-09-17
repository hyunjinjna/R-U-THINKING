'use client';

import { useState, useEffect, useRef } from 'react';
import { daysSinceLastClass, filterHomeworkByDay } from '../lib/week';

const CATEGORY_STYLE = {
  파닉스: { color: 'var(--red)', emoji: '🔤' },
  리딩: { color: 'var(--teal)', emoji: '📖' },
  문법: { color: 'var(--yellow)', emoji: '✏️' },
  스피킹: { color: 'var(--pink)', emoji: '🗣️' },
};

export default function StudentPage() {
  const [step, setStep] = useState('category');
  const [category, setCategory] = useState(null);
  const [selected, setSelected] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [homeworkPopup, setHomeworkPopup] = useState(false);

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((json) => {
        setClasses(json.classes || []);
        setError(json.error);
        setIsDemo(json.demo);
        setLoading(false);
      })
      .catch(() => {
        setError('데이터를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, []);

  const activeClasses = classes.filter(
    (c) => (c['종료여부'] || '진행중').trim() !== '종료'
  );

  const categories = [...new Set(activeClasses.map((c) => c['대분류']).filter(Boolean))];
  const classesInCategory = activeClasses.filter((c) => c['대분류'] === category);

  const pointsLink = process.env.NEXT_PUBLIC_POINTS_LINK || '';
  const kakaoLink = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_LINK || '';

  if (loading) {
    return (
      <main className="container">
        <div className="empty">불러오는 중...</div>
      </main>
    );
  }

  // ===== 개념 설명하기 =====
  if (step === 'concept' && selected) {
    return (
      <ConceptMode
        classData={selected}
        onBack={() => setStep('menu')}
      />
    );
  }

  // ===== 3단계: 반 메뉴 =====
  if (step === 'menu' && selected) {
    const items = [];

    if (selected['줌링크']) {
      items.push({
        label: '수업 입장',
        desc: '줌으로 접속하기',
        emoji: '🎥',
        color: 'var(--navy)',
        href: selected['줌링크'],
      });
    }

    if (selected['클래스카드URL']) {
      items.push({
        label: '단어 공부',
        desc: '클래스카드로 이동',
        emoji: '📚',
        color: 'var(--teal)',
        href: selected['클래스카드URL'],
      });
    }

    const dayOffset = daysSinceLastClass(selected);
    const hw = filterHomeworkByDay(selected['숙제범위'], dayOffset);

    if (selected['숙제범위']) {
      const lockedCount = hw.locked.length;
      items.push({
        label: '이번 회차 숙제',
        desc: lockedCount > 0
          ? `오늘 할 숙제 보기 (${lockedCount}개는 나중에 열려요)`
          : '눌러서 크게 보기',
        emoji: '📝',
        color: 'var(--yellow)',
        onClick: () => setHomeworkPopup(true),
      });
    }

    if (selected['개념설명숙제']) {
      items.push({
        label: '개념 설명하기',
        desc: 'AI 선생님에게 오늘 배운 거 설명하기',
        emoji: '🗣️',
        color: 'var(--purple)',
        onClick: () => setStep('concept'),
      });
    }

    if (selected['필기인증링크']) {
      items.push({
        label: '필기 인증샷',
        desc: '오늘 쓴 필기 올리기',
        emoji: '📸',
        color: 'var(--pink)',
        href: selected['필기인증링크'],
      });
    }

    if (pointsLink) {
      items.push({
        label: '내 포인트 보기',
        desc: '모은 포인트 확인하기',
        emoji: '⭐',
        color: 'var(--red)',
        href: pointsLink,
      });
    }

    if (kakaoLink) {
      items.push({
        label: '질문하기',
        desc: '선생님께 카톡으로 문의하기',
        emoji: '💬',
        color: '#FEE500',
        textColor: '#3A1D1D',
        href: kakaoLink,
      });
    }

    return (
      <main className="container">
        <button className="back-link" onClick={() => setStep('class')}>
          ← 반 목록으로
        </button>

        <h1 className="page-title">{selected['반이름']}</h1>
        <p className="page-sub">
          {selected['수업요일']} {selected['수업시간']}
          {selected['진도'] && ` · ${selected['진도']}`}
        </p>

        {selected.status === '개강 전' && (
          <div className="notice">아직 개강 전이에요. 첫 수업일에 다시 들어와줘!</div>
        )}

        {selected.status === '커리큘럼 완료' && (
          <div className="notice">이 반의 모든 수업이 끝났어요. 수고했어요!</div>
        )}

        {items.length === 0 ? (
          <div className="empty">아직 준비된 항목이 없어요.</div>
        ) : (
          <div className="card-list">
            {items.map((item, i) => {
              const iconStyle = {
                background: item.color,
                color: item.textColor || '#fff',
              };

              if (item.text) {
                return (
                  <div key={i} className="card" style={{ cursor: 'default' }}>
                    <div className="card-icon" style={iconStyle}>{item.emoji}</div>
                    <div>
                      <div className="card-title">{item.label}</div>
                      <div className="card-desc">{item.desc}</div>
                    </div>
                  </div>
                );
              }

              if (item.onClick) {
                return (
                  <button key={i} className="card" onClick={item.onClick}>
                    <div className="card-icon" style={iconStyle}>{item.emoji}</div>
                    <div>
                      <div className="card-title">{item.label}</div>
                      <div className="card-desc">{item.desc}</div>
                    </div>
                    <div className="card-arrow">→</div>
                  </button>
                );
              }

              return (
                <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className="card">
                  <div className="card-icon" style={iconStyle}>{item.emoji}</div>
                  <div>
                    <div className="card-title">{item.label}</div>
                    <div className="card-desc">{item.desc}</div>
                  </div>
                  <div className="card-arrow">→</div>
                </a>
              );
            })}
          </div>
        )}

        {homeworkPopup && (
          <div className="modal-backdrop" onClick={() => setHomeworkPopup(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setHomeworkPopup(false)}>
                ×
              </button>
              <div className="modal-title">이번 회차 숙제</div>

              {hw.visible ? (
                <div className="modal-body">{hw.visible}</div>
              ) : (
                <div className="modal-body" style={{ color: 'var(--med)' }}>
                  오늘 할 숙제가 아직 열리지 않았어요.
                </div>
              )}

              {hw.locked.length > 0 && (
                <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--med)', marginBottom: 8 }}>
                    아직 열리지 않은 숙제
                  </div>
                  {hw.locked.map((l, i) => (
                    <div key={i} className="locked-item">
                      <span>🔒</span>
                      <span>{l.text}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 13 }}>
                        수업 {l.opensAt}일 뒤 열림
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  // ===== 2단계: 반 목록 =====
  if (step === 'class' && category) {
    const style = CATEGORY_STYLE[category] || { color: 'var(--navy)', emoji: '📘' };

    return (
      <main className="container">
        <button className="back-link" onClick={() => setStep('category')}>
          ← 처음으로
        </button>

        <h1 className="page-title">{category}</h1>
        <p className="page-sub">우리 반을 선택해줘!</p>

        {classesInCategory.length === 0 ? (
          <div className="empty">진행 중인 반이 없어요.</div>
        ) : (
          <div className="card-list">
            {classesInCategory.map((c, i) => (
              <button
                key={i}
                className="card"
                onClick={() => {
                  setSelected(c);
                  setStep('menu');
                }}
              >
                <div className="card-icon" style={{ background: style.color }}>
                  {style.emoji}
                </div>
                <div>
                  <div className="card-title">{c['반이름']}</div>
                  <div className="card-desc">
                    {c['수업요일']} {c['수업시간']}
                  </div>
                </div>
                <div className="card-arrow">→</div>
              </button>
            ))}
          </div>
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
      <h1 className="page-title">우리 반 찾기</h1>
      <p className="page-sub">어떤 수업을 듣고 있나요?</p>

      {isDemo && (
        <div className="notice">
          지금은 예시 데이터로 보고 있어요. 스프레드시트를 연결하면 실제 반이 나타납니다.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {categories.length === 0 ? (
        <div className="empty">등록된 반이 없어요.</div>
      ) : (
        <div className="card-list">
          {categories.map((cat) => {
            const style = CATEGORY_STYLE[cat] || { color: 'var(--navy)', emoji: '📘' };
            const count = activeClasses.filter((c) => c['대분류'] === cat).length;

            return (
              <button
                key={cat}
                className="card"
                onClick={() => {
                  setCategory(cat);
                  setStep('class');
                }}
              >
                <div className="card-icon" style={{ background: style.color }}>
                  {style.emoji}
                </div>
                <div>
                  <div className="card-title">{cat}</div>
                  <div className="card-desc">{count}개 반</div>
                </div>
                <div className="card-arrow">→</div>
              </button>
            );
          })}
        </div>
      )}

      {kakaoLink && (
        <>
          <div className="section-label">문의하기</div>
          <a href={kakaoLink} target="_blank" rel="noopener noreferrer" className="card">
            <div className="card-icon" style={{ background: '#FEE500', color: '#3A1D1D' }}>
              💬
            </div>
            <div>
              <div className="card-title">질문하기</div>
              <div className="card-desc">카카오톡으로 문의하기</div>
            </div>
            <div className="card-arrow">→</div>
          </a>
        </>
      )}
    </main>
  );
}

// ===== 개념 설명하기 컴포넌트 =====
function ConceptMode({ classData, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const isEnglish = String(classData['설명언어'] || '').includes('영어');

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      if (recRef.current) {
        try { const r = recRef.current; recRef.current = null; r.stop(); } catch (e) {}
        setListening(false);
      }

      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          concept: classData['개념설명숙제'],
          language: classData['설명언어'],
        }),
      });
      const json = await res.json();
      setMessages([...next, { role: 'assistant', content: json.text || json.error || '응답 없음' }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: '오류가 발생했어요. 다시 시도해줘!' }]);
    }
    setLoading(false);
  };

  const listen = () => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      alert('이 브라우저에서는 음성 인식이 안 돼요. 크롬을 사용해주세요!');
      return;
    }
    // 이미 듣고 있으면 중지
    if (recRef.current) {
      try { recRef.current.stop(); } catch (e) {}
      recRef.current = null;
      setListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = isEnglish ? 'en-US' : 'ko-KR';
    rec.continuous = true;      // 말 끊겨도 계속 듣기
    rec.interimResults = true;  // 말하는 중에도 화면에 표시

    let finalText = '';

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };

    rec.onerror = (e) => {
      // no-speech 같은 일시 오류는 무시하고 계속
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      recRef.current = null;
      setListening(false);
    };

    rec.onend = () => {
      // 사용자가 멈춘 게 아니면 자동으로 다시 시작
      if (recRef.current) {
        try { rec.start(); } catch (err) { recRef.current = null; setListening(false); }
      } else {
        setListening(false);
      }
    };

    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--purple)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', cursor: 'pointer', fontSize: 14 }}>
          ←
        </button>
        <span style={{ fontSize: 20 }}>🗣️</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>개념 설명하기</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
            {classData['반이름']} · {isEnglish ? 'English' : '한국어'}
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 50 }}>
            <div style={{ fontSize: 46, marginBottom: 12 }}>🗣️</div>
            <p style={{ color: 'var(--navy)', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              오늘 배운 거 설명해볼까?
            </p>
            <p style={{ color: 'var(--med)', fontSize: 13, marginBottom: 20 }}>
              {isEnglish ? 'Explain in English!' : '선생님한테 설명하듯이 말해줘!'}
            </p>
            <button
              onClick={() => send(isEnglish ? "I'm ready!" : '시작할게요!')}
              style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              시작하기
            </button>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: 14,
              background: m.role === 'user' ? 'var(--navy)' : 'var(--card)',
              color: m.role === 'user' ? '#fff' : 'var(--dark)',
              fontSize: 14,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'var(--card)', padding: '10px 18px', borderRadius: 14, color: 'var(--med)', fontSize: 14 }}>
              듣고 있어요...
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: 12, display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={listen}
          style={{
            width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer',
            fontSize: 20, flexShrink: 0,
            background: listening ? 'var(--red)' : 'var(--purple)',
            color: '#fff',
            animation: listening ? 'pulse 1s infinite' : 'none',
          }}
        >
          🎤
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder={listening ? '듣고 있어요 (다 말하면 마이크를 다시 눌러줘)' : '말하거나 입력해줘!'}
          style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px', fontSize: 14, outline: 'none' }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          style={{
            width: 46, height: 46, borderRadius: 12, border: 'none',
            cursor: input.trim() ? 'pointer' : 'default',
            fontSize: 18, flexShrink: 0,
            background: input.trim() ? 'var(--navy)' : 'var(--border)',
            color: '#fff',
          }}
        >
          ↑
        </button>
      </div>
    </main>
  );
}
