'use client';
// 18번 학부모 페이지 — 카톡 링크(?n=이름&p=전화)로 입력 없이 진입, 직접 오면 이름+전화 입력
// 주 단위 탭 (?w=YYYY-MM-DD 로 특정 주 바로 열기 — 주간 리포트 링크용)
import { useState, useEffect } from 'react';

const digitsOnly = (s) => String(s || '').replace(/[^0-9]/g, '');
const DAY = ['일', '월', '화', '수', '목', '금', '토'];

function mondayOf(dateStr) {
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return null;
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return d;
}
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shortDate(dateStr) {
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()} (${DAY[d.getDay()]})`;
}

const badge = (text, kind) => {
  const colors = {
    good: ['var(--soft-teal)', 'var(--teal)'],
    warn: ['#fff3cd', '#b8860b'],
    bad: ['var(--soft-red)', 'var(--red)'],
    plain: ['var(--card)', 'var(--med)'],
  }[kind || 'plain'];
  return (
    <span style={{ background: colors[0], color: colors[1], padding: '3px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
      {text}
    </span>
  );
};

function attBadge(v) {
  if (v === '출석') return badge('출석', 'good');
  if (v === '지각') return badge('지각', 'warn');
  if (v === '결석' || v === '사전결석') return badge(v, 'bad');
  return badge('-', 'plain');
}
function hwBadge(v) {
  if (v === 'O') return badge('완료', 'good');
  if (v === '늦음') return badge('늦게 완료', 'warn');
  if (v === 'X') return badge('안 함', 'bad');
  return badge('-', 'plain');
}
function testBadge(v) {
  if (v === '통과') return badge('통과', 'good');
  if (v === '재시통과') return badge('재시험 통과', 'warn');
  if (v === '미달') return badge('재시험 예정', 'bad');
  if (v === '미응시') return badge('미응시', 'bad');
  return badge('-', 'plain');
}

export default function ParentPage() {
  const [profile, setProfile] = useState(null); // {name, phone}
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [weekKey, setWeekKey] = useState(''); // 선택된 주의 월요일 (YYYY-MM-DD)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = (q.get('n') || '').trim();
    const p = q.get('p') || '';
    const w = q.get('w') || '';
    if (w) {
      const m = mondayOf(w);
      if (m) setWeekKey(fmt(m));
    }
    if (n && p) {
      setProfile({ name: n, phone: p });
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem('ru_parent') || 'null');
        if (saved && saved.name) setProfile(saved);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    setError('');
    fetch(`/api/parent-status?name=${encodeURIComponent(profile.name)}&phone=${encodeURIComponent(profile.phone)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) { setError(j.error); setData(null); }
        else {
          setData(j);
          try { localStorage.setItem('ru_parent', JSON.stringify(profile)); } catch (e) {}
        }
        setLoading(false);
      })
      .catch(() => { setError('불러오지 못했어요. 잠시 후 다시 시도해주세요.'); setLoading(false); });
  }, [profile]);

  const submit = (e) => {
    e.preventDefault();
    if (!nameInput.trim() || digitsOnly(phoneInput).length < 10) {
      setError('아이 이름과 전화번호를 확인해주세요.');
      return;
    }
    setProfile({ name: nameInput.trim(), phone: phoneInput });
  };

  // ===== 로그인 화면 =====
  if (!profile || (error && !data)) {
    return (
      <main className="container" style={{ maxWidth: 480 }}>
        <h1 className="page-title" style={{ marginTop: 24 }}>학습 리포트</h1>
        <p className="page-sub">아이 이름과 등록하신 학부모 전화번호를 입력해주세요.</p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="아이 이름 (예: 김서준)" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
          <input placeholder="학부모 전화번호" inputMode="numeric" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
          {error && <div className="error-box">{error}</div>}
          <button className="btn" type="submit">확인</button>
        </form>
      </main>
    );
  }

  if (loading || !data) {
    return <main className="container"><div className="empty">불러오는 중...</div></main>;
  }

  // ===== 주 단위 그룹 =====
  const weeks = {}; // 월요일 → records[]
  for (const r of data.records) {
    const m = mondayOf(r['날짜']);
    if (!m) continue;
    const k = fmt(m);
    (weeks[k] = weeks[k] || []).push(r);
  }
  const weekKeys = Object.keys(weeks).sort().reverse(); // 최신 주 먼저
  const active = weekKey && weeks[weekKey] ? weekKey : weekKeys[0] || '';
  const activeRecords = (weeks[active] || []).sort((a, b) => String(a['날짜']).localeCompare(String(b['날짜'])));

  const weekLabel = (k) => {
    const m = new Date(k + 'T00:00:00');
    const s = new Date(m); s.setDate(s.getDate() + 6);
    return `${m.getMonth() + 1}/${m.getDate()} ~ ${s.getMonth() + 1}/${s.getDate()}`;
  };

  // 반별로 묶기
  const byClass = {};
  for (const r of activeRecords) (byClass[r['반이름']] = byClass[r['반이름']] || []).push(r);

  return (
    <main className="container" style={{ maxWidth: 640 }}>
      <h1 className="page-title" style={{ marginTop: 24 }}>{data.학생이름} 학습 리포트</h1>
      <p className="page-sub">알유띵킹 어학원 · 출석과 숙제, 테스트 기록입니다.</p>

      {weekKeys.length === 0 ? (
        <div className="empty">아직 수업 기록이 없어요. 첫 수업 후에 표시됩니다.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
            {weekKeys.map((k) => (
              <button key={k} onClick={() => setWeekKey(k)}
                style={{
                  flexShrink: 0, padding: '8px 14px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                  border: '2px solid ' + (k === active ? 'var(--navy)' : 'var(--border)'),
                  background: k === active ? 'var(--navy)' : '#fff',
                  color: k === active ? '#fff' : 'var(--med)',
                }}>
                {weekLabel(k)}
              </button>
            ))}
          </div>

          {Object.entries(byClass).map(([cls, rows]) => (
            <div key={cls} style={{ background: '#fff', border: '2px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy)', marginBottom: 10 }}>{cls}</div>
              {rows.map((r, i) => (
                <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)', padding: '10px 0' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                    {shortDate(r['날짜'])} {r['회차'] && <span style={{ color: 'var(--light)', fontWeight: 400 }}>· {r['회차']}회차</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {attBadge(r['출석'])}
                    {hwBadge(r['숙제'])}
                    {testBadge(r['재시결과'])}
                    {String(r['단어점수'] || '').trim() && badge(`단어 ${r['단어점수']}점`, 'plain')}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      <p style={{ fontSize: 12, color: 'var(--light)', textAlign: 'center', marginTop: 20 }}>
        문의는 등록하신 연락처로 문자 주세요.
      </p>
    </main>
  );
}
