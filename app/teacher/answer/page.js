'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AnswerPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [faq, setFaq] = useState([]);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState('');
  const [className, setClassName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [extraContext, setExtraContext] = useState('');

  const [result, setResult] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/classes').then((r) => r.json()),
      fetch('/api/students').then((r) => r.json()),
      fetch('/api/faq').then((r) => r.json()),
    ])
      .then(([c, s, f]) => {
        setClasses(c.classes || []);
        setStudents(s.students || []);
        setFaq(f.faq || []);
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

  const studentsInClass = students.filter(
    (s) => (s['반이름'] || '').trim() === className.trim()
  );

  const generate = async () => {
    if (!question.trim()) {
      alert('학부모님 질문을 입력해주세요.');
      return;
    }

    setGenerating(true);
    setResult('');
    setError('');

    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, studentName, className, extraContext }),
      });
      const json = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        setResult(json.text);
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

  const faqSheetLink = process.env.NEXT_PUBLIC_FAQ_SHEET_LINK || '';

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

      <h1 className="page-title">질문 답변 도우미</h1>
      <p className="page-sub">학부모님 질문을 붙여넣으면 AI가 답변 초안을 만들어드려요</p>

      <div className="field">
        <label>학부모님 질문 (카톡에서 복사해서 붙여넣기)</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="예: 안녕하세요, 오늘 아이가 열이 나서 수업에 못 갈 것 같은데 보강이 될까요?"
          style={{ minHeight: 100 }}
        />
      </div>

      <div className="row-2">
        <div className="field">
          <label>반 (선택)</label>
          <select
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              setStudentName('');
            }}
          >
            <option value="">선택 안 함</option>
            {activeClasses.map((c, i) => (
              <option key={i} value={c['반이름']}>
                {c['반이름']}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>학생 (선택)</label>
          <select
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            disabled={!className}
          >
            <option value="">선택 안 함</option>
            {studentsInClass.map((s, i) => (
              <option key={i} value={s['이름']}>
                {s['이름']}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>추가 상황 설명 (선택)</label>
        <textarea
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          placeholder="AI가 알아야 할 배경이 있으면 적어주세요"
        />
      </div>

      <button className="btn" onClick={generate} disabled={generating}>
        {generating ? '작성 중...' : '답변 초안 만들기'}
      </button>

      {error && (
        <div className="error-box" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="result-box">{result}</div>
          <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={copy}>
            {copied ? '복사됨! 카톡에 붙여넣으세요' : '복사하기'}
          </button>
          <div className="notice" style={{ marginTop: 14 }}>
            보내기 전에 꼭 한 번 읽어보세요. 결제 · 환불 · 레벨 조정처럼 원장님 확인이 필요한
            내용은 임의로 확정하지 말고 상의 후 답변해주세요.
          </div>
        </>
      )}

      <div className="section-label">답변 기준 관리</div>

      <div className="notice">
        자주 받는 질문과 답변 방침은 <b>자주 묻는 질문 시트</b>에서 관리합니다.
        <br />
        시트에 <b>질문유형 · 예시질문 · 표준답변가이드</b>를 추가하면 AI가 그 기준에 맞춰
        답변을 작성해요. 현재 {faq.length}개의 기준이 등록되어 있어요.
      </div>

      {faqSheetLink && (
        <a href={faqSheetLink} target="_blank" rel="noopener noreferrer">
          <button className="btn btn-outline">자주 묻는 질문 시트 열기</button>
        </a>
      )}
    </main>
  );
}
