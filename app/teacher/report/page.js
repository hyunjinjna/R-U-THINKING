'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ReportPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [className, setClassName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [extraNote, setExtraNote] = useState('');

  const [result, setResult] = useState('');
  const [period, setPeriod] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/classes').then((r) => r.json()),
      fetch('/api/students').then((r) => r.json()),
    ])
      .then(([c, s]) => {
        setClasses(c.classes || []);
        setStudents(s.students || []);
        setLoading(false);
      })
      .catch(() => {
        setError('데이터를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_KEY;
    if (key && typeof window !== 'undefined' && window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init(key);
      } catch (e) {
        // 초기화 실패해도 복사 기능은 동작
      }
    }
  }, [result]);

  const activeClasses = classes.filter(
    (c) => (c['종료여부'] || '진행중').trim() !== '종료'
  );

  const studentsInClass = students.filter(
    (s) => (s['반이름'] || '').trim() === className.trim()
  );

  const selectedClass = classes.find((c) => c['반이름'] === className);

  const generate = async () => {
    if (!className || !studentName) {
      alert('반과 학생을 선택해주세요.');
      return;
    }

    setGenerating(true);
    setResult('');
    setError('');

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          className,
          dashboardCSV: selectedClass ? selectedClass['대시보드CSV'] : '',
          extraNote,
        }),
      });
      const json = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        setResult(json.text);
        setPeriod(json.period || '');
      }
    } catch (e) {
      setError('생성 중 오류가 발생했습니다.');
    }

    setGenerating(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareKakao = () => {
    if (typeof window === 'undefined' || !window.Kakao || !window.Kakao.isInitialized()) {
      alert('카카오 공유가 설정되지 않았어요. 복사 버튼을 이용해주세요.');
      return;
    }

    try {
      window.Kakao.Share.sendDefault({
        objectType: 'text',
        text: result,
        link: { mobileWebUrl: window.location.origin, webUrl: window.location.origin },
      });
    } catch (e) {
      alert('카카오 공유에 실패했어요. 복사 버튼을 이용해주세요.');
    }
  };

  if (loading) {
    return (
      <main className="container">
        <div className="empty">불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="container">
      <Link href="/teacher" className="back-link">
        ← 선생님 페이지로
      </Link>

      <h1 className="page-title">주간 리포트 생성</h1>
      <p className="page-sub">대시보드 기록을 읽어서 AI가 자동으로 작성해요</p>

      <div className="field">
        <label>반 선택</label>
        <select
          value={className}
          onChange={(e) => {
            setClassName(e.target.value);
            setStudentName('');
            setResult('');
            setError('');
          }}
        >
          <option value="">반을 선택하세요</option>
          {activeClasses.map((c, i) => (
            <option key={i} value={c['반이름']}>
              {c['반이름']} ({c['수업요일']} {c['수업시간']})
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>학생 선택</label>
        <select
          value={studentName}
          onChange={(e) => {
            setStudentName(e.target.value);
            setResult('');
            setError('');
          }}
          disabled={!className}
        >
          <option value="">{className ? '학생을 선택하세요' : '먼저 반을 선택하세요'}</option>
          {studentsInClass.map((s, i) => (
            <option key={i} value={s['이름']}>
              {s['이름']}
            </option>
          ))}
        </select>
        {className && studentsInClass.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>
            이 반에 등록된 학생이 없어요. 학생 명단 시트를 확인해주세요.
          </p>
        )}
      </div>

      <div className="field">
        <label>추가 메모 (선택)</label>
        <textarea
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder="대시보드에 없는 내용 중 리포트에 넣고 싶은 게 있으면 적어주세요"
        />
      </div>

      <button className="btn btn-teal" onClick={generate} disabled={generating}>
        {generating ? '대시보드 읽는 중...' : '리포트 생성하기'}
      </button>

      {error && (
        <div className="error-box" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {period && (
            <p style={{ fontSize: 12, color: 'var(--med)', marginTop: 16 }}>기간: {period}</p>
          )}
          <div className="result-box">{result}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            <button className="btn btn-kakao" onClick={shareKakao}>
              카카오톡으로 공유
            </button>
            <button className="btn btn-outline" onClick={copy}>
              {copied ? '복사됨!' : '복사하기'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
