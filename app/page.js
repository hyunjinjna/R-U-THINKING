'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  daysSinceLastClass, filterHomeworkByDay, lastClassDate,
  hasClassToday, isCancelledToday, getKoreaNow,
} from '../lib/week';
import { classStartAt } from '../lib/dashboard';

const CATEGORY_STYLE = {
  파닉스: { color: 'var(--red)', emoji: '🔤' },
  리딩: { color: 'var(--teal)', emoji: '📖' },
  문법: { color: 'var(--yellow)', emoji: '✏️' },
  스피킹: { color: 'var(--pink)', emoji: '🗣️' },
};

const MAKEUP_VIDEO_DAYS = 3; // 결석 보강 영상 노출 기간
const ZOOM_LIVE_MINUTES = 30; // 수업 시작 후 몇 분까지 [줌 입장] 유지

const PROFILE_KEY = 'ru_home_profile'; // { 이름, 전화, 반들: [] }

function digitsOnly(str) {
  return String(str || '').replace(/[^0-9]/g, '');
}

function parentPhoneOf(studentRow) {
  return studentRow['학부모 연락처'] || studentRow['학부모전화'] || studentRow['학부모연락처'] || studentRow['전화번호'] || '';
}

function normName(str) {
  return String(str || '').replace(/\s+/g, '').toLowerCase();
}

// classStartAt은 "YYYY-MM-DD" 문자열을 받으므로 now(Date)를 변환
function fmtDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ===== 오늘 수업 판단 =====
function todayInfo(cls, now) {
  if ((cls['종료여부'] || '').trim() === '종료' || cls.status === '커리큘럼 완료') {
    return { type: 'ended' };
  }
  if (cls.status === '개강 전') {
    return { type: 'before-start', 시작일: cls['시작일'] };
  }
  if (isCancelledToday(cls, now)) {
    return { type: 'cancelled' };
  }
  if (hasClassToday(cls, now)) {
    const start = classStartAt(fmtDateStr(now), cls['수업시간']);
    if (!start) return { type: 'today', phase: 'live' };
    const diffMin = Math.floor((now - start) / 60000);
    if (diffMin < 0) return { type: 'today', phase: 'before', start };
    if (diffMin <= ZOOM_LIVE_MINUTES) return { type: 'today', phase: 'live', start };
    return { type: 'today', phase: 'after', start };
  }
  return { type: 'none' };
}

export default function StudentPage() {
  // step: 'loading' | 'onboarding' | 'home' | 'category' | 'class' | 'menu' | 'concept'
  const [step, setStep] = useState('loading');
  const [category, setCategory] = useState(null);
  const [selected, setSelected] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [homeworkPopup, setHomeworkPopup] = useState(false);
  const [students, setStudents] = useState([]);
  const [myName, setMyName] = useState('');
  const [namePopup, setNamePopup] = useState(false);
  const [codePopup, setCodePopup] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeResult, setCodeResult] = useState('');
  const [conceptClass, setConceptClass] = useState(null);

  // ===== 신규: 홈 화면 상태 =====
  const [profile, setProfile] = useState(null); // { 이름, 전화, 반들 }
  const [onboardName, setOnboardName] = useState('');
  const [onboardPhone, setOnboardPhone] = useState('');
  const [onboardError, setOnboardError] = useState('');
  const [statuses, setStatuses] = useState({}); // 반이름 -> {날짜,회차,출석,숙제,재시결과}
  const [makeupVideos, setMakeupVideos] = useState({}); // 반이름 -> {영상URL, 진도}
  const [now, setNow] = useState(getKoreaNow());

  useEffect(() => {
    fetch('/api/students').then((r) => r.json()).then((j) => setStudents(j.students || [])).catch(() => {});
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch (e) {}
    // 시간대별 안내 문구(수업 시작~30분 등) 갱신용
    const timer = setInterval(() => setNow(getKoreaNow()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((json) => {
        setClasses(json.classes || []);
        setError(json.error);
        setIsDemo(json.demo);
        setLoading(false);
      })
      .catch(() => {
        setError('데이터를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, []);

  // 학생·반 데이터가 준비되면 첫 화면 결정
  useEffect(() => {
    if (loading) return;
    if (profile && profile.이름) {
      setStep('home');
    } else {
      setStep('onboarding');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  const activeClasses = classes.filter(
    (c) => (c['종료여부'] || '진행중').trim() !== '종료'
  );

  const categories = [...new Set(activeClasses.map((c) => c['대분류']).filter(Boolean))];
  const classesInCategory = activeClasses.filter((c) => c['대분류'] === category);

  const pointsLink = process.env.NEXT_PUBLIC_POINTS_LINK || '';
  const kakaoLink = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_LINK || '';

  // 내 반 목록 — 학생명단에서 매번 새로 대조 (로그인 후 반이 추가돼도 반영되게)
  const { myClasses, unmatchedNames } = useMemo(() => {
    if (!profile || !profile.이름) return { myClasses: [], unmatchedNames: [] };
    let names = [];
    if (students.length > 0) {
      const matches = students.filter((s) =>
        normName(s['이름']) === normName(profile.이름) && digitsOnly(parentPhoneOf(s)) === profile.전화
      );
      names = [...new Set(
        matches.flatMap((s) => String(s['반이름'] || '').split(/[\n,]/).map((v) => v.trim()).filter(Boolean))
      )];
    }
    // 학생명단을 아직 못 불러온 경우에만 마지막 저장 목록 사용 (오프라인 대비)
    // — 명단이 로드됐는데 매칭이 없으면(퇴원·번호 변경) 빈 목록이 맞음
    if (students.length === 0 && names.length === 0 && profile.반들) names = profile.반들;
    const found = [];
    const unmatched = [];
    for (const n of names) {
      const cls = classes.find((c) => normName(c['반이름']) === normName(n));
      if (cls) found.push(cls);
      else unmatched.push(n);
    }
    return { myClasses: found, unmatchedNames: unmatched };
  }, [profile, classes, students]);

  // 새로 대조한 반 목록을 기기에도 갱신 저장
  useEffect(() => {
    if (!profile || myClasses.length === 0) return;
    const names = myClasses.map((c) => c['반이름']);
    if (JSON.stringify(names) !== JSON.stringify(profile.반들 || [])) {
      const updated = { ...profile, 반들: names };
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(updated)); } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myClasses]);

  // 밀린 숙제·결석 보강 조회 (반 구성이 바뀌면 다시 조회)
  const myClassKey = myClasses.map((c) => c['반이름']).join(',');
  useEffect(() => {
    if (!profile || !profile.이름 || !myClassKey) return;
    fetch(`/api/student-status?이름=${encodeURIComponent(profile.이름)}&반들=${encodeURIComponent(myClassKey)}`)
      .then((r) => r.json())
      .then((j) => setStatuses(j.statuses || {}))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, myClassKey]);

  // 결석 보강 영상: 최근 기록이 결석이고 3일 이내인 반만 조회
  useEffect(() => {
    const targets = myClasses.filter((c) => {
      const s = statuses[c['반이름']];
      if (!s || s.출석 !== '결석' || !s.날짜) return false;
      const days = Math.floor((now - new Date(s.날짜)) / 86400000);
      return days >= 0 && days < MAKEUP_VIDEO_DAYS;
    });
    targets.forEach((c) => {
      if (makeupVideos[c['반이름']] !== undefined) return;
      const s = statuses[c['반이름']];
      fetch(`/api/makeup-video?반=${encodeURIComponent(c['반이름'])}&회차=${encodeURIComponent(s.회차)}`)
        .then((r) => r.json())
        .then((j) => setMakeupVideos((prev) => ({ ...prev, [c['반이름']]: j })))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myClasses, statuses]);

  if (loading || step === 'loading') {
    return (
      <main className="container">
        <div className="empty">불러오는 중...</div>
      </main>
    );
  }

  // ===== 개념 설명하기 =====
  if (step === 'concept' && conceptClass) {
    return (
      <ConceptMode
        classData={conceptClass}
        onBack={() => setStep(profile ? 'home' : 'menu')}
      />
    );
  }

  const classStudentsOf = (cls) => students.filter((st) =>
    String(st['반이름'] || '').split(/[\n,]/).map((v) => normName(v)).includes(normName(cls['반이름']))
  );

  const openZoom = (cls, name) => {
    fetch('/api/attendance-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 반이름: cls['반이름'], 이름: name }),
    }).catch(() => {});
    window.open(cls['줌링크'], '_blank', 'noopener');
  };

  const enterZoomFor = (cls) => {
    const name = (profile && profile.이름) || myName;
    if (name) { openZoom(cls, name); return; }
    const cs = classStudentsOf(cls);
    if (cs.length > 0) { setSelected(cls); setNamePopup(true); }
    else window.open(cls['줌링크'], '_blank', 'noopener');
  };

  // ===== 온보딩: 이름 + 학부모 연락처로 학생명단 대조 =====
  const submitOnboarding = () => {
    const name = onboardName.trim();
    const phoneDigits = digitsOnly(onboardPhone);
    if (!name) { setOnboardError('이름을 입력해줘!'); return; }
    if (phoneDigits.length < 8) { setOnboardError('학부모님 전화번호를 정확히 입력해줘!'); return; }
    if (students.length === 0) {
      setOnboardError('명단을 불러오는 중이에요. 잠깐 기다렸다가 다시 눌러줘!');
      return;
    }

    const matches = students.filter((s) =>
      normName(s['이름']) === normName(name) && digitsOnly(parentPhoneOf(s)) === phoneDigits
    );

    if (matches.length === 0) {
      setOnboardError('학생명단에서 못 찾았어요. 이름·전화번호를 다시 확인하거나, 선생님께 문의해줘!');
      return;
    }

    const 반들 = [...new Set(
      matches.flatMap((s) => String(s['반이름'] || '').split(/[\n,]/).map((v) => v.trim()).filter(Boolean))
    )];

    const newProfile = { 이름: name, 전화: phoneDigits, 반들 };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile)); } catch (e) {}
    try { localStorage.setItem('ru_student_name', name); } catch (e) {}
    setProfile(newProfile);
    setMyName(name);
    setOnboardError('');
    setStep('home');
  };

  if (step === 'onboarding') {
    return (
      <main className="container">
        <div className="logo-row">
          <img src="/logo.png" alt="R U Thinking?" className="site-logo" />
          <span className="badge">R U Thinking?</span>
        </div>
        <h1 className="page-title">처음 왔구나! 👋</h1>
        <p className="page-sub">이름이랑 학부모님 전화번호를 알려줘. 다음부터는 자동으로 열려!</p>

        {onboardError && <div className="error-box">{onboardError}</div>}

        <div className="field">
          <label>이름</label>
          <input value={onboardName} onChange={(e) => setOnboardName(e.target.value)} placeholder="예: 김민준" />
        </div>
        <div className="field">
          <label>학부모님 전화번호</label>
          <input value={onboardPhone} onChange={(e) => setOnboardPhone(e.target.value)} placeholder="010-0000-0000" inputMode="numeric" />
        </div>
        <button className="btn" onClick={submitOnboarding}>시작하기</button>

        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <button className="back-link" style={{ background: 'none', border: 'none' }} onClick={() => setStep('category')}>
            반 직접 찾기 →
          </button>
        </div>
      </main>
    );
  }

  // ===== 홈 화면 =====
  if (step === 'home') {
    return (
      <HomeScreen
        profile={profile}
        myClasses={myClasses}
        unmatchedNames={unmatchedNames}
        statuses={statuses}
        makeupVideos={makeupVideos}
        now={now}
        pointsLink={pointsLink}
        kakaoLink={kakaoLink}
        onEnterZoom={enterZoomFor}
        onOpenConcept={(cls) => { setConceptClass(cls); setStep('concept'); }}
        onOpenCode={(cls) => { setSelected(cls); setCodeInput(''); setCodeResult(''); setCodePopup(true); }}
        onFindClass={() => setStep('category')}
        onResetProfile={() => {
          try { localStorage.removeItem(PROFILE_KEY); } catch (e) {}
          setProfile(null);
          setStatuses({});
          setMakeupVideos({});
          setOnboardName('');
          setOnboardPhone('');
          setStep('onboarding');
        }}
        codePopup={codePopup}
        setCodePopup={setCodePopup}
        codeInput={codeInput}
        setCodeInput={setCodeInput}
        codeResult={codeResult}
        myName={profile ? profile.이름 : myName}
        submitCode={async () => {
          if (!codeInput.trim() || !selected) return;
          setCodeResult('확인 중...');
          try {
            const res = await fetch('/api/secret-code', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 반이름: selected['반이름'], 이름: (profile ? profile.이름 : myName), 코드: codeInput.trim() }),
            });
            const j = await res.json();
            if (!j.ok) setCodeResult(j.error || '오류가 났어요');
            else setCodeResult(j.correct ? '🎉 정답! 잘 들었네!' : '음, 다시 한 번 생각해볼까?');
          } catch (e) { setCodeResult('연결이 안 돼요. 잠시 후 다시!'); }
        }}
      />
    );
  }

  const classStudents = selected ? classStudentsOf(selected) : [];

  const logAndOpen = (name) => {
    try { localStorage.setItem('ru_student_name', name); } catch (e) {}
    setMyName(name);
    setNamePopup(false);
    openZoom(selected, name);
  };

  const enterZoom = () => {
    const known = myName && classStudents.some((st) => st['이름'] === myName);
    if (known) logAndOpen(myName);
    else if (classStudents.length > 0) setNamePopup(true);
    else window.open(selected['줌링크'], '_blank', 'noopener');
  };

  const submitCode = async () => {
    if (!myName) { setCodeResult('먼저 "수업 입장"에서 이름을 골라줘!'); return; }
    if (!codeInput.trim()) return;
    setCodeResult('확인 중...');
    try {
      const res = await fetch('/api/secret-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 반이름: selected['반이름'], 이름: myName, 코드: codeInput.trim() }),
      });
      const j = await res.json();
      if (!j.ok) setCodeResult(j.error || '오류가 났어요');
      else setCodeResult(j.correct ? '🎉 정답! 잘 들었네!' : '음, 다시 한 번 생각해볼까?');
    } catch (e) { setCodeResult('연결이 안 돼요. 잠시 후 다시!'); }
  };

  // ===== 3단계: 반 메뉴 (반 직접 찾기 경로) =====
  if (step === 'menu' && selected) {
    const items = [];

    if (selected['줌링크']) {
      items.push({
        label: '수업 입장',
        desc: myName ? `${myName}, 줌으로 접속하기` : '줌으로 접속하기',
        emoji: '🎥',
        color: 'var(--navy)',
        onClick: () => enterZoom(),
      });
    }

    if (selected['시크릿코드'] && selected.status === '진행중') {
      items.push({
        label: '시크릿코드 입력',
        desc: '수업 중 선생님이 말한 코드를 적어줘',
        emoji: '🔑',
        color: 'var(--purple)',
        onClick: () => { setCodeInput(''); setCodeResult(''); setCodePopup(true); },
      });
    }

    if (selected['클래스카드URL']) {
      items.push({
        label: '단어 공부',
        desc: '클래스카드로 이동',
        emoji: '📚',
        color: 'var(--teal)',
        href: selected['클래스카드URL'],
      });
    }

    const dayOffset = daysSinceLastClass(selected);
    const hw = filterHomeworkByDay(selected['숙제범위'], dayOffset, lastClassDate(selected));

    if (selected['숙제범위']) {
      const lockedCount = hw.locked.length;
      items.push({
        label: '이번 회차 숙제',
        desc: lockedCount > 0
          ? `오늘 할 숙제 보기 (${lockedCount}개는 나중에 열려요)`
          : '눌러서 크게 보기',
        emoji: '📝',
        color: 'var(--yellow)',
        onClick: () => setHomeworkPopup(true),
      });
    }

    if (selected['개념설명숙제']) {
      items.push({
        label: '개념 설명하기',
        desc: 'AI 선생님에게 오늘 배운 거 설명하기',
        emoji: '🗣️',
        color: 'var(--purple)',
        onClick: () => { setConceptClass(selected); setStep('concept'); },
      });
    }

    if (selected['필기인증링크']) {
      items.push({
        label: '필기 인증샷',
        desc: '오늘 쓴 필기 올리기',
        emoji: '📸',
        color: 'var(--pink)',
        href: selected['필기인증링크'],
      });
    }

    if (pointsLink) {
      items.push({
        label: '내 포인트 보기',
        desc: '모은 포인트 확인하기',
        emoji: '⭐',
        color: 'var(--red)',
        href: pointsLink,
      });
    }

    if (kakaoLink) {
      items.push({
        label: '질문하기',
        desc: '선생님께 카톡으로 문의하기',
        emoji: '💬',
        color: '#FEE500',
        textColor: '#3A1D1D',
        href: kakaoLink,
      });
    }

    return (
      <main className="container">
        <button className="back-link" onClick={() => setStep('class')}>
          ← 반 목록으로
        </button>

        <h1 className="page-title">{selected['반이름']}</h1>
        <p className="page-sub">
          {selected['수업요일']} {selected['수업시간']}
          {selected['진도'] && ` · ${selected['진도']}`}
        </p>

        {selected.status === '개강 전' && (
          <div className="notice">아직 개강 전이에요. 첫 수업일에 다시 들어와줘!</div>
        )}

        {selected.status === '커리큘럼 완료' && (
          <div className="notice">이 반의 모든 수업이 끝났어요. 수고했어요!</div>
        )}

        {items.length === 0 ? (
          <div className="empty">아직 준비된 항목이 없어요.</div>
        ) : (
          <div className="card-list">
            {items.map((item, i) => {
              const iconStyle = {
                background: item.color,
                color: item.textColor || '#fff',
              };

              if (item.text) {
                return (
                  <div key={i} className="card" style={{ cursor: 'default' }}>
                    <div className="card-icon" style={iconStyle}>{item.emoji}</div>
                    <div>
                      <div className="card-title">{item.label}</div>
                      <div className="card-desc">{item.desc}</div>
                    </div>
                  </div>
                );
              }

              if (item.onClick) {
                return (
                  <button key={i} className="card" onClick={item.onClick}>
                    <div className="card-icon" style={iconStyle}>{item.emoji}</div>
                    <div>
                      <div className="card-title">{item.label}</div>
                      <div className="card-desc">{item.desc}</div>
                    </div>
                    <div className="card-arrow">→</div>
                  </button>
                );
              }

              return (
                <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className="card">
                  <div className="card-icon" style={iconStyle}>{item.emoji}</div>
                  <div>
                    <div className="card-title">{item.label}</div>
                    <div className="card-desc">{item.desc}</div>
                  </div>
                  <div className="card-arrow">→</div>
                </a>
              );
            })}
          </div>
        )}

        {namePopup && (
          <div className="modal-backdrop" onClick={() => setNamePopup(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setNamePopup(false)}>✕</button>
              <h2 style={{ marginTop: 0 }}>누구야? 이름을 눌러줘</h2>
              <div className="card-list">
                {classStudents.map((st) => (
                  <button key={st['이름']} className="card" onClick={() => logAndOpen(st['이름'])}>
                    <div className="card-title">{st['이름']}</div>
                    <div className="card-arrow">→</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {codePopup && (
          <div className="modal-backdrop" onClick={() => setCodePopup(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setCodePopup(false)}>✕</button>
              <h2 style={{ marginTop: 0 }}>🔑 시크릿코드</h2>
              <p style={{ color: 'var(--med)', fontSize: 14 }}>{myName ? `${myName}, 오늘 선생님이 말한 코드는?` : '먼저 "수업 입장"에서 이름을 골라줘!'}</p>
              <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCode()} placeholder="코드 입력" style={{ width: '100%', padding: 12, fontSize: 18, border: '2px solid var(--border)', borderRadius: 10 }} />
              <button className="btn" style={{ marginTop: 10 }} onClick={submitCode}>확인</button>
              {codeResult && <div className="notice" style={{ marginTop: 10 }}>{codeResult}</div>}
            </div>
          </div>
        )}

        {homeworkPopup && (
          <div className="modal-backdrop" onClick={() => setHomeworkPopup(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setHomeworkPopup(false)}>
                ×
              </button>
              <div className="modal-title">이번 회차 숙제</div>

              {hw.visible.length > 0 ? (
                <div className="card-list">
                  {hw.visible.map((item, i) => (
                    <HomeworkLine key={i} item={item} />
                  ))}
                </div>
              ) : (
                <div className="modal-body" style={{ color: 'var(--med)' }}>
                  오늘 할 숙제가 아직 열리지 않았어요.
                </div>
              )}

              {hw.locked.length > 0 && (
                <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--med)', marginBottom: 8 }}>
                    아직 열리지 않은 숙제
                  </div>
                  {hw.locked.map((l, i) => (
                    <div key={i} className="locked-item">
                      <span>🔒</span>
                      <span>{l.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 13 }}>
                        {l.opensWeekday ? `${l.opensWeekday}요일에 열려요` : `수업 ${l.opensAt}일 뒤 열림`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  // ===== 2단계: 반 목록 =====
  if (step === 'class' && category) {
    const style = CATEGORY_STYLE[category] || { color: 'var(--navy)', emoji: '📘' };

    return (
      <main className="container">
        <button className="back-link" onClick={() => setStep('category')}>
          ← 처음으로
        </button>

        <h1 className="page-title">{category}</h1>
        <p className="page-sub">우리 반을 선택해줘!</p>

        {classesInCategory.length === 0 ? (
          <div className="empty">진행 중인 반이 없어요.</div>
        ) : (
          <div className="card-list">
            {classesInCategory.map((c, i) => (
              <button
                key={i}
                className="card"
                onClick={() => {
                  setSelected(c);
                  setStep('menu');
                }}
              >
                <div className="card-icon" style={{ background: style.color }}>
                  {style.emoji}
                </div>
                <div>
                  <div className="card-title">{c['반이름']}</div>
                  <div className="card-desc">
                    {c['수업요일']} {c['수업시간']}
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

  // ===== 1단계: 대분류 (반 직접 찾기) =====
  return (
    <main className="container">
      {profile && (
        <button className="back-link" onClick={() => setStep('home')}>
          ← 홈으로
        </button>
      )}
      <div className="logo-row">
        <img src="/logo.png" alt="R U Thinking?" className="site-logo" />
        <span className="badge">R U Thinking?</span>
      </div>
      <h1 className="page-title">우리 반 찾기</h1>
      <p className="page-sub">어떤 수업을 듣고 있나요?</p>

      {isDemo && (
        <div className="notice">
          지금은 예시 데이터로 보고 있어요. 스프레드시트를 연결하면 실제 반이 나타납니다.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {categories.length === 0 ? (
        <div className="empty">등록된 반이 없어요.</div>
      ) : (
        <div className="card-list">
          {categories.map((cat) => {
            const style = CATEGORY_STYLE[cat] || { color: 'var(--navy)', emoji: '📘' };
            const count = activeClasses.filter((c) => c['대분류'] === cat).length;

            return (
              <button
                key={cat}
                className="card"
                onClick={() => {
                  setCategory(cat);
                  setStep('class');
                }}
              >
                <div className="card-icon" style={{ background: style.color }}>
                  {style.emoji}
                </div>
                <div>
                  <div className="card-title">{cat}</div>
                  <div className="card-desc">{count}개 반</div>
                </div>
                <div className="card-arrow">→</div>
              </button>
            );
          })}
        </div>
      )}

      {kakaoLink && (
        <>
          <div className="section-label">문의하기</div>
          <a href={kakaoLink} target="_blank" rel="noopener noreferrer" className="card">
            <div className="card-icon" style={{ background: '#FEE500', color: '#3A1D1D' }}>
              💬
            </div>
            <div>
              <div className="card-title">질문하기</div>
              <div className="card-desc">카카오톡으로 문의하기</div>
            </div>
            <div className="card-arrow">→</div>
          </a>
        </>
      )}
    </main>
  );
}

// ===== 숙제 한 줄 표시 (링크 있으면 버튼) =====
function HomeworkLine({ item }) {
  if (item.link) {
    return (
      <a href={item.link} target="_blank" rel="noopener noreferrer" className="card">
        <div className="card-icon" style={{ background: 'var(--yellow)', color: '#fff' }}>📝</div>
        <div className="card-title" style={{ fontSize: 16 }}>{item.title}</div>
        <div className="card-arrow">→</div>
      </a>
    );
  }
  return (
    <div className="card" style={{ cursor: 'default' }}>
      <div className="card-icon" style={{ background: 'var(--yellow)', color: '#fff' }}>📝</div>
      <div className="card-title" style={{ fontSize: 16 }}>{item.title}</div>
    </div>
  );
}

// ===== 홈 화면 컴포넌트 =====
function HomeScreen({
  profile, myClasses, unmatchedNames, statuses, makeupVideos, now, pointsLink, kakaoLink,
  onEnterZoom, onOpenConcept, onOpenCode, onFindClass, onResetProfile,
  codePopup, setCodePopup, codeInput, setCodeInput, codeResult, myName, submitCode,
}) {
  const ongoingClasses = myClasses.filter((c) => c.status === '진행중');

  // 오늘 눈에 띄게 보여줄 카드가 있는 반들
  const todayCards = myClasses
    .map((c) => ({ cls: c, info: todayInfo(c, now) }))
    .filter(({ info }) => info.type !== 'none');

  const overdue = ongoingClasses.filter((c) => statuses[c['반이름']]?.숙제 === 'X');

  const makeupCards = ongoingClasses.filter((c) => {
    const v = makeupVideos[c['반이름']];
    return v && v.영상URL;
  });

  return (
    <main className="container">
      <div className="logo-row">
        <img src="/logo.png" alt="R U Thinking?" className="site-logo" />
        <span className="badge">R U Thinking?</span>
      </div>
      <h1 className="page-title">안녕, {profile.이름}! 👋</h1>
      <p className="page-sub">오늘도 화이팅!</p>

      {unmatchedNames && unmatchedNames.length > 0 && (
        <div className="notice">
          학생명단에는 있는데 운영시트에서 못 찾은 반이에요: <b>{unmatchedNames.join(', ')}</b>
          <br />반이름 표기가 운영시트와 같은지 확인해주세요. (선생님용 안내)
        </div>
      )}

      {myClasses.length === 0 && (!unmatchedNames || unmatchedNames.length === 0) && (
        <div className="notice">
          명단에서 내 반을 못 찾았어요. 아래 "다시 입력하기"로 이름·전화번호를 확인하거나, 선생님께 문의해줘!
        </div>
      )}

      {/* ===== 오늘의 수업 ===== */}
      <div className="section-label" style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>오늘의 수업</div>
      {todayCards.length === 0 ? (
        <div className="notice" style={{ fontSize: 15 }}>오늘은 예정된 수업이 없어요. 숙제부터 확인해볼까? 😊</div>
      ) : (
        <div className="card-list">
          {todayCards.map(({ cls, info }, i) => (
            <TodayCard key={i} cls={cls} info={info} onEnterZoom={onEnterZoom} />
          ))}
        </div>
      )}

      {/* ===== 결석 보강 영상 ===== */}
      {makeupCards.map((c) => (
        <div key={c['반이름']} className="card" style={{ marginTop: 12 }}>
          <div className="card-icon" style={{ background: 'var(--pink)', color: '#fff' }}>🎬</div>
          <div style={{ flex: 1 }}>
            <div className="card-title">{c['반이름']} 결석 보강</div>
            <div className="card-desc">지난 수업 놓쳤지? 영상으로 다시 볼 수 있어! (3일간)</div>
          </div>
          <a href={makeupVideos[c['반이름']].영상URL} target="_blank" rel="noopener noreferrer" className="btn" style={{ width: 'auto', padding: '10px 16px', flexShrink: 0 }}>
            보기
          </a>
        </div>
      ))}

      {/* ===== 밀린 숙제 ===== */}
      {overdue.length > 0 && (
        <>
          <div className="section-label" style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>⚠️ 밀린 숙제</div>
          <div className="card-list">
            {overdue.map((c) => (
              <div key={c['반이름']} className="card" style={{ cursor: 'default', borderColor: 'var(--red)' }}>
                <div className="card-icon" style={{ background: 'var(--red)' }}>❗</div>
                <div>
                  <div className="card-title">{c['반이름']}</div>
                  <div className="card-desc">아직 다 못한 숙제가 있어요. 아래에서 확인해줘!</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== 반별 숙제·메뉴 섹션 ===== */}
      {ongoingClasses.length > 0 && (
        <>
          <div className="section-label" style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>내 숙제</div>
          <div className="card-list" style={{ gap: 20 }}>
            {ongoingClasses.map((c) => (
              <ClassSection
                key={c['반이름']}
                cls={c}
                onOpenConcept={onOpenConcept}
                onOpenCode={onOpenCode}
              />
            ))}
          </div>
        </>
      )}

      {pointsLink && (
        <>
          <div className="section-label" style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>포인트</div>
          <a href={pointsLink} target="_blank" rel="noopener noreferrer" className="card">
            <div className="card-icon" style={{ background: 'var(--red)' }}>⭐</div>
            <div>
              <div className="card-title">내 포인트 보기</div>
              <div className="card-desc">모은 포인트 확인하기</div>
            </div>
            <div className="card-arrow">→</div>
          </a>
        </>
      )}

      {kakaoLink && (
        <>
          <div className="section-label" style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>문의하기</div>
          <a href={kakaoLink} target="_blank" rel="noopener noreferrer" className="card">
            <div className="card-icon" style={{ background: '#FEE500', color: '#3A1D1D' }}>💬</div>
            <div>
              <div className="card-title">질문하기</div>
              <div className="card-desc">선생님께 카톡으로 문의하기</div>
            </div>
            <div className="card-arrow">→</div>
          </a>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
        <button onClick={onResetProfile} style={{ background: 'none', border: 'none', color: 'var(--light)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
          내가 아니에요? 다시 입력하기
        </button>
        <button onClick={onFindClass} style={{ background: 'none', border: 'none', color: 'var(--light)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
          반 직접 찾기
        </button>
      </div>

      {codePopup && (
        <div className="modal-backdrop" onClick={() => setCodePopup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCodePopup(false)}>✕</button>
            <h2 style={{ marginTop: 0 }}>🔑 시크릿코드</h2>
            <p style={{ color: 'var(--med)', fontSize: 14 }}>{myName}, 오늘 선생님이 말한 코드는?</p>
            <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCode()} placeholder="코드 입력" style={{ width: '100%', padding: 12, fontSize: 18, border: '2px solid var(--border)', borderRadius: 10 }} />
            <button className="btn" style={{ marginTop: 10 }} onClick={submitCode}>확인</button>
            {codeResult && <div className="notice" style={{ marginTop: 10 }}>{codeResult}</div>}
          </div>
        </div>
      )}
    </main>
  );
}

function TodayCard({ cls, info, onEnterZoom }) {
  if (info.type === 'ended') {
    return (
      <div className="card" style={{ cursor: 'default' }}>
        <div className="card-icon" style={{ background: 'var(--light)' }}>🎓</div>
        <div>
          <div className="card-title">{cls['반이름']} 끝!</div>
          <div className="card-desc">다음 반은 선생님이 알려줄 거예요</div>
        </div>
      </div>
    );
  }
  if (info.type === 'before-start') {
    return (
      <div className="card" style={{ cursor: 'default' }}>
        <div className="card-icon" style={{ background: 'var(--teal)' }}>📅</div>
        <div>
          <div className="card-title">{cls['반이름']}</div>
          <div className="card-desc">{info.시작일} 첫 수업</div>
        </div>
      </div>
    );
  }
  if (info.type === 'cancelled') {
    return (
      <div className="card" style={{ cursor: 'default' }}>
        <div className="card-icon" style={{ background: 'var(--yellow)' }}>💤</div>
        <div>
          <div className="card-title">{cls['반이름']}</div>
          <div className="card-desc">오늘 휴강이에요</div>
        </div>
      </div>
    );
  }
  // type === 'today'
  if (info.phase === 'before') {
    return (
      <>
        <button className="card" onClick={() => onEnterZoom(cls)}>
          <div className="card-icon" style={{ background: 'var(--navy)' }}>🎥</div>
          <div>
            <div className="card-title">{cls['반이름']} 수업 입장</div>
            <div className="card-desc">{cls['수업시간']} 수업 · 미리 들어갈 수 있어요</div>
          </div>
          <div className="card-arrow">→</div>
        </button>
        <ZoomTroubleHint />
      </>
    );
  }
  if (info.phase === 'after') {
    return (
      <div className="card" style={{ cursor: 'default' }}>
        <div className="card-icon" style={{ background: 'var(--teal)' }}>📝</div>
        <div>
          <div className="card-title">{cls['반이름']} 수업 끝!</div>
          <div className="card-desc">이제 숙제하자</div>
        </div>
      </div>
    );
  }
  // live
  return (
    <>
      <button className="card" onClick={() => onEnterZoom(cls)}>
        <div className="card-icon" style={{ background: 'var(--navy)' }}>🎥</div>
        <div>
          <div className="card-title">{cls['반이름']} 수업 입장</div>
          <div className="card-desc">{cls['진도'] && `${cls['진도']} · `}지금 줌으로 들어가요</div>
        </div>
        <div className="card-arrow">→</div>
      </button>
      <ZoomTroubleHint />
    </>
  );
}

function ZoomTroubleHint() {
  return (
    <div style={{ fontSize: 11, color: 'var(--light)', margin: '-6px 0 0 4px' }}>
      줌이 안 열려요? 인터넷 연결을 확인하거나 선생님께 카톡으로 알려줘!
    </div>
  );
}

function ClassSection({ cls, onOpenConcept, onOpenCode }) {
  const dayOffset = daysSinceLastClass(cls);
  const hw = filterHomeworkByDay(cls['숙제범위'], dayOffset, lastClassDate(cls));

  // 반 섹션 안 큰 버튼 공통 스타일 (폰트 키우기 피드백 반영)
  const bigChip = (bg, color) => ({
    background: bg, color, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 700, padding: '12px 16px', borderRadius: 12,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  });

  return (
    <div style={{ border: '2px solid var(--border)', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="tag" style={{ fontSize: 13, padding: '4px 11px' }}>{cls['대분류'] || '수업'}</span>
        <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 18 }}>{cls['반이름']}</span>
      </div>
      {cls['진도'] && <div style={{ fontSize: 14, color: 'var(--med)', marginBottom: 10 }}>{cls['진도']}</div>}

      {hw.visible.length === 0 && hw.locked.length === 0 && (
        <div style={{ fontSize: 15, color: 'var(--light)', marginBottom: 6 }}>오늘 확인할 숙제가 없어요.</div>
      )}

      {hw.visible.map((item, i) => (
        <HomeworkLine key={i} item={item} />
      ))}

      {hw.locked.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {hw.locked.map((l, i) => (
            <div key={i} className="locked-item" style={{ padding: '6px 0', fontSize: 15 }}>
              <span>🔒</span>
              <span>{l.title}</span>
              <span style={{ marginLeft: 'auto', fontSize: 13 }}>
                {l.opensWeekday ? `${l.opensWeekday}요일에 열려요` : `${l.opensAt}일 뒤 열림`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        {cls['클래스카드URL'] && (
          <a href={cls['클래스카드URL']} target="_blank" rel="noopener noreferrer" style={bigChip('var(--soft-teal)', 'var(--teal)')}>
            📚 단어 공부
          </a>
        )}
        {cls['개념설명숙제'] && (
          <button onClick={() => onOpenConcept(cls)} style={bigChip('#f3e8ff', 'var(--purple)')}>
            🗣️ 개념 설명하기
          </button>
        )}
        {cls['시크릿코드'] && cls.status === '진행중' && (
          <button onClick={() => onOpenCode(cls)} style={bigChip('#f3e8ff', 'var(--purple)')}>
            🔑 시크릿코드
          </button>
        )}
        {cls['필기인증링크'] && (
          <a href={cls['필기인증링크']} target="_blank" rel="noopener noreferrer" style={bigChip('#ffe4ec', '#d6336c')}>
            📸 필기 인증샷
          </a>
        )}
      </div>
    </div>
  );
}

// ===== 개념 설명하기 컴포넌트 =====
function ConceptMode({ classData, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const isEnglish = String(classData['설명언어'] || '').includes('영어');

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      if (recRef.current) {
        try { const r = recRef.current; recRef.current = null; r.stop(); } catch (e) {}
        setListening(false);
      }

      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          concept: classData['개념설명숙제'],
          language: classData['설명언어'],
        }),
      });
      const json = await res.json();
      setMessages([...next, { role: 'assistant', content: json.text || json.error || '응답 없음' }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: '오류가 발생했어요. 다시 시도해줘!' }]);
    }
    setLoading(false);
  };

  const listen = () => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      alert('이 브라우저에서는 음성 인식이 안 돼요. 크롬을 사용해주세요!');
      return;
    }
    // 이미 듣고 있으면 중지
    if (recRef.current) {
      try { recRef.current.stop(); } catch (e) {}
      recRef.current = null;
      setListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = isEnglish ? 'en-US' : 'ko-KR';
    rec.continuous = true;      // 말 끊겨도 계속 듣기
    rec.interimResults = true;  // 말하는 중에도 화면에 표시

    let finalText = '';

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };

    rec.onerror = (e) => {
      // no-speech 같은 일시 오류는 무시하고 계속
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      recRef.current = null;
      setListening(false);
    };

    rec.onend = () => {
      // 사용자가 멈춘 게 아니면 자동으로 다시 시작
      if (recRef.current) {
        try { rec.start(); } catch (err) { recRef.current = null; setListening(false); }
      } else {
        setListening(false);
      }
    };

    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--purple)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', cursor: 'pointer', fontSize: 14 }}>
          ←
        </button>
        <span style={{ fontSize: 20 }}>🗣️</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>개념 설명하기</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
            {classData['반이름']} · {isEnglish ? 'English' : '한국어'}
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 50 }}>
            <div style={{ fontSize: 46, marginBottom: 12 }}>🗣️</div>
            <p style={{ color: 'var(--navy)', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              오늘 배운 거 설명해볼까?
            </p>
            <p style={{ color: 'var(--med)', fontSize: 13, marginBottom: 20 }}>
              {isEnglish ? 'Explain in English!' : '선생님한테 설명하듯이 말해줘!'}
            </p>
            <button
              onClick={() => send(isEnglish ? "I'm ready!" : '시작할게요!')}
              style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              시작하기
            </button>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: 14,
              background: m.role === 'user' ? 'var(--navy)' : 'var(--card)',
              color: m.role === 'user' ? '#fff' : 'var(--dark)',
              fontSize: 14,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'var(--card)', padding: '10px 18px', borderRadius: 14, color: 'var(--med)', fontSize: 14 }}>
              듣고 있어요...
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: 12, display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={listen}
          style={{
            width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer',
            fontSize: 20, flexShrink: 0,
            background: listening ? 'var(--red)' : 'var(--purple)',
            color: '#fff',
            animation: listening ? 'pulse 1s infinite' : 'none',
          }}
        >
          🎤
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder={listening ? '듣고 있어요 (다 말하면 마이크를 다시 눌러줘)' : '말하거나 입력해줘!'}
          style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px', fontSize: 14, outline: 'none' }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          style={{
            width: 46, height: 46, borderRadius: 12, border: 'none',
            cursor: input.trim() ? 'pointer' : 'default',
            fontSize: 18, flexShrink: 0,
            background: input.trim() ? 'var(--navy)' : 'var(--border)',
            color: '#fff',
          }}
        >
          ↑
        </button>
      </div>
    </main>
  );
}
