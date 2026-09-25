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
  const classesSheetLink = process.env.NEXT_PUBLIC_CLASSES_SHEET_LINK || '';
  const [selected, setSelected] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [feeText, setFeeText] = useState('');
  const [feeWarnings, setFeeWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [listNotice, setListNotice] = useState(''); // 목록 상단 확인 문구 (처리 후 어디로 갔는지)
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
        setListNotice(`✅ ${selected['학생 이름']} — 처리완료! 학생명단에 추가됐고 처리완료 보관함으로 이동했어요.`);
      } else {
        setMessage('일부 처리에 실패했습니다: ' + JSON.stringify(json.results));
      }
    } catch (e) {
      setMessage('처리 실패: ' + e.message);
    }
    setSaving(false);
  };

  // 대기 건 상태 (처리여부 인코딩: '' 신규 / 연락함 / 결제대기|반|시각)
  const waitStatus = (row) => {
    const v = String((row && row['처리여부']) || '').trim();
    if (!v) return { key: 'new' };
    if (v.startsWith('연락함')) return { key: 'contacted' };
    if (v.startsWith('결제대기')) return { key: 'pending_pay', 반: (v.split('|')[1] || '').trim() };
    return { key: 'closed' };
  };

  // "수업 열렸어요" 연락 문구 — 카톡 발송용, 전화·답장 유도 없음(무전화 원칙), 등록 링크 자동 생성
  const buildOpenMessage = (row) => {
    const it = (row.items && row.items[0]) || {};
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/register?levels=${encodeURIComponent(it.레벨 || '')}`;
    return [
      `[R U Thinking?] ${row['학부모 이름'] || ''} 학부모님, 안녕하세요 😊`,
      ``,
      `기다려주신 ${it.과목 || ''} ${it.레벨 || ''} 수업(${it.희망시간 || ''})이 열려서 안내드립니다!`,
      ``,
      `아래 링크에서 바로 등록하실 수 있어요 👇`,
      link,
      ``,
      `① 링크를 누르면 이 수업의 시간표가 바로 보여요`,
      `② 원하시는 시간을 [담기] → [등록하기]를 누르면 신청서가 열립니다`,
      `   (수업 정보는 미리 채워져 있어서 학부모님 정보만 적으시면 돼요)`,
      `③ 신청서를 제출해주시면 결제 안내를 카톡으로 보내드릴게요`,
      ``,
      `궁금하신 점은 이 카톡으로 편하게 남겨주세요. 감사합니다!`,
    ].join('\n');
  };

  const postWaitMode = async (mode, extra = {}) => {
    if (!selected) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, enrollment: selected, ...extra }),
      });
      const json = await res.json();
      if (json.error) { setMessage(json.error); setSaving(false); return null; }
      setSaving(false);
      return json;
    } catch (err) { setMessage('처리 실패: ' + err.message); setSaving(false); return null; }
  };

  // ① 연락 문구 복사 + 연락함 기록
  const handleWaitContact = async () => {
    try { await navigator.clipboard.writeText(buildOpenMessage(selected)); } catch (e) {}
    const r = await postWaitMode('waitcontact');
    if (r) {
      const updated = { ...selected, 처리여부: '연락함' };
      setSelected(updated);
      setEnrollments((prev) => prev.map((e) => (e === selected ? updated : e)));
      setMessage('연락 문구가 복사되었습니다. 문자나 카톡에 붙여넣어 보내주세요!');
    }
  };

  // ② 반 배정 → 결제 대기 (아직 학생명단에 안 넣음)
  const handleWaitAssign = async () => {
    const 반 = assignments[0] || '';
    if (!반) { setMessage('배정할 반을 선택해주세요.'); return; }
    const r = await postWaitMode('waitassign', { 반이름: 반 });
    if (r) {
      const updated = { ...selected, 처리여부: `결제대기|${반}|` };
      setSelected(updated);
      setEnrollments((prev) => prev.map((e) => (e === selected ? updated : e)));
      setMessage('결제 대기로 표시했습니다. 입금 확인 후 [결제 완료]를 눌러주세요.');
    }
  };

  // ③ 결제 완료 → 이 순간에만 학생명단 추가·계정·안내문 (일반 등록의 처리완료와 동일 파이프라인)
  const handleWaitPaid = async () => {
    const st = waitStatus(selected);
    const 반 = st.반 || assignments[0] || '';
    if (!반) { setMessage('배정된 반이 없습니다. 먼저 반을 배정해주세요.'); return; }
    setSaving(true);
    setMessage('');
    try {
      const it = (selected.items && selected.items[0]) || {};
      const res = await fetch('/api/enrollments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'waitpaid',
          enrollment: selected,
          assignments: [{ 과목: it.과목 || '', 레벨: it.레벨 || '', 희망시간: it.희망시간 || '', 배정반: 반 }],
        }),
      });
      const json = await res.json();
      if (json.error) setMessage(json.error);
      else if (json.ok) {
        setNotice({ 안내문: json.안내문, 계정: json.계정, warnings: json.warnings || [] });
        setCopied(false);
        setEnrollments((prev) => prev.filter((e) => e !== selected));
        setListNotice(`✅ ${selected['학생 이름']} — 등록 확정! 처리완료 보관함으로 이동했어요. (기록·안내문은 [처리완료 보기]에서)`);
      } else setMessage('일부 처리에 실패했습니다: ' + JSON.stringify(json.results));
    } catch (err) { setMessage('처리 실패: ' + err.message); }
    setSaving(false);
  };

  // 등록 건: 반 배정 → 결제 대기 (전 과목 배정 검증, 반들을 처리여부에 저장)
  const handleEnrollAssign = async () => {
    const list = selected.items.map((it, i) => ({ ...it, 배정반: assignments[i] || '' }));
    if (list.some((a) => !a.배정반)) { setMessage('모든 과목에 반을 선택해주세요.'); return; }
    const r = await postWaitMode('enrollassign', { assignments: list });
    if (r) {
      const 반들 = list.map((a) => a.배정반).join(',');
      const updated = { ...selected, 처리여부: `결제대기|${반들}|` };
      setSelected(updated);
      setEnrollments((prev) => prev.map((e) => (e === selected ? updated : e)));
      setFeeText('');
      setMessage('결제 대기로 표시했습니다. [결제 안내 복사]로 수강료 안내를 보내고, 입금 확인 후 [결제 완료]를 눌러주세요.');
    }
  };

  // 결제 안내 문구 (등록·대기 공용) — 서버가 금액·계좌 채워서 문구 생성, 복사 전 수정 가능
  const handleFeeNotice = async () => {
    const st = waitStatus(selected);
    const 반이름들 = st.반들 && st.반들.length > 0 ? st.반들 : (st.반 ? [st.반] : []);
    if (반이름들.length === 0) { setMessage('배정된 반이 없습니다.'); return; }
    const r = await postWaitMode('feenotice', { 반이름들 });
    if (r && r.문구) {
      setFeeText(r.문구);
      setFeeWarnings(r.warnings || []);
      setMessage('');
    }
  };

  // 등록 건: 결제 완료 → 이 순간에만 학생명단 추가·계정·안내문 (기존 처리완료 파이프라인)
  const handleEnrollPaid = async () => {
    const st = waitStatus(selected);
    const 반들 = st.반들 && st.반들.length > 0 ? st.반들 : [];
    if (반들.length === 0) { setMessage('배정된 반이 없습니다. 먼저 반을 배정해주세요.'); return; }
    setSaving(true);
    setMessage('');
    try {
      const list = selected.items.map((it, i) => ({ ...it, 배정반: 반들[i] || 반들[반들.length - 1] }));
      const res = await fetch('/api/enrollments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollment: selected, assignments: list }),
      });
      const json = await res.json();
      if (json.error) setMessage(json.error);
      else if (json.ok) {
        setNotice({ 안내문: json.안내문, 계정: json.계정, warnings: json.warnings || [] });
        setCopied(false);
        setEnrollments((prev) => prev.filter((e) => e !== selected));
        setListNotice(`✅ ${selected['학생 이름']} — 등록 확정! 학생명단에 추가됐고 처리완료 보관함으로 이동했어요.`);
      } else setMessage('일부 처리에 실패했습니다: ' + JSON.stringify(json.results));
    } catch (err) { setMessage('처리 실패: ' + err.message); }
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
        setListNotice(`📁 ${selected['학생 이름']} — 연락 마침으로 처리완료 보관함에 옮겨졌어요. (데이터는 시트에 그대로 남아 있어요)`);
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
        <button className="back-link" onClick={() => { setSelected(null); setAssignments({}); setMessage(''); setFeeText(''); setFeeWarnings([]); }}>
          ← 목록으로
        </button>

        <h1 className="page-title">{selected['학생 이름']}{isWait ? ' (대기)' : ''}</h1>
        <p className="page-sub">
          {selected['학생 학년']} · 학부모 {selected['학부모 이름']} ({selected['학부모 연락처']})
        </p>

        {(() => {
          const st = waitStatus(selected);
          const text = st.key === 'pending_pay'
            ? `💳 결제 대기 중입니다 (배정: ${st.반}). [결제 안내 복사]로 수강료 안내를 보내고, 입금이 확인되면 [결제 완료]를 눌러주세요 — 그때 학생명단 추가·계정·안내문이 만들어집니다.`
            : isWait && st.key === 'contacted'
              ? '📞 연락을 보낸 건입니다. 학부모가 등록을 원하면 아래에서 반을 배정해 결제 대기로 넘겨주세요.'
              : isWait
                ? '대기 신청입니다. 이 시간대에 반이 열렸으면 [수업 열렸어요 문구 복사]로 연락부터 시작하세요.'
                : '';
          return text ? <div className="notice" style={{ marginBottom: 14 }}>{text}</div> : null;
        })()}

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

                {waitStatus(selected).key !== 'pending_pay' && (<>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--med)', marginBottom: 8 }}>
                  배정할 반
                </div>

                {available.length === 0 ? (
                  <div>
                    <div style={{ background: 'var(--soft-red)', color: 'var(--red)', padding: '12px 14px', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>
                      조건에 맞는 반이 없습니다 — 새 반 개설이 필요해요
                    </div>
                    {classesSheetLink && (
                      <a href={classesSheetLink} target="_blank" rel="noopener noreferrer">
                        <button className="btn btn-outline" style={{ marginTop: 8, width: '100%' }}>
                          📊 운영시트 열기 (새 반 만들기)
                        </button>
                      </a>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--light)', marginTop: 6 }}>
                      반을 만들고 2~3분 뒤 이 화면을 새로고침하면 목록에 나타나요.
                    </div>
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
          {(() => {
            // 시트 헤더 이름이 조금 달라도 찾기 (키워드 전부 포함, 제외어 없음)
            const pick = (must, ban = []) => {
              const k = Object.keys(selected).find((h) => must.every((m) => h.includes(m)) && !ban.some((b) => h.includes(b)));
              return k ? String(selected[k] || '').trim() : '';
            };
            const areas = [
              ['파닉스', pick(['파닉스'])],
              ['리딩', pick(['리딩', '기간'])],
              ['문법', pick(['문법', '기간'])],
              ['단어', pick(['단어', '기간'])],
              ['스피킹', pick(['스피킹', '기간'])],
              ['라이팅', pick(['라이팅', '기간'])],
            ].filter(([, v]) => v);
            const prev = pick(['이전', '학습']);
            const concerns = pick(['걱정']);
            return (
              <>
                집주소: {pick(['주소']) || '-'}{'\n'}
                학습 기간: {selected['학생 영어 학습 경력'] || pick(['경력']) || '-'}{prev ? ` (${prev})` : ''}{'\n'}
                {areas.length > 0 && <>영역별: {areas.map(([a, v]) => `${a} ${v}`).join(' · ')}{'\n'}</>}
                {concerns && <>걱정되는 점: {concerns}{'\n'}</>}
                알게 된 경로: {selected['알게 된 경로'] || '-'}{'\n'}
                결제 방법: {selected['결제 방법'] || '-'}
              </>
            );
          })()}
        </div>

        {message && (
          <div className={message.includes('추가되었습니다') ? 'notice' : 'error-box'} style={{ marginTop: 16 }}>
            {message}
          </div>
        )}

        {!isWait ? (() => {
          const st = waitStatus(selected);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {st.key !== 'pending_pay' && (
                <button className="btn" style={{ background: 'var(--teal)' }} onClick={handleEnrollAssign} disabled={saving}>
                  {saving ? '처리 중...' : '🎓 선택한 반으로 배정 (결제 대기로)'}
                </button>
              )}
              {st.key === 'pending_pay' && (<>
                <button className="btn btn-outline" onClick={handleFeeNotice} disabled={saving}>
                  {saving ? '처리 중...' : '💳 결제 안내 복사 (첫 달 수강료·계좌)'}
                </button>
                {feeText && (
                  <div style={{ border: '2px solid var(--border)', borderRadius: 12, padding: 12, background: '#fff' }}>
                    {feeWarnings.map((w, i) => (
                      <div key={i} className="notice" style={{ fontSize: 12, marginBottom: 8 }}>⚠️ {w}</div>
                    ))}
                    <textarea value={feeText} onChange={(e) => setFeeText(e.target.value)}
                      rows={feeText.split('\n').length + 1}
                      style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, lineHeight: 1.7, fontFamily: 'inherit', resize: 'vertical' }} />
                    <button className="btn" style={{ marginTop: 8 }}
                      onClick={async () => { try { await navigator.clipboard.writeText(feeText); setMessage('결제 안내가 복사되었습니다. 카톡에 붙여넣어 보내주세요!'); } catch (e) {} }}>
                      📋 이 내용 복사하기
                    </button>
                  </div>
                )}
                <button className="btn" onClick={handleEnrollPaid} disabled={saving}>
                  {saving ? '처리 중...' : '💳 결제 완료 — 등록 확정 (학생명단 추가 + 안내문)'}
                </button>
              </>)}
            </div>
          );
        })() : (() => {
          const st = waitStatus(selected);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {st.key === 'new' && (
                <button className="btn" onClick={handleWaitContact} disabled={saving}>
                  {saving ? '처리 중...' : '📩 수업 열렸어요 문구 복사 (연락 시작)'}
                </button>
              )}
              {st.key !== 'pending_pay' && (
                <button className="btn" style={{ background: 'var(--teal)' }} onClick={handleWaitAssign} disabled={saving}>
                  {saving ? '처리 중...' : '🎓 선택한 반으로 배정 (결제 대기로)'}
                </button>
              )}
              {st.key === 'pending_pay' && (<>
                <button className="btn btn-outline" onClick={handleFeeNotice} disabled={saving}>
                  {saving ? '처리 중...' : '💳 결제 안내 복사 (첫 달 수강료·계좌)'}
                </button>
                {feeText && (
                  <div style={{ border: '2px solid var(--border)', borderRadius: 12, padding: 12, background: '#fff' }}>
                    {feeWarnings.map((w, i) => (
                      <div key={i} className="notice" style={{ fontSize: 12, marginBottom: 8 }}>⚠️ {w}</div>
                    ))}
                    <textarea value={feeText} onChange={(e) => setFeeText(e.target.value)}
                      rows={feeText.split('\n').length + 1}
                      style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, lineHeight: 1.7, fontFamily: 'inherit', resize: 'vertical' }} />
                    <button className="btn" style={{ marginTop: 8 }}
                      onClick={async () => { try { await navigator.clipboard.writeText(feeText); setMessage('결제 안내가 복사되었습니다. 카톡에 붙여넣어 보내주세요!'); } catch (e) {} }}>
                      📋 이 내용 복사하기
                    </button>
                  </div>
                )}
                <button className="btn" onClick={handleWaitPaid} disabled={saving}>
                  {saving ? '처리 중...' : '💳 결제 완료 — 등록 확정 (학생명단 추가 + 안내문)'}
                </button>
              </>)}
              <button
                className="btn"
                style={{ background: '#fff', color: 'var(--med)', border: '2px solid var(--border)' }}
                onClick={handleWaitDone}
                disabled={saving}
              >
                연락 마침 — 대기 종료 (등록 안 함)
              </button>
            </div>
          );
        })()}

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
      {listNotice && (
        <div className="notice" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span>{listNotice}</span>
          <button onClick={() => setListNotice('')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--med)' }}>✕</button>
        </div>
      )}

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
            <button key={i} className="card" onClick={() => { setSelected(e); setAssignments({}); setFeeText(''); setFeeWarnings([]); setMessage(''); }}>
              <div className="card-icon" style={{ background: 'var(--navy)', fontSize: 16 }}>📝</div>
              <div style={{ flex: 1 }}>
                <div className="card-title">
                  {e['학생 이름']} ({e['학생 학년']})
                  {waitStatus(e).key === 'contacted' && (
                    <span style={{ marginLeft: 8, fontSize: 12, background: 'var(--card)', color: 'var(--med)', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>📞 연락함</span>
                  )}
                  {waitStatus(e).key === 'pending_pay' && (
                    <span style={{ marginLeft: 8, fontSize: 12, background: '#fff3cd', color: '#b8860b', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>💳 결제 대기</span>
                  )}
                </div>
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
