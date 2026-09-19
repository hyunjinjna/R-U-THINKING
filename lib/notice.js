// 12번 등록 안내문 자동 생성 — 순수 로직
// 서식 원칙: 카톡에 붙여넣는 텍스트이므로 마크다운 기호(**, ###) 금지, 섹션 구분은 빈 줄.

import { sameName, splitMulti } from './utils';
import { parseDate } from './week';

const SITE_URL = 'https://r-u-thinking.vercel.app/';

function last4(phone) {
  const d = String(phone || '').replace(/[^0-9]/g, '');
  return d.slice(-4);
}

/**
 * 클래스카드 계정 자동 생성 규칙
 * 아이디 = 영어이름 소문자 + 부모전화 뒷4자리 (영어이름 없으면 "ru" + 뒷4자리)
 * 비밀번호 = 뒷4자리 + "ru"
 * 기존 계정(재원생 추가 등록)이 있으면 그대로 재사용.
 */
export function buildClasscardAccount({ 영어이름, 학부모연락처, 기존아이디, 기존비번 }) {
  if (기존아이디) {
    return { 아이디: 기존아이디, 비번: 기존비번 || '', 재사용: true };
  }
  const tail = last4(학부모연락처);
  const eng = String(영어이름 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const 아이디 = (eng || 'ru') + tail;
  const 비번 = tail + 'ru';
  return { 아이디, 비번, 재사용: false };
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/** 반의 시작일 → "2026년 9월 22일 (월) 18:00" (시작일 비면 '추후 안내') */
export function firstClassLabel(cls) {
  const d = parseDate(cls['시작일']);
  if (!d) return '추후 안내드리겠습니다';
  const time = String(cls['수업시간'] || '').trim();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})${time ? ' ' + time : ''}`;
}

/** 반의 교재명들 → 교재 탭(교재명|구입링크|비고)에서 링크 조회 */
export function textbooksOfClass(cls, textbookRows) {
  return splitMulti(cls['교재']).map((name) => {
    const row = (textbookRows || []).find((r) => sameName(r['교재명'], name));
    return {
      교재명: name,
      구입링크: row ? String(row['구입링크'] || '').trim() : '',
      비고: row ? String(row['비고'] || '').trim() : '',
    };
  });
}

/**
 * 등록 안내문 생성 (카톡용 줄글, 마크다운 없음)
 * @param {object} p
 * @param {string} p.학생이름
 * @param {Array}  p.반들 - [{ 반이름, 대분류, 수업요일, 수업시간, 시작일, 교재목록: [{교재명,구입링크,비고}] }]
 * @param {object} p.계정 - { 아이디, 비번 }
 * @param {string} p.카톡채널링크 - 비어 있으면 카톡 채널 단계 제외 + 문의는 문자 안내
 */
export function buildWelcomeNotice({ 학생이름, 반들, 계정, 카톡채널링크 }) {
  const name = 학생이름 || '아이';
  const L = [];

  L.push(`${name} 어머님, 안녕하세요. R U Thinking? 원장 Julia입니다.`);
  L.push(`등록해주셔서 진심으로 감사합니다. 첫 수업 전까지 아래 순서대로 준비해주시면 됩니다. 하나씩 따라 하시면 10분이면 끝나요.`);
  L.push('');

  L.push(`1단계. 학생 사이트를 아이 기기에 설치해주세요`);
  L.push(`수업 입장, 숙제 확인을 모두 여기서 합니다.`);
  L.push(`① 아이 기기에서 Safari(아이패드) 또는 Chrome(안드로이드)을 열고 아래 주소로 들어가주세요`);
  L.push(`　${SITE_URL}`);
  L.push(`② 공유 버튼 → "홈 화면에 추가"를 눌러주세요. 앱처럼 아이콘이 생깁니다`);
  L.push(`③ 아이콘으로 열면 이름과 전화번호를 묻습니다`);
  L.push(`　이름: ${name} (등록하실 때 적어주신 그대로)`);
  L.push(`　전화번호: 어머님 번호 (등록하실 때 적어주신 번호)`);
  L.push(`④ "시작하기"를 누르면 ${name}의 수업과 숙제가 보입니다. 이 화면이 뜨면 성공이에요`);
  L.push('');

  L.push(`2단계. 줌(Zoom)을 설치해주세요`);
  L.push(`수업은 줌으로 진행합니다. 학생 사이트의 "수업 입장" 버튼을 누르면 자동으로 열립니다.`);
  L.push(`① 앱스토어 또는 플레이스토어에서 "Zoom" 검색 → 설치`);
  L.push(`② 앱을 한 번 열어서 이름을 아이 이름(${name})으로 설정해주세요. 코치 선생님이 이름을 보고 들여보냅니다`);
  L.push(`③ 카메라와 마이크 권한을 "허용"해주세요`);
  L.push(`수업 전날 학생 사이트에서 "수업 입장"을 한 번 눌러보시면 좋아요. 대기실까지 열리면 준비 완료입니다.`);
  L.push('');

  L.push(`3단계. 클래스카드를 설치해주세요`);
  L.push(`숙제는 대부분 클래스카드에서 합니다. 단어 암기, 문장 말하기, 문제 풀이가 여기서 이루어지고, 아이가 얼마나 했는지 코치 선생님이 확인합니다.`);
  L.push(`① 앱스토어 또는 플레이스토어에서 "클래스카드" 검색 → 설치`);
  L.push(`② 아래 계정으로 로그인해주세요`);
  L.push(`　아이디: ${계정?.아이디 || ''}`);
  L.push(`　비밀번호: ${계정?.비번 || ''}`);
  L.push(`③ "로그인 유지"를 켜주세요. 아이가 매번 입력하지 않아도 되게요`);
  L.push(`④ 로그인하면 ${name}의 반이 이미 들어가 있습니다. 첫 숙제는 첫 수업 후에 열려요`);
  L.push('');

  if (카톡채널링크) {
    L.push(`4단계. 카카오톡 채널을 추가해주세요`);
    L.push(`주간 리포트, 수업 관련 안내, 상담은 모두 이 채널로 드립니다.`);
    L.push(`① 어머님 휴대폰에서 아래 링크를 눌러 채널을 추가해주세요`);
    L.push(`　${카톡채널링크}`);
    L.push(`② 첫 메시지로 "${name} 어머니입니다"라고 남겨주시면 코치 선생님이 확인합니다`);
    L.push('');
  }

  // 교재 준비
  const withBooks = (반들 || []).filter((c) => (c.교재목록 || []).length > 0);
  if (withBooks.length > 0) {
    L.push(`교재 준비`);
    L.push(`${name}가 듣는 수업의 교재입니다. 첫 수업 전까지 준비해주세요.`);
    for (const c of withBooks) {
      L.push(`${c.대분류 || '수업'} (${c.반이름})`);
      for (const b of c.교재목록) {
        const link = b.구입링크 ? ` — ${b.구입링크}` : '';
        const memo = b.비고 ? ` (${b.비고})` : '';
        L.push(`　· ${b.교재명}${link}${memo}`);
      }
    }
    L.push('');
  }

  L.push(`수업 환경에 대해`);
  L.push(`조용한 곳에서, 이어폰을 끼고 수업하면 집중이 훨씬 잘 됩니다. 수업 전 기기 충전을 확인해주세요. 카메라는 켜고 수업합니다. 코치 선생님이 아이가 잘 따라오는지 보면서 관리하기 위해서예요. 수업 5분 전에 "수업 입장"을 누르면 대기실에서 기다리다 정시에 들어갑니다.`);
  L.push('');

  L.push(`수업과 숙제는 이렇게 흘러갑니다`);
  L.push(`수업은 30~40분입니다. 원장이 직접 기획하고 촬영한 강의 영상을 코치 선생님이 함께 보며 진행하고, 아이가 집중하고 있는지, 이해하고 있는지를 옆에서 살핍니다.`);
  L.push(`수업이 끝나면 학생 사이트에 그날 숙제가 뜹니다. 숙제는 나눠서 열려요. 오늘 수업한 내용을 오늘과 내일에 걸쳐 복습하는 순서라, 한꺼번에 몰아서 하지 않게 됩니다.`);
  L.push(`숙제를 안 하면 사라지지 않고 "밀린 숙제"로 남습니다. 코치 선생님이 다음 수업 때 확인하고, 두 번 연속 밀리면 어머님께 말씀드립니다.`);
  L.push('');

  L.push(`첫 수업`);
  for (const c of 반들 || []) {
    L.push(`${c.반이름}: ${firstClassLabel(c)}`);
  }
  L.push(`첫날은 코치 선생님이 5분 일찍 열어두고 기다리겠습니다.`);
  L.push('');

  if (카톡채널링크) {
    L.push(`세팅하시다가 막히는 부분이 있으면 카카오톡 채널로 언제든 말씀해주세요. 사진 한 장 보내주시면 바로 봐드립니다.`);
  } else {
    L.push(`세팅하시다가 막히는 부분이 있으면 이 번호로 문자 주세요. 확인 후 연락드리겠습니다.`);
  }
  L.push('');
  L.push(`다시 한번 감사합니다. 첫 수업에서 뵙겠습니다.`);
  L.push(`Julia 드림`);

  return L.join('\n');
}
