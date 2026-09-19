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
  const [notice, setNotice] = useState(null); // { 안내문, 계정, warnings }
  const [copied, setCopied] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [kindTab, setKindTab] = useState('등록'); // 등록 | 대기
  const [doneList, setDoneList] = useState(null); // null=미로드
  const [noticeLoading, setNoticeLoading] = useState(false);

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
        setMessage('');
        setNotice({ 안내문: json.안내문, 계정: json.계정, warnings: json.warnings || [] });
        setCopied(false);
        // 처리된 건은 대기 목록에서 제거
        setEnrollments((prev) => prev.filter((e) => e !== selected));
      } else {
        setMessage('일부 처리에 실패했습니다: ' + JSON.stringify(json.results));
      }
    } catch (e) {
      setMessage('처리 실패: ' + e.message);
    }
    setSaving(false);
  };

  // 대기 신청 처리완료: 처리여부만 기록 (학생명단 추가·안내문 없음)
  const handleWaitDone = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'waitdone', enrollment: selected }),
      });
      const json = await res.json();
      if (json.error) setMessage(json.error);
      else {
        setEnrollments((prev) => prev.filter((e) => e !== selected));
        setSelected(null);
      }
    } catch (err) { setMessage('처리 실패: ' + err.message); }
    setSaving(false);
  };

  const loadDone = async () => {
    setShowDone(true);
    if (doneList !== null) return;
    const r = await fetch('/api/enrollments?done=1').then((x) => x.json()).catch(() => ({ enrollments: [] }));
    setDoneList(r.enrollments || []);
  };

  const openNoticeFor = async (e) => {
    setNoticeLoading(true);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'notice', 이름: e['학생 이름'], 전화: e['학부모 연락처'] }),
      });
      const j = await res.json();
      if (j.error) { alert(j.error); }
      else { setNotice({ 안내문: j.안내문, 계정: j.계정, warnings: j.warnings || [] }); setCopied(false); }
    } catch (err) { alert('안내문 생성 실패: ' + err.message); }
    setNoticeLoading(false);
  };

  const copyNotice = () => {
    if (!notice) return;
    navigator.clipboard.writeText(notice.안내문).then(() => setCopied(true)).catch(() => {
      // 클립보드 실패 시 선택이라도 되게
      alert('복사가 안 되면 안내문을 길게 눌러 직접 복사해주세요.');
    });
  };

  const noticeModal = notice && (
    <div className="modal-backdrop" onClick={() => setNotice(null)}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={() => setNotice(null)}>✕</button>
        <div className="modal-title">등록 안내문 (카톡 발송용)</div>

        {notice.계정 && notice.계정.아이디 && (
          <div className="notice" style={{ marginBottom: 12 }}>
            클래스카드 계정 {notice.계정.재사용 ? '(기존 계정 재사용)' : '(새로 생성됨 — 클래스카드에서 이 값으로 계정을 만들어주세요)'}
            <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 15 }}>
              아이디: {notice.계정.아이디} / 비밀번호: {notice.계정.비번}
            </div>
          </div>
        )}

        {notice.warnings.length > 0 && (
          <div className="error-box" style={{ marginBottom: 12 }}>
            {notice.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
          </div>
        )}

        <button className="btn" onClick={copyNotice} style={{ marginBottom: 12 }}>
          {copied ? '✓ 복사됨! 카톡에 붙여넣으세요' : '안내문 전체 복사하기'}
        </button>

        <div className="result-box" style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8 }}>
          {notice.안내문}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <main className="container"><div className="empty">불러오는 중...</div></main>;
  }

  // ===== 상세 화면 =====
  if (selected) {
    const isWait = String(selected['신청 종류'] || '').trim() === '대기';
    return (
      <main className="container">
        <button className="back-link" onClick={() => { setSelected(null); setAssignments({}); setMessage(''); }}>
          ← 목록으로
        </button>

        <h1 className="page-title">{selected['학생 이름']}{isWait ? ' (대기)' : ''}</h1>
        <p className="page-sub">
          {selected['학생 학년']} · 학부모 {selected['학부모 이름']} ({selected['학부모 연락처']})
        </p>

        {isWait && (
          <div className="notice" style={{ marginBottom: 14 }}>
            대기 신청입니다. 이 시간대에 반이 열리면 연락하기로 한 건이에요. 연락(또는 등록 전환)을 마쳤으면 아래 [처리완료]를 눌러주세요 — 대기 카운트에서 빠집니다.
          </div>
        )}

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

                {!isWait && (<>
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
                </>)}
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

        <button className="btn" style={{ marginTop: 16 }} onClick={isWait ? handleWaitDone : handleComplete} disabled={saving}>
          {saving ? '처리 중...' : isWait ? '처리완료 (연락 마침 — 대기에서 제외)' : '처리완료 (학생명단 추가 + 안내문 생성)'}
        </button>

        {noticeModal}
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

      {!showDone && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['등록', '대기'].map((k) => {
            const count = enrollments.filter((e) => (String(e['신청 종류'] || '').trim() === '대기') === (k === '대기')).length;
            return (
              <button key={k} onClick={() => setKindTab(k)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  border: '2px solid ' + (kindTab === k ? 'var(--navy)' : 'var(--border)'),
                  background: kindTab === k ? 'var(--navy)' : '#fff',
                  color: kindTab === k ? '#fff' : 'var(--med)',
                }}>
                {k} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      )}

      {!showDone && (() => {
        const list = enrollments.filter((e) => (String(e['신청 종류'] || '').trim() === '대기') === (kindTab === '대기'));
        return list.length === 0 ? (
        <div className="empty">{kindTab === '대기' ? '대기 신청이 없어요.' : '처리할 등록 신청이 없어요.'}</div>
      ) : (
        <div className="card-list">
          {list.map((e, i) => (
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
      );
      })()}

      {showDone && (
        doneList === null ? <div className="empty">처리완료 목록 불러오는 중...</div>
        : doneList.length === 0 ? <div className="empty">처리완료된 신청이 없어요.</div>
        : (
          <div className="card-list">
            {doneList.map((e, i) => (
              <div key={i} className="card" style={{ cursor: 'default' }}>
                <div className="card-icon" style={{ background: 'var(--teal)', fontSize: 16 }}>✓</div>
                <div style={{ flex: 1 }}>
                  <div className="card-title">{e['학생 이름']} ({e['학생 학년']})</div>
                  <div className="card-desc">{String(e['처리여부'] || '')}</div>
                </div>
                <button className="btn" style={{ width: 'auto', padding: '8px 14px', fontSize: 13, flexShrink: 0 }} onClick={() => openNoticeFor(e)} disabled={noticeLoading}>
                  {noticeLoading ? '...' : '안내문 보기'}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => (showDone ? setShowDone(false) : loadDone())}>
        {showDone ? '← 처리 대기 목록으로' : '처리완료 목록 보기 (안내문 재발송)'}
      </button>

      {noticeModal}
    </main>
  );
}
