'use client';

// ===== 레벨테스트 결과 페이지 — 등록 설득 블록 (2026-09-25, 배치 13) =====
// 위치: 영역별 카드 아래, [추천 수업 등록하러 가기] 바로 위.
// 순서: 구멍→반 연결(네이비, 개인화) → 줄리아 소개 → 후기 → 관리 시스템 → 수강료(자동) → 수업 영상 → (버튼은 페이지 쪽)
// 문구·후기는 코드 고정(Julia 결정). 통계 지어내기 금지 원칙 유지.

// 수업 영상 유튜브 링크 — 비어 있으면 영상 칸 자체가 안 보임. 링크 생기면 여기만 바꾸면 됨.
export const SAMPLE_VIDEO_URL = '';

// 수강료 (확정 할인 구조): 1과목은 추천 반 월수강료(운영시트) / 2·3과목은 묶음가
const BUNDLE_FEE = { 2: 140000, 3: 190000 };
const DEFAULT_FEE = 80000;

const INTRO = [
  '저도 초등학생 때 학원에서 영어를 배웠고, 유독 어려웠던 부분이 있었습니다. 그게 왜 어려웠는지는 미국 유학 중에야 알았습니다. 그래서 지금은 아이가 헷갈리는 바로 그 지점을 알고 짚어줍니다. 아이의 눈높이에서, 진짜 이해되는 가장 쉬운 방식으로.',
  '그리고 대치동에서 200명을 가르치며 확인한 것이 하나 더 있습니다. 관리받는 아이가 늡니다. 잘 가르치는 사람과 끝까지 챙기는 시스템, 둘 다 있어야 실력이 오릅니다. 알유띵킹은 그 둘을 한곳에 담은 수업입니다.',
];

// 김과외 실제 후기 (개인정보 제거, 축약)
const REVIEWS = [
  { text: '리딩 스킬이 정말 많이 늘었습니다. 읽는 것을 두려워하지 않게 되었고, 정답률이 엄청 높아졌습니다.', who: '서울 초3 학부모' },
  { text: '파닉스 구멍이나 독해, 문법 전반적으로 감을 익혔어요. 영어에 흥미 없던 아이였는데도요.', who: '서울 초4 학부모' },
  { text: '부족한 부분을 정확히 파악하시고 리딩, 문법, 단어는 물론 공부법까지 신경써주셨어요. 반년 만에 상상 이상으로 올라갔어요.', who: '서울 초4 학부모' },
  { text: '영어로 전혀 말을 안 하고 부끄러워했는데, 두 달 배우더니 자연스럽게 영어 단어를 쓰고 있습니다.', who: '서울 영유아 학부모' },
];

const SYSTEM_POINTS = [
  '줄리아 선생님이 직접 기획·촬영한 영상 수업',
  '정해진 시간에 코치가 출석·집중·숙제·단어 시험 확인',
  '숙제를 안 하면 코치가 직접 챙김',
  '매주 주간 리포트를 카톡으로',
];

function youtubeEmbed(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : '';
}

const card = { background: '#fff', border: '2px solid var(--border)', borderRadius: 14, padding: '18px 18px', marginBottom: 12 };
const head = { fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 10 };

/**
 * @param studentName  학생 이름 (없으면 "학생")
 * @param gaps         구멍 태그 배열 (표시용 이름)
 * @param recommended  추천 반 라벨 배열 (수강료 계산용, "상담 후 안내" 제외)
 * @param fees         추천 반별 월수강료 숫자 배열 (운영시트, 없으면 기본값)
 */
export default function ResultPitch({ studentName, gaps = [], recommended = [], fees = [] }) {
  const name = String(studentName || '').trim() || '학생';
  const n = recommended.length;
  const single = fees.find((f) => f > 0) || DEFAULT_FEE;
  const fee = n >= 3 ? BUNDLE_FEE[3] : n === 2 ? BUNDLE_FEE[2] : single;
  const embed = youtubeEmbed(SAMPLE_VIDEO_URL);
  const won = (v) => `${v.toLocaleString('ko-KR')}원`;

  return (
    <section style={{ marginTop: 30 }}>
      <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--navy)', marginBottom: 14, lineHeight: 1.4 }}>
        이 구멍, 알유띵킹에서 이렇게 메웁니다
      </div>

      {/* ① 구멍→반 연결 (네이비) */}
      <div style={{ background: 'var(--navy)', color: '#fff', borderRadius: 14, padding: '18px 18px', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--yellow)', marginBottom: 10 }}>
          {name} 학생의 구멍 {gaps.length > 0 ? `${gaps.length}가지` : ''}
        </div>
        {gaps.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {gaps.map((g, i) => (
              <span key={i} style={{ background: '#fff', color: 'var(--navy)', borderRadius: 999, padding: '4px 10px', fontSize: 12.5, fontWeight: 700 }}>
                {g}
              </span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 14.5, lineHeight: 1.75 }}>
          {gaps.length > 0
            ? '이 구멍을 채우는 훈련이 들어 있는 반만 추천했습니다. 시간표는 부모님이 직접 고르세요.'
            : '진단 결과에 맞는 반만 추천했습니다. 시간표는 부모님이 직접 고르세요.'}
        </div>
      </div>

      {/* ② 줄리아 소개 */}
      <div style={card}>
        <div style={head}>가르치는 사람은 한 명, 줄리아 선생님</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <img
            src="/julia.jpg"
            alt="줄리아 선생님"
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flex: 'none', border: '2px solid var(--border)' }}
          />
          <div style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--dark)' }}>
            {INTRO.map((p, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0' }}>{p}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ③ 후기 */}
      <div style={card}>
        <div style={head}>학부모님들의 이야기</div>
        {REVIEWS.map((r, i) => (
          <div key={i} style={{ borderLeft: '3px solid var(--yellow)', background: '#FFFBEE', padding: '8px 12px', marginTop: i === 0 ? 0 : 8, fontSize: 13.5, lineHeight: 1.7, color: 'var(--dark)' }}>
            “{r.text}”
            <div style={{ fontSize: 12, color: 'var(--light)', marginTop: 3 }}>{r.who}</div>
          </div>
        ))}
      </div>

      {/* ④ 관리 시스템 */}
      <div style={card}>
        <div style={head}>매주 이 리포트처럼 관리됩니다</div>
        {SYSTEM_POINTS.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: i === 0 ? 0 : 6, fontSize: 14.5, lineHeight: 1.6, color: 'var(--dark)' }}>
            <span style={{ color: 'var(--teal)', fontWeight: 800, flex: 'none' }}>✓</span>
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* ⑤ 수강료 — 추천 반 월수강료 자동 + 묶음가 안내 */}
      {n > 0 && (
        <div style={{ ...card, background: 'var(--soft-teal)', borderColor: 'var(--soft-teal)' }}>
          <div style={{ ...head, color: '#085041' }}>수강료</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#085041' }}>
            추천 반 {n >= 2 ? `${Math.min(n, 3)}과목 ` : ''}월 {won(fee)}
          </div>
          <div style={{ fontSize: 13, color: '#0F6E56', marginTop: 6, lineHeight: 1.7 }}>
            {n === 1 && <>2과목 {won(BUNDLE_FEE[2])} · 3과목 {won(BUNDLE_FEE[3])}<br /></>}
            {n === 2 && <>1과목 {won(single)} · 3과목 {won(BUNDLE_FEE[3])}<br /></>}
            중간 합류 시 첫 달은 남은 회차만큼만 계산해요
          </div>
        </div>
      )}

      {/* ⑥ 수업 영상 — 링크가 있을 때만 */}
      {embed && (
        <div style={card}>
          <div style={head}>수업은 이렇게 진행돼요</div>
          <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
            <iframe
              src={embed}
              title="알유띵킹 수업 미리보기"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
}
