'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ATTITUDE_OPTIONS, ATTENDANCE_OPTIONS, HOMEWORK_OPTIONS, RETEST_OPTIONS } from '../../../lib/dashboard';

const COLORS = {
  출석: 'var(--teal)', 지각: 'var(--yellow)', 결석: 'var(--red)', 사전결석: 'var(--med)',
  O: 'var(--teal)', 늦음: 'var(--yellow)', X: 'var(--red)',
  통과: 'var(--teal)', 재시통과: 'var(--yellow)', 미달: 'var(--red)', 미응시: 'var(--med)',
  집중: 'var(--teal)', 보통: 'var(--navy)', 산만: 'var(--yellow)', 졸음: 'var(--red)',
};

function Chips({ value, options, onChange, auto }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(on ? '' : o)}
            style={{
              padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: `1.5px solid ${on ? COLORS[o] || 'var(--navy)' : 'var(--border)'}`,
              background: on ? COLORS[o] || 'var(--navy)' : '#fff',
              color: on ? '#fff' : 'var(--med)',
              outline: auto && auto === o && !on ? '2px dashed var(--light)' : 'none',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function ToggleO({ value, onChange }) {
  const on = value === 'O';
  return (
    <button type="button" onClick={() => onChange(on ? '' : 'O')} className={on ? 'btn btn-teal' : 'btn btn-outline'} style={{ padding: '6px 14px', fontSize: 12, width: 'auto' }}>
      {on ? 'O' : '－'}
    </button>
  );
}

export default function DashboardPage() {
  const [classes, setClasses] = useState([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showWhy, setShowWhy] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then((j) => {
      setClasses(j.classes || []); setDate(j.date || ''); setLoading(false);
      // 반 관리에서 ?class=반이름 으로 들어오면 그 반을 바로 연다
      const q = new URLSearchParams(window.location.search).get('class');
      if (q) openClass(q, j.date || '');
    }).catch(() => setLoading(false));
  }, []);

  const openClass = async (name, d) => {
    setSelected(name); setData(null); setMsg('');
    const res = await fetch(`/api/dashboard?class=${encodeURIComponent(name)}&date=${d || date}`);
    const j = await res.json();
    if (j.error) { setMsg(j.error); return; }
    setData(j); setRows(j.rows);
  };

  const update = (i, key, val) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  const save = async () => {
    setSaving(true); setMsg('');
    const res = await fetch('/api/dashboard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 반이름: data.반이름, 날짜: data.date, 회차: data.회차, rows }),
    });
    const j = await res.json();
    setSaving(false);
    setMsg(j.ok ? `저장 완료 (${rows.length}명)` : `저장 실패: ${j.error}`);
  };

  if (loading) return <main className="container"><div className="empty">불러오는 중...</div></main>;

  // ===== 반 상세 =====
  if (selected) {
    return (
      <main className="container">
        {fromClasses
          ? <Link href="/teacher/classes" className="back-link">← 반 관리</Link>
          : <button className="back-link" onClick={() => { setSelected(null); setData(null); }}>← 반 목록</button>}
        <h1 className="page-title">{selected}</h1>
        {!data && !msg && <div className="empty">학생 정보와 자동 판정을 불러오는 중...</div>}
        {msg && !data && <div className="error-box">{msg}</div>}
        {data && (
          <>
            <p className="page-sub">
              {data.date} · {data.회차}회차{data.진도 ? ` · ${data.진도}` : ''}{data.수업시간 ? ` · ${data.수업시간}` : ''}
              {data.시크릿코드 ? ` · 시크릿코드 ${data.시크릿코드}` : ''}
            </p>
            {data.숙제유닛 ? <p className="page-sub" style={{ marginTop: -6 }}>확인할 숙제: Unit {data.숙제유닛} (지난 회차)</p> : null}
            {data.warnings && data.warnings.length > 0 && (
              <div className="notice" style={{ marginBottom: 12 }}>{data.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}</div>
            )}
            <div className="notice" style={{ marginBottom: 12, fontSize: 12 }}>
              점선 테두리는 자동 판정입니다. 맞으면 그대로 두고 틀린 것만 눌러 고친 뒤 맨 아래 저장 한 번.
            </div>
            {rows.length === 0 && <div className="empty">이 반에 등록된 학생이 없어요. 학생명단 시트를 확인해주세요.</div>}
            <div className="card-list">
              {rows.map((r, i) => (
                <div key={r.이름} className="card" style={{ display: 'block', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="card-title">{r.이름}{r.입장시각 ? <span style={{ fontSize: 12, color: 'var(--med)', fontWeight: 400 }}> · 입장 {r.입장시각}</span> : null}</div>
                    {r.단어점수 ? <span className="tag tag-gray">테스트 {r.단어점수}점</span> : null}
                  </div>
                  <Row label="출석"><Chips value={r.출석} options={ATTENDANCE_OPTIONS} auto={r.auto?.출석} onChange={(v) => update(i, '출석', v)} /></Row>
                  <Row label="숙제">
                    <Chips value={r.숙제} options={HOMEWORK_OPTIONS} auto={r.auto?.숙제} onChange={(v) => update(i, '숙제', v)} />
                    {r.auto?.근거?.length > 0 && (
                      <button type="button" onClick={() => setShowWhy(showWhy === i ? null : i)} style={{ background: 'none', border: 0, color: 'var(--med)', fontSize: 11, marginTop: 4, cursor: 'pointer', padding: 0 }}>
                        {showWhy === i ? '근거 닫기' : '자동 판정 근거 보기'}
                      </button>
                    )}
                    {showWhy === i && <div style={{ fontSize: 11, color: 'var(--med)', marginTop: 4 }}>{r.auto.근거.map((g, k) => <div key={k}>· {g}</div>)}</div>}
                  </Row>
                  <Row label="테스트"><Chips value={r.재시결과} options={RETEST_OPTIONS} auto={r.auto?.재시결과} onChange={(v) => update(i, '재시결과', v)} /></Row>
                  <Row label="태도"><Chips value={r.수업태도} options={ATTITUDE_OPTIONS} onChange={(v) => update(i, '수업태도', v)} /></Row>
                  <Row label="코드 / 필기">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--med)' }}>시크릿코드</span><ToggleO value={r.시크릿코드} onChange={(v) => update(i, '시크릿코드', v)} />
                      <span style={{ fontSize: 11, color: 'var(--med)', marginLeft: 8 }}>필기인증</span><ToggleO value={r.필기인증} onChange={(v) => update(i, '필기인증', v)} />
                    </div>
                  </Row>
                  <Row label="특이사항">
                    <input value={r.특이사항} onChange={(e) => update(i, '특이사항', e.target.value)} placeholder="없으면 비워두세요" style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                  </Row>
                  {r.savedAt ? <div style={{ fontSize: 11, color: 'var(--light)', marginTop: 6 }}>마지막 저장 {r.savedAt}</div> : null}
                </div>
              ))}
            </div>
            {rows.length > 0 && (
              <div style={{ position: 'sticky', bottom: 12, marginTop: 16 }}>
                <button className="btn" onClick={save} disabled={saving || !data.canSave}>
                  {saving ? '저장 중...' : data.canSave ? `${rows.length}명 한 번에 저장` : '저장 불가 (시트 미설정)'}
                </button>
                {msg && <div className="notice" style={{ marginTop: 8 }}>{msg}</div>}
              </div>
            )}
          </>
        )}
      </main>
    );
  }

  // ===== 반 목록 =====
  const todays = classes.filter((c) => c.today);
  const list = showAll ? classes : todays;
  return (
    <main className="container">
      <Link href="/teacher/classes" className="back-link">← 반 관리</Link>
      <h1 className="page-title">일일 대시보드</h1>
      <p className="page-sub">반을 누르면 학생 전원이 한 화면에 나와요. 버튼 다 누르고 저장 한 번.</p>
      <div className="field" style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--med)' }}>날짜</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8, marginLeft: 8 }} />
      </div>
      {list.length === 0 && <div className="empty">{showAll ? '반이 없어요.' : '오늘 수업이 있는 반이 없어요.'}</div>}
      <div className="card-list">
        {list.map((c) => (
          <button key={c.반이름} className="card" onClick={() => openClass(c.반이름, date)} style={{ textAlign: 'left' }}>
            <div className="card-icon" style={{ background: c.today ? 'var(--teal)' : 'var(--light)' }}>📋</div>
            <div>
              <div className="card-title">{c.반이름}</div>
              <div className="card-desc">{c.수업요일} {c.수업시간} · {c.status}{c.sessions ? ` ${c.sessions}회차` : ''}</div>
            </div>
            <div className="card-arrow">›</div>
          </button>
        ))}
      </div>
      <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => setShowAll(!showAll)}>
        {showAll ? '오늘 수업만 보기' : '전체 반 보기'}
      </button>
    </main>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 10 }}>
      <div style={{ width: 64, flexShrink: 0, fontSize: 12, color: 'var(--med)', paddingTop: 6 }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
