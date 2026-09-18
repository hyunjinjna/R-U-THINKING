'use client';

import Link from 'next/link';

const MENU = {
  수업: {
    title: '수업 관리',
    emoji: '📚',
    items: [
      { href: '/teacher/classes', icon: '🏫', color: 'var(--navy)', title: '반 관리', desc: '오늘 수업, 줌 링크, 진도 확인' },
      { href: '/teacher/report', icon: '📊', color: 'var(--teal)', title: '주간 리포트 생성', desc: '학생별 주간 리포트 자동 작성' },
      { href: '/teacher/upload', icon: '📤', color: 'var(--purple)', title: '성적 업로드', desc: '클래스카드 엑셀 올려서 자동 분석' },
      { href: '/teacher/resources', icon: '📁', color: 'var(--light)', title: '코치 자료', desc: '자주 쓰는 자료 모음' },
    ],
  },
  운영: {
    title: '운영 관리',
    emoji: '📈',
    items: [
      { href: '/teacher/answer', icon: '💬', color: 'var(--pink)', title: '질문 답변 도우미', desc: '학부모 문의 답변 초안 작성' },
      { href: '/teacher/leveltest', icon: '📋', color: 'var(--yellow)', title: '레벨테스트 결과함', desc: '진단 리포트 확인 후 카톡 발송' },
      { href: '/teacher/enrollments', icon: '📝', color: 'var(--navy)', title: '등록 신청 목록', desc: '신규 등록 처리 및 반 배정' },
      { href: '/teacher/waitlist', icon: '⏳', color: 'var(--red)', title: '대기 신청 목록', desc: '대기자 확인 및 관리' },
    ],
  },
};

export default function TeacherPage() {
  return (
    <main className="container">
      <div className="logo-row">
        <img src="/logo.png" alt="R U Thinking?" className="site-logo" />
        <span className="badge">R U Thinking?</span>
      </div>
      <h1 className="page-title">선생님 페이지</h1>

      {Object.entries(MENU).map(([key, group]) => (
        <div key={key} style={{ marginBottom: 30 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: 'var(--navy)',
              marginBottom: 12,
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>{group.emoji}</span>
            {group.title}
          </div>

          <div className="card-list">
            {group.items.map((item) => (
              <Link key={item.href} href={item.href} className="card">
                <div className="card-icon" style={{ background: item.color }}>
                  {item.icon}
                </div>
                <div>
                  <div className="card-title">{item.title}</div>
                  <div className="card-desc">{item.desc}</div>
                </div>
                <div className="card-arrow">→</div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
