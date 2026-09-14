'use client';

import { useState } from 'react';

export default function PasswordGate({ children }) {
  // 세션 저장 없음 — 페이지 진입/새로고침 시 항상 비밀번호를 다시 받음
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!password.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();

      if (json.ok) {
        setAuthed(true);
      } else {
        setError(json.error || '비밀번호가 맞지 않습니다.');
        setPassword('');
      }
    } catch (e) {
      setError('확인 중 오류가 발생했습니다.');
    }

    setSubmitting(false);
  };

  if (authed) return children;

  return (
    <main className="container">
      <div style={{ paddingTop: 50, textAlign: 'center' }}>
        <span className="badge">R U Thinking?</span>
        <h1 className="page-title">선생님 페이지</h1>
        <p className="page-sub">비밀번호를 입력해주세요</p>
      </div>

      <div className="field">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="비밀번호"
          autoFocus
        />
      </div>

      {error && <div className="error-box">{error}</div>}

      <button className="btn" onClick={submit} disabled={submitting}>
        {submitting ? '확인 중...' : '들어가기'}
      </button>
    </main>
  );
}
