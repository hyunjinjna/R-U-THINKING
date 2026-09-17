'use client';

import { useState, useEffect, useRef } from 'react';
import { createAdaptiveSession, nextStep, evaluatePhonicsGate } from '../../lib/adaptive';

const SUBJECT_LABEL = { phonics: '파닉스', reading: '리딩', voca: '단어', grammar: '문법' };

export default function LevelTestPage() {
  const [stage, setStage] = useState('intro'); // intro -> phonics -> reading -> voca -> grammar -> phone -> report
  const [entryType, setEntryType] = useState(null); // 'A' | 'B'
  const [questions, setQuestions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [phonicsAnswers, setPhonicsAnswers] = useState([]);
  const [phonicsIdx, setPhonicsIdx] = useState(0);
  const [phonicsResult, setPhonicsResult] = useState(null);

  const [adaptiveSession, setAdaptiveSession] = useState(null);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [subjectQIdx, setSubjectQIdx] = useState({}); // 이번 세션에서 이미 낸 문제ID 기록
  const [gapsCollected, setGapsCollected] = useState({ reading: [], voca: [], grammar: [] });
  const [finalResults, setFinalResults] = useState({});

  const [phone, setPhone] = useState('');
  const [report, setReport] = useState(null);
  const [timer, setTimer] = useState(60);
  const timerRef = useRef(null);

  const SUBJECT_RANGE = {
    reading: { min: 0, max: 950, start: 300 }, // 렉사일
    voca: { min: 0, max: 17, start: 3 }, // VOCA_STAGES 인덱스
    grammar: { min: 1, max: 12, start: 4 },
  };

  const VOCA_STAGES = [
    'Pre-A1', 'A1-하', 'A1-중', 'A1-상', 'A2-하', 'A2-중', 'A2-상',
    'B1-하', 'B1-중', 'B1-상', 'B2-하', 'B2-중', 'B2-상',
    'C1-하', 'C1-중', 'C1-상', 'C2-하', 'C2-상',
  ];

  const loadQuestions = async (subject) => {
    if (questions[subject]) return questions[subject];
    const res = await fetch(`/api/leveltest-questions?subject=${subject}`);
    const json = await res.json();
    const list = json.questions || [];
    setQuestions((prev) => ({ ...prev, [subject]: list }));
    return list;
  };

  // ===== 타이머 =====
  useEffect(() => {
    if (stage === 'phonics' || stage === 'adaptive') {
      setTimer(60);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [stage, phonicsIdx, adaptiveSession?.history?.length]);

  // ===== 시작 =====
  const start = async (type) => {
    setEntryType(type);
    setLoading(true);
    await loadQuestions('phonics');
    setLoading(false);
    setStage('phonics');
  };

  // ===== 파닉스 게이트 =====
  const answerPhonics = (correct) => {
    const newAnswers = [...phonicsAnswers, correct];
    setPhonicsAnswers(newAnswers);

    const list = questions.phonics || [];
    if (phonicsIdx + 1 >= Math.min(5, list.length)) {
      const result = evaluatePhonicsGate(newAnswers);
      setPhonicsResult(result);
      setFinalResults((prev) => ({
        ...prev,
        phonics: { passed: result.passed, level: 1 },
      }));

      if (!result.passed) {
        setStage('phone'); // 파닉스 게이트 실패 → 나머지 생략, 바로 전화번호
      } else {
        startAdaptive('reading');
      }
    } else {
      setPhonicsIdx(phonicsIdx + 1);
    }
  };

  // ===== 적응형 시험 시작 =====
  const startAdaptive = async (subject) => {
    setLoading(true);
    await loadQuestions(subject);
    setLoading(false);
    const range = SUBJECT_RANGE[subject];
    setAdaptiveSession(createAdaptiveSession(range.min, range.max, range.start));
    setCurrentSubject(subject);
    setSubjectQIdx((prev) => ({ ...prev, [subject]: [] }));
    setStage('adaptive');
  };

  const getQuestionForLevel = (subject, level) => {
    const list = questions[subject] || [];
    const used = subjectQIdx[subject] || [];

    let candidates;
    if (subject === 'reading') {
      // 렉사일: 가장 가까운 문제 찾기
      candidates = [...list].sort(
        (a, b) => Math.abs(Number(a['렉사일']) - level) - Math.abs(Number(b['렉사일']) - level)
      );
    } else if (subject === 'voca') {
      const targetStage = VOCA_STAGES[Math.max(0, Math.min(17, level))];
      candidates = list.filter((q) => q['CEFR단계'] === targetStage);
      if (candidates.length === 0) {
        candidates = [...list].sort(
          (a, b) =>
            Math.abs(VOCA_STAGES.indexOf(a['CEFR단계']) - level) -
            Math.abs(VOCA_STAGES.indexOf(b['CEFR단계']) - level)
        );
      }
    } else {
      candidates = [...list].sort(
        (a, b) => Math.abs(Number(a['난이도']) - level) - Math.abs(Number(b['난이도']) - level)
      );
    }

    const unused = candidates.filter((q) => !used.includes(q['문제ID']));
    return (unused[0] || candidates[0]) || null;
  };

  const currentQuestion = (() => {
    if (stage === 'phonics') {
      return (questions.phonics || [])[phonicsIdx] || null;
    }
    if (stage === 'adaptive' && adaptiveSession) {
      return getQuestionForLevel(currentSubject, adaptiveSession.current);
    }
    return null;
  })();

  // ===== 적응형 답 선택 =====
  const answerAdaptive = (optionNum) => {
    const q = currentQuestion;
    if (!q) return;

    const correct = Number(q['정답번호']) === optionNum;

    // 오답이면 그 보기의 구멍 태그 수집
    if (!correct) {
      const gapKey = `보기${optionNum}구멍`;
      const gaps = (q[gapKey] || '').split(',').map((g) => g.trim()).filter(Boolean);
      if (gaps.length > 0) {
        setGapsCollected((prev) => ({
          ...prev,
          [currentSubject]: [...new Set([...prev[currentSubject], ...gaps])],
        }));
      }
    } else if (currentSubject === 'reading' && q['문제유형']) {
      // 리딩은 문제유형=구멍 이지만 정답이면 그 유형은 구멍 아님(패스)
    }

    setSubjectQIdx((prev) => ({
      ...prev,
      [currentSubject]: [...(prev[currentSubject] || []), q['문제ID']],
    }));

    const next = nextStep(adaptiveSession, correct, 8);
    setAdaptiveSession(next);

    if (next.done) {
      finishSubject(currentSubject, next.finalLevel);
    }
  };

  const finishSubject = (subject, finalLevel) => {
    const gaps = gapsCollected[subject] || [];

    if (subject === 'reading') {
      setFinalResults((prev) => ({ ...prev, reading: { lexile: finalLevel, gaps } }));
      if (entryType === 'A') {
        startAdaptive('voca');
      } else {
        setStage('phone'); // B(특정교재)는 간단히 관련 영역만 — 리딩만 보고 종료 가능
      }
    } else if (subject === 'voca') {
      const stageLabel = VOCA_STAGES[Math.max(0, Math.min(17, finalLevel))];
      setFinalResults((prev) => ({ ...prev, voca: { stage: stageLabel, gaps } }));
      if (entryType === 'A') {
        startAdaptive('grammar');
      } else {
        setStage('phone');
      }
    } else if (subject === 'grammar') {
      setFinalResults((prev) => ({ ...prev, grammar: { stage: finalLevel, gaps } }));
      setStage('phone');
    }
  };

  // ===== 전화번호 제출 → 채점 & 리포트 =====
  const submitPhone = async () => {
    if (!phone.trim()) {
      alert('전화번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/leveltest-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, results: finalResults }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setReport(json);
        setStage('report');
      }
    } catch (e) {
      setError('리포트 생성 실패: ' + e.message);
    }
    setLoading(false);
  };

  // ================= 화면 =================

  if (loading && stage !== 'phone') {
    return (
      <main className="container">
        <div className="empty">불러오는 중...</div>
      </main>
    );
  }

  // ----- 인트로 -----
  if (stage === 'intro') {
    return (
      <main className="container">
        <div className="logo-row">
          <img src="/logo.png" alt="R U Thinking?" className="site-logo" />
          <span className="badge">R U Thinking?</span>
        </div>
        <h1 className="page-title">무료 레벨테스트</h1>
        <p className="page-sub">
          시험이 끝나면 전화번호를 입력해주셔야 결과를 보내드릴 수 있어요.
        </p>

        <div className="section-label">어떤 걸 도와드릴까요?</div>
        <div className="card-list">
          <button className="card" onClick={() => start('A')}>
            <div className="card-icon" style={{ background: 'var(--navy)' }}>A</div>
            <div>
              <div className="card-title">종합 레벨테스트</div>
              <div className="card-desc">우리 아이 영어 실력을 전체적으로 확인하고 싶어요</div>
            </div>
            <div className="card-arrow">→</div>
          </button>
          <button className="card" onClick={() => start('B')}>
            <div className="card-icon" style={{ background: 'var(--teal)' }}>B</div>
            <div>
              <div className="card-title">특정 교재/수업을 들으러 왔어요</div>
              <div className="card-desc">관련 영역만 간단히 확인해드려요</div>
            </div>
            <div className="card-arrow">→</div>
          </button>
        </div>
      </main>
    );
  }

  // ----- 파닉스 게이트 -----
  if (stage === 'phonics' && currentQuestion) {
    const q = currentQuestion;
    return (
      <main className="container">
        <div style={{ textAlign: 'right', fontWeight: 800, color: timer <= 10 ? 'var(--red)' : 'var(--navy)', fontSize: 20, marginBottom: 20 }}>
          {timer}초
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 30, lineHeight: 1.6 }}>
          {q['질문']}
        </div>
        <div className="card-list">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className="card" onClick={() => answerPhonics(Number(q['정답번호']) === n)}>
              <div className="card-title">{q[`보기${n}`]}</div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ----- 적응형 시험 -----
  if (stage === 'adaptive' && currentQuestion) {
    const q = currentQuestion;
    return (
      <main className="container">
        <div style={{ textAlign: 'right', fontWeight: 800, color: timer <= 10 ? 'var(--red)' : 'var(--navy)', fontSize: 20, marginBottom: 20 }}>
          {timer}초
        </div>
        {q['지문'] && (
          <div style={{ background: 'var(--card)', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 15, lineHeight: 1.8 }}>
            {q['지문']}
          </div>
        )}
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 26, lineHeight: 1.6 }}>
          {q['질문'] || q['문장']}
        </div>
        <div className="card-list">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className="card" onClick={() => answerAdaptive(n)}>
              <div className="card-title">{q[`보기${n}`]}</div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ----- 전화번호 입력 -----
  if (stage === 'phone') {
    return (
      <main className="container">
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
          <h1 className="page-title">시험이 끝났어요!</h1>
          <p className="page-sub">
            결과 리포트를 보내드릴 전화번호를 입력해주세요
          </p>
        </div>

        <div className="field">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
          />
        </div>

        {error && <div className="error-box">{error}</div>}

        <button className="btn btn-teal" onClick={submitPhone} disabled={loading}>
          {loading ? '채점 중...' : '결과 확인하기'}
        </button>
      </main>
    );
  }

  // ----- 리포트 화면 -----
  if (stage === 'report' && report) {
    return (
      <main className="container">
        <div className="logo-row">
          <img src="/logo.png" alt="R U Thinking?" className="site-logo" />
          <span className="badge">레벨테스트 결과</span>
        </div>

        <div className="result-box" style={{ marginTop: 16 }}>
          {report.report}
        </div>

        <div className="section-label">영역별 요약</div>
        <div className="card-list">
          {report.sections.map((s, i) => (
            <div key={i} className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{s.영역}</div>
              <div style={{ fontSize: 14 }}>{s.결과}</div>
              {s.구멍.length > 0 && (
                <div style={{ fontSize: 13, color: 'var(--red)' }}>구멍: {s.구멍.join(', ')}</div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>
                추천 반: {s.추천반}
              </div>
            </div>
          ))}
        </div>

        <a href="/register" style={{ display: 'block', marginTop: 20 }}>
          <button className="btn">바로 등록하기</button>
        </a>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="empty">문제를 불러오지 못했어요. 새로고침 해주세요.</div>
    </main>
  );
}
