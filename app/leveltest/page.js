'use client';

import LogoLockup from '../components/LogoLockup';

import { useState, useEffect, useRef } from 'react';
import {
  createAdaptiveSession,
  nextStep,
  isValidPhone,
  evaluatePhonicsPlacement,
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


// 문제은행 음성·이미지 지원 — 음성 칸에 텍스트가 있으면 브라우저 TTS로 읽고(파일 불필요),
// http 주소면 그 파일을 재생. 문항이 바뀌면 자동으로 한 번 들려주고 🔊 버튼으로 다시 듣기.
function speakText(text) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.65; // 파닉스 듣기 속도 하향 (2026-09-24)
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

function QuestionMedia({ q }) {
  const audio = String(q['음성파일'] || q['음성'] || '').trim();
  const image = String(q['이미지파일'] || q['이미지'] || '').trim();
  const isUrl = audio.startsWith('http');
  const audioRef = useRef(null);

  const play = () => {
    if (!audio) return;
    if (isUrl) {
      try {
        if (!audioRef.current) audioRef.current = new Audio(audio);
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      } catch (e) {}
    } else {
      speakText(audio);
    }
  };

  useEffect(() => {
    audioRef.current = null;
    if (audio) {
      const t = setTimeout(play, 400); // 화면 뜨고 살짝 뒤에 자동 재생
      return () => { clearTimeout(t); try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} };
    }
  }, [q['문제ID']]);

  if (!audio && !image) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      {image && image.startsWith('http') && (
        <img src={image} alt="" style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 14 }} />
      )}
      {audio && (
        <button
          onClick={play}
          style={{
            width: '100%', padding: '22px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'var(--navy)', color: '#fff', fontSize: 20, fontWeight: 800,
          }}
        >
          🔊 소리 다시 듣기
        </button>
      )}
    </div>
  );
}

export default function LevelTestPage() {
  const [stage, setStage] = useState('intro');

  // 레벨테스트 전용 크림 배경
  const [entryType, setEntryType] = useState(null);
  const [bookCategory, setBookCategory] = useState(null);

  const [questions, setQuestions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [phonicsAnswers, setPhonicsAnswers] = useState([]);
  const [phonicsIdx, setPhonicsIdx] = useState(0);
  const [phonicsPlan, setPhonicsPlan] = useState([]); // 판별형: 1~5단계 × 2문제 출제 순서
  const [phonicsLow, setPhonicsLow] = useState(false); // 1~2단계에서 막힘 → 리딩·단어 최저 시작 + 문법 생략

  const [adaptiveSession, setAdaptiveSession] = useState(null);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [usedIds, setUsedIds] = useState({});
  const [gapsCollected, setGapsCollected] = useState({ reading: [], voca: [], grammar: [] });
  const [finalResults, setFinalResults] = useState({});

  const [phone, setPhone] = useState('');
  const [studentName, setStudentName] = useState('');
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

  // ===== 시작 안내 화면 (A·B 공통, 첫 문제 직전) =====
  const [afterGuide, setAfterGuide] = useState(null); // 'phonics' | {book: cat}

  // ===== A: 종합 시작 =====
  const startComprehensive = async () => {
    setEntryType('A');
    setLoading(true);
    const list = await loadQuestions('phonics');
    setLoading(false);
    // 판별형: 1~5단계 각 2문제 (그 단계 문항 중 랜덤, 부족하면 있는 만큼)
    const plan = [];
    for (let s = 1; s <= 5; s++) {
      const pool = (list || []).filter((q) => Number(q['게이트단계'] || 0) === s);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      plan.push(...shuffled.slice(0, 2));
    }
    setPhonicsPlan(plan);
    setAfterGuide('phonics');
    setStage('guide');
  };

  const beginFromGuide = async () => {
    if (afterGuide === 'phonics') {
      setStage('phonics');
    } else if (afterGuide && afterGuide.book) {
      await beginBookTest(afterGuide.book);
    }
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

  const pickBook = (cat) => {
    setAfterGuide({ book: cat });
    setStage('guide');
  };

  const beginBookTest = async (cat) => {
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

  // ===== 파닉스 전 단계 판별 (2026-09-24 개편: 게이트 폐기) =====
  // 1~5단계 각 2문제, 틀려도 끝까지. 시작 권 = 처음으로 그 단계 만점을 못 받은 단계.
  const answerPhonics = (correct) => {
    const q = phonicsPlan[phonicsIdx];
    const newAnswers = [
      ...phonicsAnswers,
      { stage: Number(q?.['게이트단계'] || 1), correct },
    ];
    setPhonicsAnswers(newAnswers);

    if (phonicsIdx + 1 >= phonicsPlan.length) {
      const { passed, level, low } = evaluatePhonicsPlacement(newAnswers);

      setPhonicsLow(low);
      setFinalResults((prev) => ({
        ...prev,
        phonics: { passed, level },
      }));

      // 어느 경우든 리딩으로 진행 (1~2단계 막힘이면 최저 레벨부터, 문법은 생략)
      startAdaptive('reading', low);
    } else {
      setPhonicsIdx(phonicsIdx + 1);
    }
  };

  const startAdaptive = async (subject, fromLowest = phonicsLow) => {
    setLoading(true);
    await loadQuestions(subject);
    setLoading(false);
    const range = SUBJECT_RANGE[subject];
    const start = fromLowest ? range.min : range.start; // 파닉스 1~2단계 막힘 → 가장 쉬운 것부터
    setAdaptiveSession(createAdaptiveSession(range.min, range.max, start));
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
    if (stage === 'phonics') return phonicsPlan[phonicsIdx] || null;
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
      if (entryType === 'A' && !phonicsLow) startAdaptive('grammar');
      else setStage('phone'); // 파닉스 1~2단계 막힘 → 문법 생략
    } else if (subject === 'grammar') {
      setFinalResults((prev) => ({ ...prev, grammar: { stage: finalLevel, gaps } }));
      setStage('phone');
    }
  };

  const submitPhone = async () => {
    setPhoneError('');

    if (!String(studentName).trim()) {
      setPhoneError('학생 이름을 입력해주세요.');
      return;
    }
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
        body: JSON.stringify({ phone, name: String(studentName).trim(), results: finalResults }),
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

  // ----- 인트로 (2026-09-24 리뉴얼 확정안) -----
  if (stage === 'intro') {
    return (
      <main className="container">
        <LogoLockup withSub />

        <h1 className="page-title" style={{ marginTop: 18 }}>무료 영어 레벨테스트</h1>
        <p className="page-sub" style={{ fontSize: 15, lineHeight: 1.7 }}>
          대치동 상위 1% 선생님이 설계한 정밀 진단
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <span style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--navy)', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999 }}>⏱ 약 5~10분</span>
          <span style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--navy)', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999 }}>📋 진단 리포트 카톡 발송</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
          <button onClick={startComprehensive}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'var(--navy)', border: 'none', borderRadius: 14, padding: '16px 15px', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
            <span style={{ width: 32, height: 32, background: 'var(--yellow)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--navy)', flex: 'none' }}>A</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 16, fontWeight: 800, color: '#fff' }}>종합 레벨테스트</span>
              <span style={{ display: 'block', fontSize: 12, color: '#AFA9EC', marginTop: 2, lineHeight: 1.5 }}>아이 영어 실력을 전체적으로 확인하고 싶어요</span>
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--yellow)', fontSize: 17, flex: 'none' }}>→</span>
          </button>

          <button onClick={startByBook}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: '#EEF0FA', border: '1.5px solid var(--navy)', borderRadius: 14, padding: '16px 15px', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
            <span style={{ width: 32, height: 32, background: 'var(--navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--yellow)', flex: 'none' }}>B</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>교재를 정하고 왔어요</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--med)', marginTop: 2, wordBreak: 'keep-all' }}>그 교재 영역만 빠르게 진단해요</span>
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--navy)', fontSize: 17, flex: 'none' }}>→</span>
          </button>
        </div>

        {/* --- 스크롤 설득 구간 --- */}
        <div className="section-label" style={{ marginTop: 34 }}>이런 리포트를 받아요</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 14, background: '#fff' }}>
          <div style={{ background: '#E1F5EE', borderRadius: 10, padding: '12px 13px', fontSize: 13, lineHeight: 1.75, color: '#04342C', wordBreak: 'keep-all', marginBottom: 8 }}>
            문장은 다 해석하는데, 다 읽고 나면 &lsquo;그래서 무슨 이야기였는지&rsquo;를 말하지 못합니다.
            나무만 보고 숲을 못 보는 겁니다. 이 구멍부터 메우면 긴 지문이 한 덩어리로 읽힙니다.
          </div>
          <div style={{ background: '#FAEEDA', borderRadius: 10, padding: '12px 13px', fontSize: 13, lineHeight: 1.75, color: '#412402', wordBreak: 'keep-all', marginBottom: 8 }}>
            단어를 몰라서 틀리는 게 아닙니다. exciting과 excited처럼 비슷한 단어에서 무너집니다.
            암기의 양이 아니라 정확도의 문제 — 이 구멍부터 메우면 단어 시험 점수가 실전 점수로 바뀝니다.
          </div>
          <div style={{ background: '#FBEAF0', borderRadius: 10, padding: '12px 13px', fontSize: 13, lineHeight: 1.75, color: '#4B1528', wordBreak: 'keep-all', marginBottom: 12 }}>
            문법 설명을 들으면 다 아는데 혼자 풀면 틀립니다. 개념과 문제 풀이가 따로 노는 상태입니다.
            부족한 건 이해가 아니라 적용 훈련량 — 그걸 채우는 게 이 반이 하는 일입니다.
          </div>
          {['점수 뒤에 숨은 \'구멍\' 진단', '줄리아 선생님의 처방 코멘트', '그 구멍을 메워줄 추천 반'].map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 2px' }}>
              <span style={{ width: 20, height: 20, background: '#EEF0FA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', fontSize: 11, flex: 'none' }}>✓</span>
              <span style={{ fontSize: 13.5, wordBreak: 'keep-all' }}>{t}</span>
            </div>
          ))}
        </div>

        <div className="section-label" style={{ marginTop: 26 }}>이 레벨테스트는 줄리아 선생님이 직접 진단합니다</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 15, background: '#fff', fontSize: 13.5, lineHeight: 1.8, wordBreak: 'keep-all' }}>
          문제 설계부터 결과 판독까지 — 대치동에서 200명이 넘는 아이들을 1:1로 가르치며
          구멍을 찾아 메워온 줄리아 선생님이 직접 만들고, 제출된 테스트를 직접 확인해
          리포트를 보내드립니다.
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 11 }}>
            <span style={{ background: '#FBF9F3', border: '1px solid var(--border)', color: 'var(--navy)', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>미국 유학 10년</span>
            <span style={{ background: '#FBF9F3', border: '1px solid var(--border)', color: 'var(--navy)', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>대치동 1:1 지도 200명+</span>
            <span style={{ background: '#FBF9F3', border: '1px solid var(--border)', color: 'var(--navy)', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>김과외 상위 0.02% 선생님</span>
          </div>
        </div>
      </main>
    );
  }

  // ----- 시작 안내 화면 (A·B 공통) -----
  if (stage === 'guide') {
    return (
      <main className="container">
        <LogoLockup />
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '26px 20px', marginTop: 26, textAlign: 'center' }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--navy)', marginBottom: 14 }}>레벨테스트를 시작합니다</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.9, color: 'var(--navy)', wordBreak: 'keep-all', margin: 0 }}>
            처음에는 문제가 쉽게 느껴질 수 있어요.<br />
            풀수록 아이의 실력에 맞춰 문제가 조절됩니다.
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--med)', wordBreak: 'keep-all', margin: '12px 0 0' }}>
            중간에 어려운 문제가 나와도 괜찮아요 —<br />틀리는 것도 진단의 일부입니다.
          </p>
          <button className="btn" style={{ marginTop: 22, width: '100%' }} onClick={beginFromGuide} disabled={loading}>
            {loading ? '준비 중...' : '시작하기'}
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
        <QuizTopBar timer={timer} />
        <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)', marginBottom: 18, lineHeight: 1.6, wordBreak: 'keep-all' }}>
          {q['질문']}
        </div>
        <QuestionMedia q={q} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {[1, 2, 3, 4].map((n) => (
            <OptionBtn key={n} n={n} text={q[`보기${n}`]} onClick={() => answerPhonics(Number(q['정답번호']) === n)} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--light)', textAlign: 'center', marginTop: 16 }}>천천히 읽고 골라도 괜찮아요</div>
      </main>
    );
  }

  // ----- 적응형 -----
  if (stage === 'adaptive' && currentQuestion) {
    const q = currentQuestion;
    return (
      <main className="container">
        <QuizTopBar timer={timer} />
        {q['지문'] && (
          <div style={{ background: '#fff', borderLeft: '3px solid var(--navy)', borderRadius: '0 10px 10px 0', padding: '14px 15px', marginBottom: 18, fontSize: 15, lineHeight: 1.85 }}>
            {q['지문']}
          </div>
        )}
        <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)', marginBottom: 18, lineHeight: 1.6, wordBreak: 'keep-all' }}>
          {q['질문'] || q['문장']}
        </div>
        <QuestionMedia q={q} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {[1, 2, 3, 4].map((n) => (
            <OptionBtn key={n} n={n} text={q[`보기${n}`]} onClick={() => answerAdaptive(n)} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--light)', textAlign: 'center', marginTop: 16 }}>천천히 읽고 골라도 괜찮아요</div>
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
            결과 리포트를 보내드릴 정보를 입력해주세요
          </p>
        </div>

        <div className="field">
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>학생 이름</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => {
              setStudentName(e.target.value);
              if (phoneError) setPhoneError('');
            }}
            placeholder="예: 김하늘"
            style={{ fontSize: 17, padding: '14px 12px' }}
          />
        </div>

        <div className="field">
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>학부모 전화번호</label>
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


// ===== 레벨테스트 리뉴얼 공용 컴포넌트 (2026-09-24) =====

// 로고 락업 — 로고와 학원 이름은 왼쪽 정렬로 붙임. 두 줄 양끝은 자간으로 맞춤 (튀어나오는 줄 없게)
// 문제 화면 상단: 락업 + 타이머 링
function QuizTopBar({ timer }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <LogoLockup />
      <TimerRing timer={timer} />
    </div>
  );
}

// 원형 타이머: 노란 링이 시간 따라 줄어들고 10초 이하 코랄
function TimerRing({ timer }) {
  const R = 19;
  const C = 2 * Math.PI * R;
  const ratio = Math.max(0, Math.min(1, timer / 60));
  const danger = timer <= 10;
  return (
    <div style={{ position: 'relative', width: 46, height: 46, flex: 'none' }}>
      <svg width="46" height="46" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={R} fill="#fff" stroke="#F1EFE8" strokeWidth="4" />
        <circle cx="23" cy="23" r={R} fill="none" stroke={danger ? 'var(--pink)' : 'var(--yellow)'} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} transform="rotate(-90 23 23)" />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: danger ? 'var(--pink)' : 'var(--navy)' }}>{timer}</span>
    </div>
  );
}

// 보기 버튼: 번호 원 + 누르는 순간 네이비 채움 (globals.css .lt-opt)
function OptionBtn({ n, text, onClick }) {
  return (
    <button className="lt-opt" onClick={onClick}>
      <span className="lt-num">{n}</span>
      <span style={{ fontSize: 16, lineHeight: 1.5 }}>{text}</span>
    </button>
  );
}
