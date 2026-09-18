'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { normalize } from '../../../lib/utils';

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selected, setSelected] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/enrollments').then((r) => r.json()),
      fetch('/api/slots').then((r) => r.json()),
      fetch('/api/classes').then((r) => r.json()),
    ])
      .then(([e, s, c]) => {
        setEnrollments(e.enrollments || []);
        setError(e.error);
        setIsDemo(e.demo);
        setSlots(s.slots || []);
        setClasses(c.classes || []);
        setLoading(false);
      })
      .catch(() => {
        setError('데이터를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, []);

  // 해당 레벨/시간에 배정 가능한 반 찾기
  const findAvailableClasses = (레벨, 희망시간) => {
    // 희망시간 "화목 18:00" -> 요일 "화목", 시간 "18:00"
    const parts = String(희망시간 || '').trim().split(/\s+/);
    const 요일 = parts[0] || '';
    const 시간 = parts[1] || '';

    // 1) 시간표 슬롯에서 "등록가능"인지 확인
    const slotOk = slots.some(
      (s) =>
        normalize(s['레벨']) === normalize(레벨) &&
        normalize(s['수업요일']) === normalize(요일) &&
        normalize(s['수업시간']) === normalize(시간) &&
        s['상태'] === '등록가능'
    );

    // 2) 운영시트에서 레벨/요일/시간 일치 + 아직 개강 전인 반
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return classes.filter((c) => {
      if (normalize(c['레벨']) !== normalize(레벨)) return false;
      if (normalize(c['수업요일']) !== normalize(요일)) return false;
      if (normalize(c['수업시간']) !== normalize(시간)) return false;

      const start = c['시작일'] ? new Date(c['시작일']) : null;
      if (start && !isNaN(start)) {
        start.setHours(0, 0, 0, 0);
        if (start < today) return false; // 이미 개강함
      }
      return true;
    });
  };

  const handleComplete = async () => {
    if (!selected) return;
    const list = selected.items.map((it, i) => ({
      ...it,
      배정반: assignments[i] || '',
    }));

    if (list.some((a) => !a.배정반)) {
      setMessage('모든 과목에 반을 선택해주세요.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollment: selected, assignments: list }),
      });
      const json = await res.json();
      if (json.error) {
        setMessage(json.error);
      } else if (json.ok) {
        setMessage('학생명단에 추가되었습니다. 신청 시트의 "처리여부"에 완료라고 적어주세요.');
      } else {
        setMessage('일부 처리에 실패했습니다: ' + JSON.stringify(json.results));
      }
    } catch (e) {
      setMessage('처리 실패: ' + e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return <main className="container"><div className="empty">불러오는 중...</div></main>;
  }

  // ===== 상세 화면 =====
  if (selected) {
    return (
      <main className="container">
        <button className="back-link" onClick={() => { setSelected(null); setAssignments({}); setMessage(''); }}>
          ← 목록으로
        </button>

        <h1 className="page-title">{selected['학생 이름']}</h1>
        <p className="page-sub">
          {selected['학생 학년']} · 학부모 {selected['학부모 이름']} ({selected['학부모 연락처']})
        </p>

        <div className="section-label">신청 내역</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {selected.items.map((it, i) => {
            const available = findAvailableClasses(it.레벨, it.희망시간);
            return (
              <div
                key={i}
                style={{
                  background: '#fff',
                  border: '2px solid var(--border)',
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{ background: 'var(--card)', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                    {it.과목}
                  </span>
                  <span style={{ background: 'var(--soft-teal)', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                    {it.레벨}
                  </span>
                  <span style={{ background: 'var(--card)', padding: '4px 12px', borderRadius: 8, fontSize: 13 }}>
                    {it.희망시간}
                  </span>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--med)', marginBottom: 8 }}>
                  배정할 반
                </div>

                {available.length === 0 ? (
                  <div style={{ background: 'var(--soft-red)', color: 'var(--red)', padding: '12px 14px', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>
                    조건에 맞는 반이 없습니다 — 새 반 개설이 필요해요
                  </div>
                ) : (
                  <select
                    value={assignments[i] || ''}
                    onChange={(e) => setAssignments({ ...assignments, [i]: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="">반을 선택해주세요</option>
                    {available.map((c, j) => (
                      <option key={j} value={c['반이름']}>
                        {c['반이름']} (시작 {c['시작일']})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {selected['특이사항/문의사항'] && (
          <div className="notice" style={{ marginTop: 18 }}>
            <div className="notice-title">특이사항</div>
            {selected['특이사항/문의사항']}
          </div>
        )}

        <div className="section-label">추가 정보</div>
        <div className="result-box" style={{ fontSize: 14, lineHeight: 2 }}>
          영어 학습 경력: {selected['학생 영어 학습 경력'] || '-'}{'\n'}
          알게 된 경로: {selected['알게 된 경로'] || '-'}{'\n'}
          결제 방법: {selected['결제 방법'] || '-'}
        </div>

        {message && (
          <div className={message.includes('추가되었습니다') ? 'notice' : 'error-box'} style={{ marginTop: 16 }}>
            {message}
          </div>
        )}

        <button className="btn" style={{ marginTop: 16 }} onClick={handleComplete} disabled={saving}>
          {saving ? '처리 중...' : '처리완료 (학생명단에 추가)'}
        </button>
      </main>
    );
  }

  // ===== 목록 화면 =====
  return (
    <main className="container">
      <Link href="/teacher" className="back-link">← 선생님 페이지로</Link>

      <h1 className="page-title">등록 신청 목록</h1>
      <p className="page-sub">처리 대기 중 {enrollments.length}건</p>

      {isDemo && (
        <div className="notice">
          지금은 예시 데이터로 보고 있어요. 등록 신청 시트를 연결하면 실제 신청이 나타납니다.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {enrollments.length === 0 ? (
        <div className="empty">처리할 등록 신청이 없어요.</div>
      ) : (
        <div className="card-list">
          {enrollments.map((e, i) => (
            <button key={i} className="card" onClick={() => { setSelected(e); setAssignments({}); }}>
              <div className="card-icon" style={{ background: 'var(--navy)', fontSize: 16 }}>📝</div>
              <div style={{ flex: 1 }}>
                <div className="card-title">{e['학생 이름']} ({e['학생 학년']})</div>
                <div className="card-desc">
                  {e.items.map((it) => it.레벨).filter(Boolean).join(', ')}
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
