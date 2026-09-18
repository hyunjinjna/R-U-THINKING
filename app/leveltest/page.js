'use client';

import { useState, useEffect, useRef } from 'react';
import {
  createAdaptiveSession,
  nextStep,
  evaluatePhonicsGate,
  estimatePhonicsBook,
  isValidPhone,
} from '../../lib/adaptive';

const VOCA_STAGES = [
  'Pre-A1', 'A1-하', 'A1-중', 'A1-상', 'A2-하', 'A2-중', 'A2-상',
  'B1-하', 'B1-중', 'B1-상', 'B2-하', 'B2-중', 'B2-상',
  'C1-하', 'C1-중', 'C1-상', 'C2-하', 'C2-상',
];

const SUBJECT_RANGE = {
  reading: { min: 0, max: 950, start: 300 },
  voca: { min: 0, max: 17, start: 3 },
  grammar: { min: 1, max: 12, start: 4 },
};

// B 진입용 대분류 → 교재 목록
const BOOK_CATEGORIES = {
  리딩: {
    subject: 'reading',
    books: [
      'Easy Link Starter', 'Easy Link 1~3', 'Easy Link 4~6',
      'Insight Link Starter', 'Insight Link 1~3', 'Insight Link 4~6',
      'Subject Link Starter', 'Subject Link 1~3', 'Subject Link 4~6', 'Subject Link 7~9',
      'TOEFL Junior',
    ],
  },
  그래머: {
    subject: 'grammar',
    books: [
      'My First Grammar 1~3', 'The Best Grammar 1~3',
      'My Next Grammar 1~3', 'The Best Grammar Plus 1~3',
    ],
  },
  보캡: {
    subject: 'voca',
    books: [
      '1000 Basic Words', '2000 Core Words', '4000 Essential Words',
      'The Voca+bulary', 'Vocabulary Workshop',
    ],
  },
};

export default function LevelTestPage() {
  const [stage, setStage] = useState('intro');
  const [entryType, setEntryType] = useState(null);
  const [bookCategory, setBookCategory] = useState(null);

  const [questions, setQuestions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [phonicsAnswers, setPhonicsAnswers] = useState([]);
  const [phonicsIdx, setPhonicsIdx] = useState(0);

  const [adaptiveSession, setAdaptiveSession] = useState(null);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [usedIds, setUsedIds] = useState({});
  const [gapsCollected, setGapsCollected] = useState({ reading: [], voca: [], grammar: [] });
  const [finalResults, setFinalResults] = useState({});

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [timer, setTimer] = useState(60);
  const timerRef = useRef(null);

  const loadQuestions = async (subject) => {
    if (questions[subject]) return questions[subject];
    const res = await fetch(`/api/leveltest-questions?subject=${subject}`);
    const json = await res.json();
    const list = json.questions || [];
    setQuestions((prev) => ({ ...prev, [subject]: list }));
    return list;
  };

  useEffect(() => {
    if (stage === 'phonics' || stage === 'adaptive') {
      setTimer(60);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer((t) => (t <= 1 ? 0 : t - 1));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [stage, phonicsIdx, adaptiveSession?.history?.length]);

  // ===== A: 종합 시작 =====
  const startComprehensive = async () => {
    setEntryType('A');
    setLoading(true);
    await loadQuestions('phonics');
    setLoading(false);
    setStage('phonics');
  };

  // ===== B: 교재 선택 흐름 =====
  const startByBook = () => {
    setEntryType('B');
    setStage('bookCategory');
  };

  const pickCategory = (cat) => {
    setBookCategory(cat);
    setStage('bookList');
  };

  const pickBook = async (cat) => {
    const subject = BOOK_CATEGORIES[cat].subject;
    setLoading(true);
    await loadQuestions(subject);
    setLoading(false);
    const range = SUBJECT_RANGE[subject];
    setAdaptiveSession(createAdaptiveSession(range.min, range.max, range.start));
    setCurrentSubject(subject);
    setUsedIds((prev) => ({ ...prev, [subject]: [] }));
    setStage('adaptive');
  };

  // ===== 파닉스 게이트 =====
  const answerPhonics = (correct) => {
    const list = questions.phonics || [];
    const q = list[phonicsIdx];
    const newAnswers = [
      ...phonicsAnswers,
      { stage: Number(q?.['게이트단계'] || 1), correct },
    ];
    setPhonicsAnswers(newAnswers);

    if (phonicsIdx + 1 >= Math.min(5, list.length)) {
      const gate = evaluatePhonicsGate(newAnswers.map((a) => a.correct));
      const book = estimatePhonicsBook(newAnswers);

      setFinalResults((prev) => ({
        ...prev,
        phonics: { passed: gate.passed, level: book },
      }));

      if (!gate.passed) {
        setStage('phone');
      } else {
        startAdaptive('reading');
      }
    } else {
      setPhonicsIdx(phonicsIdx + 1);
    }
  };

  const startAdaptive = async (subject) => {
    setLoading(true);
    await loadQuestions(subject);
    setLoading(false);
    const range = SUBJECT_RANGE[subject];
    setAdaptiveSession(createAdaptiveSession(range.min, range.max, range.start));
    setCurrentSubject(subject);
    setUsedIds((prev) => ({ ...prev, [subject]: [] }));
    setStage('adaptive');
  };

  const getQuestionForLevel = (subject, level) => {
    const list = questions[subject] || [];
    const used = usedIds[subject] || [];
    let candidates;

    if (subject === 'reading') {
      candidates = [...list].sort(
        (a, b) => Math.abs(Number(a['렉사일']) - level) - Math.abs(Number(b['렉사일']) - level)
      );
    } else if (subject === 'voca') {
      const target = VOCA_STAGES[Math.max(0, Math.min(17, level))];
      candidates = list.filter((q) => q['CEFR단계'] === target);
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
    return unused[0] || candidates[0] || null;
  };

  const currentQuestion = (() => {
    if (stage === 'phonics') return (questions.phonics || [])[phonicsIdx] || null;
    if (stage === 'adaptive' && adaptiveSession) {
      return getQuestionForLevel(currentSubject, adaptiveSession.current);
    }
    return null;
  })();

  const answerAdaptive = (optionNum) => {
    const q = currentQuestion;
    if (!q) return;

    const correct = Number(q['정답번호']) === optionNum;

    if (!correct) {
      let gaps = [];
      if (currentSubject === 'reading' && q['문제유형']) {
        gaps = [q['문제유형']];
      } else {
        const gapKey = `보기${optionNum}구멍`;
        gaps = (q[gapKey] || '').split(',').map((g) => g.trim()).filter(Boolean);
      }
      if (gaps.length > 0) {
        setGapsCollected((prev) => ({
          ...prev,
          [currentSubject]: [...new Set([...prev[currentSubject], ...gaps])],
        }));
      }
    }

    setUsedIds((prev) => ({
      ...prev,
      [currentSubject]: [...(prev[currentSubject] || []), q['문제ID']],
    }));

    const next = nextStep(adaptiveSession, correct, 8);
    setAdaptiveSession(next);

    if (next.done) finishSubject(currentSubject, next.finalLevel);
  };

  const finishSubject = (subject, finalLevel) => {
    const gaps = gapsCollected[subject] || [];

    if (subject === 'reading') {
      setFinalResults((prev) => ({ ...prev, reading: { lexile: finalLevel, gaps } }));
      if (entryType === 'A') startAdaptive('voca');
      else setStage('phone');
    } else if (subject === 'voca') {
      const label = VOCA_STAGES[Math.max(0, Math.min(17, finalLevel))];
      setFinalResults((prev) => ({ ...prev, voca: { stage: label, gaps } }));
      if (entryType === 'A') startAdaptive('grammar');
      else setStage('phone');
    } else if (subject === 'grammar') {
      setFinalResults((prev) => ({ ...prev, grammar: { stage: finalLevel, gaps } }));
      setStage('phone');
    }
  };

  const submitPhone = async () => {
    setPhoneError('');

    if (!isValidPhone(phone)) {
      setPhoneError('전화번호를 정확히 입력해주세요. (010으로 시작하는 11자리)');
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
        setStage('done');
      }
    } catch (e) {
      setError('제출 실패: ' + e.message);
    }
    setLoading(false);
  };

  // ================= 화면 =================

  if (loading && stage !== 'phone') {
    return <main className="container"><div className="empty">불러오는 중...</div></main>;
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
        <p className="page-sub" style={{ fontSize: 15, lineHeight: 1.7 }}>
          아이의 정확한 영어 실력,
          <br />
          대치동 200명을 가르친 노하우로 진단해드려요.
        </p>

        <div className="card-list" style={{ marginTop: 24 }}>
          <button className="card" onClick={startComprehensive}>
            <div className="card-icon" style={{ background: 'var(--navy)' }}>A</div>
            <div>
              <div className="card-title">종합 레벨테스트</div>
              <div className="card-desc">우리 아이 영어 실력을 전체적으로 확인하고 싶어요</div>
            </div>
            <div className="card-arrow">→</div>
          </button>
          <button className="card" onClick={startByBook}>
            <div className="card-icon" style={{ background: 'var(--teal)' }}>B</div>
            <div>
              <div className="card-title">어떤 교재를 들을지 이미 정하고 왔어요</div>
            </div>
            <div className="card-arrow">→</div>
          </button>
        </div>
      </main>
    );
  }

  // ----- B 1단계: 대분류 -----
  if (stage === 'bookCategory') {
    return (
      <main className="container">
        <button className="back-link" onClick={() => setStage('intro')}>← 처음으로</button>
        <h1 className="page-title">어떤 수업인가요?</h1>

        <div className="card-list">
          {Object.keys(BOOK_CATEGORIES).map((cat) => (
            <button key={cat} className="card" onClick={() => pickCategory(cat)}>
              <div className="card-title" style={{ fontSize: 18 }}>{cat}</div>
              <div className="card-arrow">→</div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ----- B 2단계: 교재 목록 -----
  if (stage === 'bookList' && bookCategory) {
    return (
      <main className="container">
        <button className="back-link" onClick={() => setStage('bookCategory')}>← 뒤로</button>
        <h1 className="page-title">{bookCategory}</h1>
        <p className="page-sub">들으실 교재를 선택해주세요</p>

        <div className="card-list">
          {BOOK_CATEGORIES[bookCategory].books.map((b) => (
            <button key={b} className="card" onClick={() => pickBook(bookCategory)}>
              <div className="card-title">{b}</div>
              <div className="card-arrow">→</div>
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: 26,
            padding: 18,
            background: 'var(--card)',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 14, color: 'var(--med)', marginBottom: 10 }}>
            어떤 교재인지 잘 모르겠다면
          </div>
          <button
            onClick={startComprehensive}
            style={{
              background: 'var(--navy)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            종합 레벨테스트 받기
          </button>
        </div>
      </main>
    );
  }

  // ----- 파닉스 -----
  if (stage === 'phonics' && currentQuestion) {
    const q = currentQuestion;
    return (
      <main className="container">
        <div style={{ textAlign: 'right', fontWeight: 800, color: timer <= 10 ? 'var(--red)' : 'var(--navy)', fontSize: 22, marginBottom: 24 }}>
          {timer}초
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginBottom: 32, lineHeight: 1.6 }}>
          {q['질문']}
        </div>
        <div className="card-list">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className="card" onClick={() => answerPhonics(Number(q['정답번호']) === n)}>
              <div className="card-title" style={{ fontSize: 17 }}>{q[`보기${n}`]}</div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ----- 적응형 -----
  if (stage === 'adaptive' && currentQuestion) {
    const q = currentQuestion;
    return (
      <main className="container">
        <div style={{ textAlign: 'right', fontWeight: 800, color: timer <= 10 ? 'var(--red)' : 'var(--navy)', fontSize: 22, marginBottom: 24 }}>
          {timer}초
        </div>
        {q['지문'] && (
          <div style={{ background: 'var(--card)', padding: 18, borderRadius: 12, marginBottom: 22, fontSize: 16, lineHeight: 1.85 }}>
            {q['지문']}
          </div>
        )}
        <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)', marginBottom: 28, lineHeight: 1.6 }}>
          {q['질문'] || q['문장']}
        </div>
        <div className="card-list">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className="card" onClick={() => answerAdaptive(n)}>
              <div className="card-title" style={{ fontSize: 17 }}>{q[`보기${n}`]}</div>
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
          <div style={{ fontSize: 48, marginBottom: 18 }}>✅</div>
          <h1 className="page-title">시험이 끝났어요!</h1>
          <p className="page-sub" style={{ fontSize: 15 }}>
            결과 리포트를 보내드릴 전화번호를 입력해주세요
          </p>
        </div>

        <div className="field">
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (phoneError) setPhoneError('');
            }}
            placeholder="01012345678"
            style={{ fontSize: 17, padding: '14px 12px' }}
          />
          {phoneError && (
            <p style={{ color: 'var(--red)', fontSize: 14, marginTop: 8, fontWeight: 700 }}>
              {phoneError}
            </p>
          )}
        </div>

        {error && <div className="error-box">{error}</div>}

        <button className="btn btn-teal" onClick={submitPhone} disabled={loading}>
          {loading ? '제출 중...' : '결과 신청하기'}
        </button>
      </main>
    );
  }

  // ----- 제출 완료 (리포트 안 보여줌) -----
  if (stage === 'done') {
    return (
      <main className="container">
        <div style={{ textAlign: 'center', paddingTop: 70 }}>
          <div style={{ fontSize: 56, marginBottom: 22 }}>📩</div>
          <h1 className="page-title" style={{ fontSize: 26 }}>제출이 완료되었어요!</h1>
          <p style={{ fontSize: 16, lineHeight: 1.9, color: 'var(--med)', marginTop: 16 }}>
            선생님이 결과를 확인한 뒤<br />
            남겨주신 번호로 진단 리포트를 보내드릴게요.
          </p>
          <div className="notice" style={{ marginTop: 34, textAlign: 'left' }}>
            <div className="notice-title">잠시만 기다려주세요</div>
            보통 하루 안에 카카오톡으로 결과지를 받아보실 수 있어요.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="empty">문제를 불러오지 못했어요. 새로고침 해주세요.</div>
    </main>
  );
}
