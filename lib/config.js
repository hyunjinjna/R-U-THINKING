// 스프레드시트 URL 설정
// 각 시트를 "파일 > 공유 > 웹에 게시"에서 CSV로 게시한 뒤
// Vercel 환경변수에 넣으세요.

export const SHEET_URLS = {
  classes: process.env.SHEET_CLASSES_URL || '',
  curriculum: process.env.SHEET_CURRICULUM_URL || '',
  students: process.env.SHEET_STUDENTS_URL || '',
  resources: process.env.SHEET_RESOURCES_URL || '',
  faq: process.env.SHEET_FAQ_URL || '',
  slots: process.env.SHEET_SLOTS_URL || '',
  waitlist: process.env.SHEET_WAITLIST_URL || '',
  phonicsQ: process.env.SHEET_PHONICS_Q_URL || '',
  readingQ: process.env.SHEET_READING_Q_URL || '',
  vocaQ: process.env.SHEET_VOCA_Q_URL || '',
  grammarQ: process.env.SHEET_GRAMMAR_Q_URL || '',
  leveltestResults: process.env.SHEET_LEVELTEST_RESULTS_URL || '',
  enrollments: process.env.SHEET_ENROLLMENTS_URL || '',
};

export const IS_DEMO = !SHEET_URLS.classes;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DEMO_CLASSES = [
  {
    반이름: '파닉스1-A반',
    대분류: '파닉스',
    수업요일: '월수금',
    수업시간: '16:00',
    시작일: daysAgo(14),
    총회차: '12',
    종료여부: '진행중',
    레벨: '파닉스1',
    줌링크: 'https://zoom.us/j/example1',
    대시보드링크: 'https://docs.google.com/spreadsheets/d/example1',
    대시보드CSV: '',
    필기인증링크: 'https://forms.gle/example1',
    휴강기록: '',
  },
  {
    반이름: '파닉스1-B반',
    대분류: '파닉스',
    수업요일: '화목',
    수업시간: '17:00',
    시작일: daysAgo(3),
    총회차: '12',
    종료여부: '진행중',
    레벨: '파닉스1',
    줌링크: 'https://zoom.us/j/example2',
    대시보드링크: 'https://docs.google.com/spreadsheets/d/example2',
    대시보드CSV: '',
    필기인증링크: 'https://forms.gle/example2',
    휴강기록: '',
  },
  {
    반이름: 'Easy Link 5-A반',
    대분류: '리딩',
    수업요일: '월수금',
    수업시간: '18:00',
    시작일: daysAgo(7),
    총회차: '12',
    종료여부: '진행중',
    레벨: 'Easy Link 5',
    줌링크: 'https://zoom.us/j/example3',
    대시보드링크: 'https://docs.google.com/spreadsheets/d/example3',
    대시보드CSV: '',
    필기인증링크: 'https://forms.gle/example3',
    휴강기록: '',
  },
];

export const DEMO_CURRICULUM = [
  { 레벨: '파닉스1', 회차: '1회차', 진도: 'Unit 1', 클래스카드URL: 'https://classcard.net/ex/p1', 숙제범위: 'Unit 1 p.5-7', 영상URL: 'https://youtu.be/ex_p1', 개념설명숙제: '1회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '2회차', 진도: 'Unit 2', 클래스카드URL: 'https://classcard.net/ex/p2', 숙제범위: 'Unit 2 p.8-10', 영상URL: 'https://youtu.be/ex_p2', 개념설명숙제: '2회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '3회차', 진도: 'Unit 3', 클래스카드URL: 'https://classcard.net/ex/p3', 숙제범위: 'Unit 3 p.11-13', 영상URL: 'https://youtu.be/ex_p3', 개념설명숙제: '3회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '4회차', 진도: 'Unit 4', 클래스카드URL: 'https://classcard.net/ex/p4', 숙제범위: 'Unit 4 p.14-16', 영상URL: 'https://youtu.be/ex_p4', 개념설명숙제: '4회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '5회차', 진도: 'Unit 5', 클래스카드URL: 'https://classcard.net/ex/p5', 숙제범위: 'Unit 5 p.17-19', 영상URL: 'https://youtu.be/ex_p5', 개념설명숙제: '5회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '6회차', 진도: 'Unit 6', 클래스카드URL: 'https://classcard.net/ex/p6', 숙제범위: 'Unit 6 p.20-22', 영상URL: 'https://youtu.be/ex_p6', 개념설명숙제: '6회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '7회차', 진도: 'Unit 7', 클래스카드URL: 'https://classcard.net/ex/p7', 숙제범위: 'Unit 7 p.23-25', 영상URL: 'https://youtu.be/ex_p7', 개념설명숙제: '7회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '8회차', 진도: 'Unit 8', 클래스카드URL: 'https://classcard.net/ex/p8', 숙제범위: 'Unit 8 p.26-28', 영상URL: 'https://youtu.be/ex_p8', 개념설명숙제: '8회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '9회차', 진도: 'Unit 9', 클래스카드URL: 'https://classcard.net/ex/p9', 숙제범위: 'Unit 9 p.29-31', 영상URL: 'https://youtu.be/ex_p9', 개념설명숙제: '9회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '10회차', 진도: 'Unit 10', 클래스카드URL: 'https://classcard.net/ex/p10', 숙제범위: 'Unit 10 p.32-34', 영상URL: 'https://youtu.be/ex_p10', 개념설명숙제: '10회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '11회차', 진도: 'Unit 11', 클래스카드URL: 'https://classcard.net/ex/p11', 숙제범위: 'Unit 11 p.35-37', 영상URL: 'https://youtu.be/ex_p11', 개념설명숙제: '11회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: '파닉스1', 회차: '12회차', 진도: 'Unit 12', 클래스카드URL: 'https://classcard.net/ex/p12', 숙제범위: 'Unit 12 p.38-40', 영상URL: 'https://youtu.be/ex_p12', 개념설명숙제: '12회차 핵심 개념 설명하기', 설명언어: '한국어' },
  { 레벨: 'Easy Link 5', 회차: '1회차', 진도: 'Unit 1', 클래스카드URL: 'https://classcard.net/ex/e1', 숙제범위: 'Workbook p.4-6', 영상URL: 'https://youtu.be/ex_e1', 개념설명숙제: 'Unit 1 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '2회차', 진도: 'Unit 2', 클래스카드URL: 'https://classcard.net/ex/e2', 숙제범위: 'Workbook p.7-9', 영상URL: 'https://youtu.be/ex_e2', 개념설명숙제: 'Unit 2 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '3회차', 진도: 'Unit 3', 클래스카드URL: 'https://classcard.net/ex/e3', 숙제범위: 'Workbook p.10-12', 영상URL: 'https://youtu.be/ex_e3', 개념설명숙제: 'Unit 3 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '4회차', 진도: 'Unit 4', 클래스카드URL: 'https://classcard.net/ex/e4', 숙제범위: 'Workbook p.13-15', 영상URL: 'https://youtu.be/ex_e4', 개념설명숙제: 'Unit 4 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '5회차', 진도: 'Unit 5', 클래스카드URL: 'https://classcard.net/ex/e5', 숙제범위: 'Workbook p.16-18', 영상URL: 'https://youtu.be/ex_e5', 개념설명숙제: 'Unit 5 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '6회차', 진도: 'Unit 6', 클래스카드URL: 'https://classcard.net/ex/e6', 숙제범위: 'Workbook p.19-21', 영상URL: 'https://youtu.be/ex_e6', 개념설명숙제: 'Unit 6 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '7회차', 진도: 'Unit 7', 클래스카드URL: 'https://classcard.net/ex/e7', 숙제범위: 'Workbook p.22-24', 영상URL: 'https://youtu.be/ex_e7', 개념설명숙제: 'Unit 7 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '8회차', 진도: 'Unit 8', 클래스카드URL: 'https://classcard.net/ex/e8', 숙제범위: 'Workbook p.25-27', 영상URL: 'https://youtu.be/ex_e8', 개념설명숙제: 'Unit 8 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '9회차', 진도: 'Unit 9', 클래스카드URL: 'https://classcard.net/ex/e9', 숙제범위: 'Workbook p.28-30', 영상URL: 'https://youtu.be/ex_e9', 개념설명숙제: 'Unit 9 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '10회차', 진도: 'Unit 10', 클래스카드URL: 'https://classcard.net/ex/e10', 숙제범위: 'Workbook p.31-33', 영상URL: 'https://youtu.be/ex_e10', 개념설명숙제: 'Unit 10 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '11회차', 진도: 'Unit 11', 클래스카드URL: 'https://classcard.net/ex/e11', 숙제범위: 'Workbook p.34-36', 영상URL: 'https://youtu.be/ex_e11', 개념설명숙제: 'Unit 11 main concept in English', 설명언어: '영어' },
  { 레벨: 'Easy Link 5', 회차: '12회차', 진도: 'Unit 12', 클래스카드URL: 'https://classcard.net/ex/e12', 숙제범위: 'Workbook p.37-39', 영상URL: 'https://youtu.be/ex_e12', 개념설명숙제: 'Unit 12 main concept in English', 설명언어: '영어' },
];

export const DEMO_STUDENTS = [
  { 이름: '김민준', 반이름: '파닉스1-A반', 전화번호: '010-0000-0001', 월가능시간: '18:00', 화가능시간: '', 수가능시간: '18:00', 목가능시간: '', 금가능시간: '18:00' },
  { 이름: '이서연', 반이름: '파닉스1-A반', 전화번호: '010-0000-0002', 월가능시간: '19:00', 화가능시간: '', 수가능시간: '19:00', 목가능시간: '', 금가능시간: '19:00' },
  { 이름: '박지호', 반이름: '파닉스1-B반', 전화번호: '010-0000-0003', 월가능시간: '', 화가능시간: '20:00', 수가능시간: '', 목가능시간: '20:00', 금가능시간: '' },
  { 이름: '나현진', 반이름: 'Easy Link 5-A반', 전화번호: '010-0000-0004', 월가능시간: '20:00', 화가능시간: '', 수가능시간: '20:00', 목가능시간: '', 금가능시간: '20:00' },
];

export const DEMO_RESOURCES = [
  { 자료이름: '코치 가이드라인', 링크: 'https://drive.google.com/example1', 설명: '수업 운영 전체 절차', 이모지: '📋' },
  { 자료이름: '알림장 템플릿', 링크: 'https://drive.google.com/example2', 설명: '수업 후 학부모 알림장', 이모지: '📝' },
  { 자료이름: '일일 대시보드 양식', 링크: 'https://drive.google.com/example3', 설명: '수업 중 학생 관리 시트', 이모지: '📊' },
];

export const DEMO_FAQ = [
  { 질문유형: '결석', 예시질문: '오늘 아이가 아파서 수업에 못 갈 것 같아요', 표준답변가이드: '결석 확인 후 보강 안내. 당일 결석은 보강이 어려울 수 있음을 정중히 안내하고, 대신 수업 영상을 다시 볼 수 있도록 안내. 다음 수업일 알려드리기.' },
  { 질문유형: '진도문의', 예시질문: '우리 아이가 지금 어디까지 배우고 있나요?', 표준답변가이드: '현재 회차와 진도를 알려드리고, 주간 리포트를 통해 매주 상세히 안내드리고 있음을 설명. 추가로 궁금한 점은 언제든 문의 가능하다고 안내.' },
  { 질문유형: '숙제문의', 예시질문: '숙제를 어디서 확인하나요?', 표준답변가이드: '학생용 웹사이트에서 반을 선택하면 이번 주 숙제 범위와 클래스카드 링크를 볼 수 있다고 안내. 링크 다시 보내드리기.' },
  { 질문유형: '결제', 예시질문: '이번 달 수업료 환불이 가능할까요?', 표준답변가이드: '환불 관련 문의는 원장님께 확인 후 안내드리겠다고 정중히 답변. 임의로 환불 가능 여부를 확정하지 말 것.' },
  { 질문유형: '레벨상담', 예시질문: '우리 아이 레벨이 맞는 건가요?', 표준답변가이드: '현재 수업 참여 상황을 간단히 전하고, 레벨 조정은 원장님과 상담 후 결정된다고 안내. 상담 일정 잡아드리겠다고 제안.' },
];

export const DEMO_DASHBOARD = [
  { 날짜: '2026-09-15', 회차: '5', 반이름: '파닉스1-A반', 이름: '김민준', 출석: 'O', 단어점수: '92', 재시결과: '', 매일단어: 'O', 연속일수: '15', 코드1: 'O', 코드2: 'O', 수업태도: '적극적', 필기인증: 'O', 특이사항: '' },
  { 날짜: '2026-09-15', 회차: '5', 반이름: '파닉스1-A반', 이름: '이서연', 출석: 'O', 단어점수: '85', 재시결과: '통과', 매일단어: 'X', 연속일수: '12', 코드1: 'O', 코드2: 'X', 수업태도: '보통', 필기인증: 'O', 특이사항: '숙제 독촉 필요' },
];

export const DEMO_SLOTS = [
  { 대분류: '파닉스', 레벨: '파닉스1', 수업요일: '월수금', 수업시간: '16:00', 상태: '마감' },
  { 대분류: '파닉스', 레벨: '파닉스1', 수업요일: '월수금', 수업시간: '17:00', 상태: '등록가능' },
  { 대분류: '파닉스', 레벨: '파닉스1', 수업요일: '화목', 수업시간: '16:00', 상태: '마감' },
  { 대분류: '파닉스', 레벨: '파닉스1', 수업요일: '화목', 수업시간: '17:00', 상태: '마감' },
  { 대분류: '파닉스', 레벨: '파닉스2', 수업요일: '월수금', 수업시간: '16:00', 상태: '등록가능' },
  { 대분류: '리딩', 레벨: 'Easy Link 4', 수업요일: '월수금', 수업시간: '18:00', 상태: '마감' },
  { 대분류: '리딩', 레벨: 'Easy Link 4', 수업요일: '화목', 수업시간: '18:00', 상태: '등록가능' },
  { 대분류: '리딩', 레벨: 'Easy Link 5', 수업요일: '화목', 수업시간: '16:00', 상태: '마감' },
  { 대분류: '문법', 레벨: 'My Next Grammar 1', 수업요일: '월수금', 수업시간: '18:00', 상태: '등록가능' },
];

export const DEMO_WAITLIST = [
  { 레벨: '파닉스1', 수업요일: '월수금', 수업시간: '16:00', 이름: '홍길동', 처리여부: '' },
  { 레벨: '파닉스1', 수업요일: '월수금', 수업시간: '16:00', 이름: '김철수', 처리여부: '' },
  { 레벨: '파닉스1', 수업요일: '월수금', 수업시간: '16:00', 이름: '이영희', 처리여부: '' },
  { 레벨: '파닉스1', 수업요일: '월수금', 수업시간: '16:00', 이름: '박민수', 처리여부: '처리완료' },
  { 레벨: 'Easy Link 4', 수업요일: '월수금', 수업시간: '18:00', 이름: '최지우', 처리여부: '' },
];

// ===== 레벨테스트 샘플 문제 (실제 문제은행 연결 전 데모용) =====

export const DEMO_PHONICS_Q = [
  { 문제ID: 'PHON-1-001', 게이트단계: 1, 질문: 'cat과 같은 첫소리가 나는 단어는?', 보기1: 'dog', 보기2: 'cup', 보기3: 'hat', 보기4: 'sun', 정답번호: 2 },
  { 문제ID: 'PHON-1-002', 게이트단계: 1, 질문: 'bag과 같은 첫소리가 나는 단어는?', 보기1: 'box', 보기2: 'run', 보기3: 'egg', 보기4: 'ten', 정답번호: 1 },
  { 문제ID: 'PHON-2-001', 게이트단계: 2, 질문: '다음 중 "sh" 소리가 들어간 단어는?', 보기1: 'sun', 보기2: 'ship', 보기3: 'cat', 보기4: 'top', 정답번호: 2 },
  { 문제ID: 'PHON-2-002', 게이트단계: 2, 질문: '다음 중 짧은 "a" 소리가 나는 단어는?', 보기1: 'cake', 보기2: 'cat', 보기3: 'coat', 보기4: 'cute', 정답번호: 2 },
  { 문제ID: 'PHON-3-001', 게이트단계: 3, 질문: 'light에서 "igh"는 어떤 소리가 나나요?', 보기1: '이', 보기2: '아이', 보기3: '이그', 보기4: '아', 정답번호: 2 },
];

export const DEMO_READING_Q = [
  {
    문제ID: 'READ-260-001', 렉사일: 260, 문제유형: '세부사항파악부족',
    지문: 'Mia has a small dog. Her dog is white. It likes to play with a ball.',
    질문: 'Mia의 강아지는 무슨 색인가요?',
    보기1: 'Black', 보기2: 'White', 보기3: 'Brown', 보기4: 'Red', 정답번호: 2,
    보기1구멍: '세부사항파악부족', 보기3구멍: '세부사항파악부족', 보기4구멍: '세부사항파악부족',
  },
  {
    문제ID: 'READ-350-001', 렉사일: 350, 문제유형: '지시어이해부족',
    지문: 'Sam found a box. He opened it and saw a toy car inside.',
    질문: '밑줄 친 "it"이 가리키는 것은?',
    보기1: 'Sam', 보기2: 'the box', 보기3: 'the toy car', 보기4: 'inside', 정답번호: 2,
    보기1구멍: '지시어이해부족', 보기3구멍: '지시어이해부족', 보기4구멍: '지시어이해부족',
  },
  {
    문제ID: 'READ-520-001', 렉사일: 520, 문제유형: '지시어이해부족',
    지문: 'Tom loved his old bicycle. It was red and had a small bell. One day, the bell fell off. Tom felt very sad because the bell was a gift from his grandfather.',
    질문: '밑줄 친 It이 가리키는 것은?',
    보기1: 'Tom', 보기2: 'the bicycle', 보기3: 'the bell', 보기4: 'his grandfather', 정답번호: 2,
    보기1구멍: '지시어이해부족', 보기3구멍: '지시어이해부족', 보기4구멍: '지시어이해부족',
  },
  {
    문제ID: 'READ-520-002', 렉사일: 520, 문제유형: '원인결과추론부족',
    지문: 'Tom loved his old bicycle. It was red and had a small bell. One day, the bell fell off. Tom felt very sad because the bell was a gift from his grandfather.',
    질문: 'Tom이 슬퍼한 이유는?',
    보기1: '자전거가 낡아서', 보기2: '종이 떨어졌는데 할아버지의 선물이었어서', 보기3: '할아버지가 편찮으셔서', 보기4: '색깔이 마음에 안 들어서', 정답번호: 2,
    보기1구멍: '세부사항파악부족', 보기3구멍: '원인결과추론부족', 보기4구멍: '세부사항파악부족',
  },
  {
    문제ID: 'READ-700-001', 렉사일: 700, 문제유형: '주제요지파악부족',
    지문: 'Rainforests cover only 6% of the Earth, but they are home to more than half of the world\'s plant and animal species. They also help control the climate by absorbing carbon dioxide. However, rainforests are shrinking fast due to logging and farming.',
    질문: '이 글의 요지로 가장 알맞은 것은?',
    보기1: '열대우림에는 다양한 동물이 산다', 보기2: '열대우림은 중요하지만 빠르게 사라지고 있다', 보기3: '벌목은 나쁘다', 보기4: '기후 변화는 심각하다', 정답번호: 2,
    보기1구멍: '주제요지파악부족', 보기3구멍: '주제요지파악부족', 보기4구멍: '주제요지파악부족',
  },
  {
    문제ID: 'READ-850-001', 렉사일: 850, 문제유형: '어조의도파악부족',
    지문: '"Oh, great," Jake muttered, staring at the rain pouring down just as the game was about to start.',
    질문: 'Jake의 말투에 담긴 진짜 감정은?',
    보기1: '기쁨', 보기2: '짜증/실망 (반어법)', 보기3: '놀라움', 보기4: '두려움', 정답번호: 2,
    보기1구멍: '어조의도파악부족', 보기3구멍: '어조의도파악부족', 보기4구멍: '어조의도파악부족',
  },
];

export const DEMO_VOCA_Q = [
  { 문제ID: 'VOCA-A1하-001', CEFR단계: 'A1-하', 문장: 'I have a pet ______.', 보기1: 'dog', 보기2: 'quickly', 보기3: 'happy', 보기4: 'run', 정답번호: 1, 보기2구멍: '단어뜻모름', 보기3구멍: '품사형태변형부족', 보기4구멍: '품사형태변형부족' },
  { 문제ID: 'VOCA-A2하-001', CEFR단계: 'A2-하', 문장: 'She was ______ when she heard the good news.', 보기1: 'sad', 보기2: 'excited', 보기3: 'tired', 보기4: 'hungry', 정답번호: 2, 보기1구멍: '문맥추론부족', 보기3구멍: '문맥추론부족', 보기4구멍: '단어뜻모름' },
  { 문제ID: 'VOCA-A2중-001', CEFR단계: 'A2-중', 문장: 'The weather was so ______ that we decided to stay home.', 보기1: 'exciting', 보기2: 'terrible', 보기3: 'curious', 보기4: 'generous', 정답번호: 2, 보기1구멍: '문맥추론부족', 보기3구멍: '유사단어혼동', 보기4구멍: '단어뜻모름' },
  { 문제ID: 'VOCA-B1하-001', CEFR단계: 'B1-하', 문장: 'The scientist made an important ______ about the disease.', 보기1: 'discovery', 보기2: 'decoration', 보기3: 'donation', 보기4: 'direction', 정답번호: 1, 보기2구멍: '유사단어혼동', 보기3구멍: '유사단어혼동', 보기4구멍: '유사단어혼동' },
  { 문제ID: 'VOCA-B2하-001', CEFR단계: 'B2-하', 문장: 'His argument was ______ ; it made no logical sense.', 보기1: 'coherent', 보기2: 'inconsistent', 보기3: 'convincing', 보기4: 'valid', 정답번호: 2, 보기1구멍: '문맥추론부족', 보기3구멍: '문맥추론부족', 보기4구멍: '문맥추론부족' },
];

export const DEMO_GRAMMAR_Q = [
  { 문제ID: 'GRAM-01-001', 난이도: 1, 문장: 'I ______ a student.', 보기1: 'am', 보기2: 'is', 보기3: 'are', 보기4: 'be', 정답번호: 1, 보기2구멍: '형태변화규칙미숙지', 보기3구멍: '형태변화규칙미숙지', 보기4구멍: '형태변화규칙미숙지' },
  { 문제ID: 'GRAM-04-001', 난이도: 4, 문장: 'She ______ to school every day.', 보기1: 'go', 보기2: 'goes', 보기3: 'going', 보기4: 'went', 정답번호: 2, 보기1구멍: '형태변화규칙미숙지', 보기3구멍: '문장구조이해부족', 보기4구멍: '시제구분부족' },
  { 문제ID: 'GRAM-07-001', 난이도: 7, 문장: 'Yesterday, she ______ to the park with her dog.', 보기1: 'go', 보기2: 'goes', 보기3: 'went', 보기4: 'going', 정답번호: 3, 보기1구멍: '형태변화규칙미숙지', 보기2구멍: '형태변화규칙미숙지', 보기4구멍: '문장구조이해부족' },
  { 문제ID: 'GRAM-09-001', 난이도: 9, 문장: 'By the time we arrived, the movie ______ already started.', 보기1: 'has', 보기2: 'have', 보기3: 'had', 보기4: 'will', 정답번호: 3, 보기1구멍: '시제구분부족', 보기2구멍: '형태변화규칙미숙지', 보기4구멍: '시제구분부족' },
  { 문제ID: 'GRAM-11-001', 난이도: 11, 문장: 'If I ______ known about the meeting, I would have attended.', 보기1: 'have', 보기2: 'had', 보기3: 'has', 보기4: 'having', 정답번호: 2, 보기1구멍: '시제구분부족', 보기3구멍: '형태변화규칙미숙지', 보기4구멍: '문장구조이해부족' },
];

export const DEMO_ENROLLMENTS = [
  {
    타임스탬프: '2026-09-18 10:12',
    '학부모 이름': '김서연',
    '학부모 연락처': '010-1111-2222',
    '학생 이름': '김민수',
    '학생 연락처': '010-3333-4444',
    '학생 학년': '초3',
    '신청 과목': '리딩, 문법',
    '신청 레벨': 'Easy Link 4, My Next Grammar 1',
    '희망 요일/시간대': '화목 18:00, 월수금 19:00',
    '학생 영어 학습 경력': '파닉스 1년',
    '알게 된 경로': '인스타그램',
    '결제 방법': '계좌이체',
    '특이사항/문의사항': '',
    처리여부: '',
  },
  {
    타임스탬프: '2026-09-18 14:30',
    '학부모 이름': '박지영',
    '학부모 연락처': '010-5555-6666',
    '학생 이름': '박하은',
    '학생 연락처': '',
    '학생 학년': '초1',
    '신청 과목': '파닉스',
    '신청 레벨': '파닉스1',
    '희망 요일/시간대': '월수금 16:00',
    '학생 영어 학습 경력': '처음',
    '알게 된 경로': '지인 추천',
    '결제 방법': '카드',
    '특이사항/문의사항': '수줍음이 많아요',
    처리여부: '',
  },
];
