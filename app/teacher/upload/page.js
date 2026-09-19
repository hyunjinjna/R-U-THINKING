'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function UploadPage() {
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [targetMemo, setTargetMemo] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const fullRef = useRef(null);
  const [fullMsg, setFullMsg] = useState('');
  const [fullBusy, setFullBusy] = useState(false);

  const uploadFull = async (file) => {
    if (!file) return;
    setFullBusy(true); setFullMsg('');
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch('/api/classcard-report', { method: 'POST', body: fd });
      const j = await res.json();
      setFullMsg(j.ok ? `저장 완료 — 학생 ${j.학생수}명, 세트 ${j.세트수}건 (누적 ${j.전체기록}건). 대시보드에서 숙제·테스트가 자동으로 채워져요.` : `실패: ${j.error}`);
    } catch (e) { setFullMsg('업로드 실패: ' + e.message); }
    setFullBusy(false);
    if (fullRef.current) fullRef.current.value = '';
  };

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((j) => setClasses(j.classes || []))
      .catch(() => {});
  }, []);

  const activeClasses = classes.filter(
    (c) => (c['종료여부'] || '진행중').trim() !== '종료'
  );

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);

    // 목표값 파싱: "암기 300, 리콜 100" 형태
    const targets = {};
    if (targetMemo.trim()) {
      targetMemo.split(',').forEach((part) => {
        const m = part.trim().match(/^(.+?)\s+(\d+)$/);
        if (m) targets[m[1].trim()] = parseInt(m[2], 10);
      });
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('className', className);
    fd.append('targets', JSON.stringify(targets));
    fd.append('dueDate', dueDate);

    try {
      const res = await fetch('/api/upload-scores', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.error) setError(json.error);
      else setResult(json);
    } catch (e) {
      setError('업로드 실패: ' + e.message);
    }
    setUploading(false);
  };

  const copyAll = () => {
    if (!result) return;
    let text = `[${result.setTitle}]\n\n`;
    result.results.forEach((r) => {
      text += `${r.name}\n`;
      r.insights.forEach((i) => (text += `  - ${i}\n`));
      text += '\n';
    });
    navigator.clipboard.writeText(text);
    alert('복사되었습니다.');
  };

  return (
    <main className="container">
      <Link href="/teacher" className="back-link">← 선생님 페이지로</Link>

      <h1 className="page-title">성적 업로드</h1>
      <p className="page-sub">클래스카드 엑셀을 올리면 자동으로 분석해드려요</p>

        <div className="card" style={{ display: 'block', cursor: 'default', marginBottom: 20, borderLeft: '4px solid var(--teal)' }}>
          <div className="card-title">전체학생 리포트 업로드 (매일 1회)</div>
          <div className="card-desc" style={{ marginBottom: 10 }}>
            클래스카드 학원관리 → 클래스카드 리포트 → "7일 이후" → 엑셀 다운로드 → 여기 올리기.
            반 상관없이 한 번에 저장되고, 대시보드에서 숙제·테스트가 자동 판정돼요.
          </div>
          <input ref={fullRef} type="file" accept=".xlsx,.xls" onChange={(e) => uploadFull(e.target.files[0])} disabled={fullBusy} />
          {fullBusy && <div className="notice" style={{ marginTop: 8 }}>저장 중...</div>}
          {fullMsg && <div className="notice" style={{ marginTop: 8 }}>{fullMsg}</div>}
        </div>

        <div className="section-label">반별 분석 (기존 방식)</div>

      <div className="notice">
        <div className="notice-title">엑셀 받는 법</div>
        클래스카드 → 해당 반 → <b>리포트</b> → <b>세트 학습현황</b> → <b>엑셀 저장</b> →
        상세기록 포함해서 다운로드
      </div>

      <div className="field">
        <label>반 선택 (선택)</label>
        <select value={className} onChange={(e) => setClassName(e.target.value)}>
          <option value="">전체 학생에서 찾기</option>
          {activeClasses.map((c, i) => (
            <option key={i} value={c['반이름']}>{c['반이름']}</option>
          ))}
        </select>
      </div>

      <div className="row-2">
        <div className="field">
          <label>제출 마감일 (선택)</label>
          <input
            type="text"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            placeholder="9/15"
          />
        </div>
        <div className="field">
          <label>목표값 (선택)</label>
          <input
            type="text"
            value={targetMemo}
            onChange={(e) => setTargetMemo(e.target.value)}
            placeholder="암기 300, 리콜 100"
          />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => upload(e.target.files?.[0])}
      />

      <button className="btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? '분석 중...' : '엑셀 파일 선택'}
      </button>

      {error && <div className="error-box" style={{ marginTop: 16 }}>{error}</div>}

      {result && (
        <>
          <div className="section-label">{result.setTitle}</div>

          <div className="notice">
            엑셀 {result.totalInExcel}명 중 <b>{result.matchedCount}명</b> 자동 매칭됨
            <br />
            분석 지표: {result.metrics.join(' · ')}
          </div>

          {result.unmatched.length > 0 && (
            <div className="error-box">
              <b>확인 필요 {result.unmatched.length}명</b>
              <br />
              {result.unmatched.map((u, i) => (
                <div key={i} style={{ fontSize: 13 }}>{u.name} — {u.reason}</div>
              ))}
            </div>
          )}

          <div className="card-list">
            {result.results.map((r, i) => (
              <div key={i} className="card" style={{ cursor: 'default', alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 16 }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--dark)' }}>
                  {r.insights.map((ins, j) => (
                    <div key={j}>· {ins}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={copyAll}>
            전체 분석 결과 복사
          </button>

          <div className="notice" style={{ marginTop: 14 }}>
            이 분석 결과를 일일 대시보드에 붙여넣으면, 주간 리포트 생성 시 자동으로 반영됩니다.
          </div>
        </>
      )}
    </main>
  );
}
