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
