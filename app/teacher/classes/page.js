'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { hasClassToday, getTodayName } from '../../../lib/week';

const CATEGORY_COLOR = {
  파닉스: 'var(--red)',
  리딩: 'var(--teal)',
  문법: 'var(--yellow)',
  스피킹: 'var(--pink)',
};

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelDates, setCancelDates] = useState(['']);
  const [cancelAll, setCancelAll] = useState(false);
  const [cancelMsg, setCancelMsg] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [overdue, setOverdue] = useState({}); // 반이름 -> 숙제 X 학생 수
  const [recorded, setRecorded] = useState([]); // 대시보드에 기록이 있는 반 목록

  const submitCancel = async () => {
    const dates = cancelDates.filter(Boolean);
    if (dates.length === 0) { setCancelMsg('날짜를 골라주세요.'); return; }
    const targets = cancelAll
      ? classes.filter((c) => (c['종료여부'] || '진행중').trim() !== '종료').map((c) => c['반이름'])
      : [selected['반이름']];
    setCancelBusy(true); setCancelMsg('');
    const res = await fetch('/api/cancel-class', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 반이름들: targets, 날짜들: dates }),
    });
    const j = await res.json();
    setCancelBusy(false);
    if (j.ok) {
      setCancelMsg(`휴강 등록 완료 (${targets.length}개 반, ${dates.join(', ')}). 회차 계산에 바로 반영돼요.`);
      setClasses((prev) => prev.map((c) => {
        const hit = j.results.find((r) => r.반이름 === c['반이름'] && r.ok);
        return hit ? { ...c, 휴강기록: hit.휴강기록 } : c;
      }));
    } else {
      setCancelMsg('실패: ' + (j.error || (j.results || []).filter((r) => !r.ok).map((r) => `${r.반이름}: ${r.error}`).join(', ')));
    }
  };

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
    // 반별 숙제 미완료(최근 기록 X) 학생 수 — 배지용
    fetch('/api/overdue-summary')
      .then((r) => r.json())
      .then((j) => { setOverdue(j.counts || {}); setRecorded(j.recorded || []); })
      .catch(() => {});
  }, []);

  const sheetLink = process.env.NEXT_PUBLIC_CLASSES_SHEET_LINK || '';
  const curriculumLink = process.env.NEXT_PUBLIC_CURRICULUM_SHEET_LINK || '';

  if (loading) {
    return (
      <main className="container">
        <div className="empty">불러오는 중...</div>
      </main>
    );
  }

  // ===== 반 상세 =====
  if (selected) {
    const total = selected.totalSessions || 0;
    const done = selected.sessions || 0;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

    const links = [];

    if (selected['줌링크']) {
      links.push({
        label: '줌 입장',
        desc: '수업 시작하기',
        emoji: '🎥',
        color: 'var(--navy)',
        href: selected['줌링크'],
      });
    }

    if (selected['영상URL']) {
      links.push({
        label: '이번 회차 영상',
        desc: selected['진도'] || '수업 영상',
        emoji: '📺',
        color: 'var(--red)',
        href: selected['영상URL'],
      });
    }

    links.push({
      label: '오늘 기록하기',
      desc: '출석·숙제·태도 버튼으로 기록, 저장 한 번',
      emoji: '📋',
      color: 'var(--teal)',
      href: `/teacher/dashboard?class=${encodeURIComponent(selected['반이름'])}`,
      internal: true,
    });

    if (selected['클래스카드URL']) {
      links.push({
        label: '클래스카드',
        desc: '이번 회차 단어 세트',
        emoji: '📚',
        color: 'var(--purple)',
        href: selected['클래스카드URL'],
      });
    }

    return (
      <main className="container">
        <button className="back-link" onClick={() => setSelected(null)}>
          ← 반 목록으로
        </button>

        <h1 className="page-title">{selected['반이름']}</h1>
        <p className="page-sub">
          {selected['대분류']} · {selected['수업요일']} {selected['수업시간']}
        </p>

        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-outline" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} onClick={() => { setCancelOpen(!cancelOpen); setCancelMsg(''); }}>
            {cancelOpen ? '휴강 등록 닫기' : '📅 휴강 등록'}
          </button>
          {cancelOpen && (
            <div className="card" style={{ display: 'block', cursor: 'default', marginTop: 10 }}>
              <div className="card-desc" style={{ marginBottom: 8 }}>휴강 날짜를 고르세요. 연휴면 여러 날 추가. 등록 즉시 운영시트 휴강기록에 들어가고 회차가 밀려요.</div>
              {cancelDates.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input type="date" value={d} onChange={(e) => setCancelDates((p) => p.map((v, k) => (k === i ? e.target.value : v)))} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8 }} />
                  {cancelDates.length > 1 && <button onClick={() => setCancelDates((p) => p.filter((_, k) => k !== i))} style={{ background: 'none', border: 0, cursor: 'pointer' }}>✕</button>}
                </div>
              ))}
              <button onClick={() => setCancelDates((p) => [...p, ''])} style={{ background: 'none', border: 0, color: 'var(--navy)', cursor: 'pointer', fontSize: 13, padding: 0 }}>+ 날짜 추가</button>
              <label style={{ display: 'block', marginTop: 10, fontSize: 13 }}>
                <input type="checkbox" checked={cancelAll} onChange={(e) => setCancelAll(e.target.checked)} /> 진행 중인 전체 반에 적용 (연휴)
              </label>
              <button className="btn" style={{ marginTop: 10 }} onClick={submitCancel} disabled={cancelBusy}>{cancelBusy ? '등록 중...' : '휴강 등록'}</button>
              {cancelMsg && <div className="notice" style={{ marginTop: 8 }}>{cancelMsg}</div>}
            </div>
          )}
        </div>

        {total > 0 && selected.status === '진행중' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--med)' }}>{done}회차 / {total}회차</span>
              <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{pct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: 22 }}>
          <div className="info-row">
            <span className="info-label">현재 회차</span>
            <span className="info-value">
              {selected.status === '진행중' ? `${selected.sessions}회차` : selected.status}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">진도</span>
            <span className="info-value">{selected['진도'] || '-'}</span>
          </div>
          <div className="info-row" style={{ alignItems: 'flex-start' }}>
            <span className="info-label">이번 회차 숙제</span>
            <span className="info-value" style={{ textAlign: 'right' }}>
              {selected['숙제범위']
                ? String(selected['숙제범위']).split(/\n/).filter(Boolean).map((line, i) => {
                    const isD1 = /\[D\+\d+\]/i.test(line);
                    const title = line.replace(/\s*\[D\+\d+\]\s*/i, '').split('|')[0].trim();
                    return <div key={i}>{title}{isD1 ? ' (다음 날)' : ''}</div>;
                  })
                : '-'}
            </span>
          </div>
          {selected['테스트안내'] && (
            <div className="info-row">
              <span className="info-label">오늘 테스트</span>
              <span className="info-value">{selected['테스트유닛'] ? `Unit ${selected['테스트유닛']}` : selected['테스트안내']}</span>
            </div>
          )}
          {selected['시크릿코드'] && (
            <div className="info-row">
              <span className="info-label">이번 회차 시크릿 코드</span>
              <span className="info-value">{selected['시크릿코드']}</span>
            </div>
          )}
          {selected['개념설명숙제'] && (
            <div className="info-row">
              <span className="info-label">개념 설명 주제</span>
              <span className="info-value" style={{ fontSize: 13 }}>
                {selected['개념설명숙제']}
              </span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">시작일</span>
            <span className="info-value">{selected['시작일'] || '-'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">휴강</span>
            <span className="info-value" style={{ fontSize: 13 }}>
              {selected['휴강기록'] || '없음'}
            </span>
          </div>
        </div>

        {links.length > 0 && (
          <div className="card-list">
            {links.map((l, i) => (
              <a key={i} href={l.href} target={l.internal ? '_self' : '_blank'} rel="noopener noreferrer" className="card">
                <div className="card-icon" style={{ background: l.color }}>{l.emoji}</div>
                <div>
                  <div className="card-title">{l.label}</div>
                  <div className="card-desc">{l.desc}</div>
                </div>
                <div className="card-arrow">→</div>
              </a>
            ))}
          </div>
        )}

        <div className="section-label">반 정보 수정</div>

        <div className="notice">
          <div className="notice-title">휴강 처리</div>
          운영 시트의 <b>휴강기록</b> 칸에 날짜를 <code>2026-03-05</code> 형식으로 입력하세요.
          여러 날이면 쉼표로 구분합니다. 입력한 날만큼 회차 계산이 자동으로 밀립니다.
        </div>

        <div className="notice">
          <div className="notice-title">수업 종료</div>
          운영 시트의 <b>종료여부</b> 칸에 <code>종료</code>라고 입력하면 학생 화면에서 사라집니다.
        </div>

        <a href={sheetLink} target="_blank" rel="noopener noreferrer">
          <button className="btn">운영 스프레드시트 열기</button>
        </a>
      </main>
    );
  }

  // ===== 반 목록 =====
  const active = classes.filter((c) => (c['종료여부'] || '진행중').trim() !== '종료');
  const ended = classes.filter((c) => (c['종료여부'] || '').trim() === '종료');

  const todayClasses = active.filter((c) => hasClassToday(c));
  const todayName = getTodayName();

  // 대분류별로 묶기
  const byCategory = {};
  active.forEach((c) => {
    const cat = c['대분류'] || '기타';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(c);
  });

  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
  const overdueOf = (className) => {
    const key = Object.keys(overdue).find((k) => norm(k) === norm(className));
    return key ? overdue[key] : 0;
  };
  const hasRecord = (className) => recorded.some((k) => norm(k) === norm(className));

  // 배지 4단계: 밀림 있음(빨강) / 밀림 없음 / 개강 전 / 기록 없음
  const homeworkBadge = (c) => {
    if (c.status === '개강 전') return { text: '개강 전', bg: 'var(--border)', color: 'var(--med)' };
    if (c.status !== '진행중') return null;
    if (!hasRecord(c['반이름'])) return { text: '기록 없음', bg: 'var(--border)', color: 'var(--med)' };
    const od = overdueOf(c['반이름']);
    if (od > 0) return { text: `숙제 밀림 ${od}명`, bg: 'var(--red)', color: '#fff' };
    return { text: '숙제 밀림 없음', bg: 'var(--soft-teal)', color: 'var(--teal)' };
  };

  const renderCard = (c, i) => {
    const badge = homeworkBadge(c);
    return (
    <button key={i} className="card" onClick={() => setSelected(c)}>
      <div
        className="card-icon"
        style={{
          background: c.status === '진행중' ? 'var(--teal)' : 'var(--light)',
          fontSize: c.status === '진행중' ? 18 : 20,
        }}
      >
        {c.status === '진행중' ? c.sessions : '·'}
      </div>
      <div>
        <div className="card-title">
          {c['반이름']}
          {badge && (
            <span style={{ marginLeft: 8, background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 10, verticalAlign: 'middle' }}>
              {badge.text}
            </span>
          )}
        </div>
        <div className="card-desc">
          {c['수업요일']} {c['수업시간']} ·{' '}
          {c.status === '진행중'
            ? `${c.sessions}/${c.totalSessions}회차 · ${c['진도']}`
            : c.status}
        </div>
      </div>
      <div className="card-arrow">→</div>
    </button>
    );
  };

  return (
    <main className="container">
      <Link href="/teacher" className="back-link">
        ← 선생님 페이지로
      </Link>

      <h1 className="page-title">반 관리</h1>
      <p className="page-sub">진행 중인 반 {active.length}개</p>

      {isDemo && (
        <div className="notice">
          지금은 예시 데이터로 보고 있어요. 운영 스프레드시트를 연결하면 실제 반이 나타납니다.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {/* 오늘 수업 */}
      <div className="section-label" style={{ marginTop: 0 }}>
        📅 오늘({todayName}) 수업 {todayClasses.length}개
      </div>

      {todayClasses.length === 0 ? (
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 12,
            padding: '20px 16px',
            textAlign: 'center',
            color: 'var(--med)',
            fontSize: 14,
          }}
        >
          오늘은 수업이 없어요.
        </div>
      ) : (
        <div className="card-list">{todayClasses.map(renderCard)}</div>
      )}

      {/* 전체 반 보기 */}
      <button
        onClick={() => setShowAll(!showAll)}
        style={{
          width: '100%',
          marginTop: 22,
          padding: '12px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: '#fff',
          color: 'var(--navy)',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        전체 반 보기 {showAll ? '▴' : '▾'}
      </button>

      {showAll && (
        <div style={{ marginTop: 6 }}>
          {Object.entries(byCategory).map(([cat, list]) => (
            <div key={cat}>
              <div className="section-label" style={{ color: CATEGORY_COLOR[cat] || 'var(--med)' }}>
                {cat} ({list.length})
              </div>
              <div className="card-list">{list.map(renderCard)}</div>
            </div>
          ))}

          {ended.length > 0 && (
            <>
              <div className="section-label">종료된 반 {ended.length}개</div>
              <div className="card-list">
                {ended.map((c, i) => (
                  <button
                    key={i}
                    className="card"
                    style={{ opacity: 0.5 }}
                    onClick={() => setSelected(c)}
                  >
                    <div className="card-icon" style={{ background: 'var(--light)' }}>✓</div>
                    <div>
                      <div className="card-title">{c['반이름']}</div>
                      <div className="card-desc">종료됨</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="section-label">새 수업 열기</div>

      <div className="notice">
        <div className="notice-title">순서</div>
        1. 아래 <b>운영 스프레드시트</b>를 엽니다
        <br />
        2. 맨 아래에 새 행을 추가합니다
        <br />
        3. 반이름 · 대분류 · 수업요일 · 수업시간 · 시작일 · <b>총회차</b> · 레벨 · 줌링크 ·
        필기인증링크 등을 채웁니다 (대시보드는 통합 시트라 반별 링크 불필요)
        <br />
        4. <b>종료여부</b>는 <code>진행중</code>으로 둡니다
        <br />
        <br />
        <b>레벨</b>은 커리큘럼 마스터의 레벨 이름과 <b>정확히</b> 같아야 합니다 (띄어쓰기까지).
        레벨만 맞으면 진도 · 클래스카드 · 숙제 · 영상이 <b>회차에 맞춰</b> 자동으로 연결됩니다.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <a href={sheetLink} target="_blank" rel="noopener noreferrer">
          <button className="btn">운영 스프레드시트 열기</button>
        </a>
        <a href={curriculumLink} target="_blank" rel="noopener noreferrer">
          <button className="btn btn-outline">커리큘럼 마스터 열기</button>
        </a>
      </div>
    </main>
  );
}
