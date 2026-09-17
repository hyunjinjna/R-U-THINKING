'use client';

import Link from 'next/link';

export default function TeacherHome() {
  return (
    <main className="container">
      <span className="badge">R U Thinking?</span>
      <h1 className="page-title">선생님 페이지</h1>
      <p className="page-sub">무엇을 하시겠어요?</p>

      <div className="card-list">
        <Link href="/teacher/classes" className="card">
          <div className="card-icon" style={{ background: 'var(--navy)' }}>🏫</div>
          <div>
            <div className="card-title">반 관리</div>
            <div className="card-desc">줌 · 영상 · 대시보드 · 진도 확인</div>
          </div>
          <div className="card-arrow">→</div>
        </Link>

        <Link href="/teacher/report" className="card">
          <div className="card-icon" style={{ background: 'var(--teal)' }}>📊</div>
          <div>
            <div className="card-title">주간 리포트 생성</div>
            <div className="card-desc">대시보드 읽어서 AI가 자동 작성</div>
          </div>
          <div className="card-arrow">→</div>
        </Link>

        <Link href="/teacher/upload" className="card">
          <div className="card-icon" style={{ background: 'var(--purple)' }}>
            📤
          </div>
          <div>
            <div className="card-title">성적 업로드</div>
            <div className="card-desc">클래스카드 엑셀 올려서 자동 분석</div>
          </div>
          <div className="card-arrow">→</div>
        </Link>

        <Link href="/teacher/answer" className="card">
          <div className="card-icon" style={{ background: 'var(--pink)' }}>💬</div>
          <div>
            <div className="card-title">질문 답변 도우미</div>
            <div className="card-desc">학부모 문의에 AI가 답변 초안 작성</div>
          </div>
          <div className="card-arrow">→</div>
        </Link>

        <Link href="/teacher/resources" className="card">
          <div className="card-icon" style={{ background: 'var(--yellow)' }}>📁</div>
          <div>
            <div className="card-title">코치 자료</div>
            <div className="card-desc">가이드라인 · 템플릿 · 양식</div>
          </div>
          <div className="card-arrow">→</div>
        </Link>
      </div>
    </main>
  );
}
