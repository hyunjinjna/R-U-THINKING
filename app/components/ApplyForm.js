'use client';

import { useState } from 'react';

// ===== 자체 등록폼 (2026-09-24, 구글폼 대체) =====
// 톡톡 스타일 스텝형: 한 화면에 질문 1~2개. 수업·신청 종류는 장바구니에서 자동 전달.

const FIRST = '영어가 처음이에요';
const EXP_OPTIONS = [FIRST, '1년 미만', '1~2년', '3~4년', '5년+'];
const PREV_METHODS = ['학원', '과외', '학습지', '엄마표', FIRST];
// 영역별 학습 기간 (2026-09-25): 파닉스만 뗐어요/안 뗐어요, 나머지는 기간
const AREAS = [
  { key: 'phonics', label: '파닉스', options: ['뗐어요', '안 뗐어요'], none: '안 뗐어요' },
  { key: 'reading', label: '리딩', options: ['안 해봄', '1년 미만', '1~2년', '3년+'], none: '안 해봄' },
  { key: 'grammar', label: '문법', options: ['안 해봄', '1년 미만', '1~2년', '3년+'], none: '안 해봄' },
  { key: 'voca', label: '단어', options: ['안 해봄', '1년 미만', '1~2년', '3년+'], none: '안 해봄' },
  { key: 'speaking', label: '스피킹', options: ['안 해봄', '1년 미만', '1~2년', '3년+'], none: '안 해봄' },
  { key: 'writing', label: '라이팅', options: ['안 해봄', '1년 미만', '1~2년', '3년+'], none: '안 해봄' },
];
const CONCERNS = [
  '아직 영어 글자를 잘 못 읽어요',
  '소리 내서 읽는 게 느리고 더듬어요',
  '읽어도 내용을 잘 몰라요',
  '긴 글만 나오면 포기해요',
  '단어가 잘 안 외워져요',
  '외워도 금방 잊어버려요',
  '문법이 약해요',
  '설명은 아는데 문제에서 틀려요',
  '발음·말하기가 걱정돼요',
  '영어로 한마디도 안 하려고 해요',
  '영어 문장을 못 써요',
  '스펠링을 자주 틀려요',
  '꾸준히 안 해요',
  '영어를 싫어하고 자신감이 없어요',
  '숙제를 혼자 못 해요',
  '학원을 다녀도 실력이 제자리예요',
  '학년에 비해 뒤처진 것 같아요',
  '중학교 영어가 벌써 걱정돼요',
];
const CHANNELS = ['인스타그램', '유튜브', '블로그', '지인 소개', '검색', '기타'];

const inputStyle = { fontSize: 17, padding: '14px 12px', width: '100%' };

function Label({ children, optional }) {
  return (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>
      {children}
      {optional && <span style={{ color: 'var(--light)', fontWeight: 500 }}> (선택)</span>}
    </label>
  );
}

function Chip({ text, on, onClick, small }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: small ? '7px 11px' : '10px 14px', borderRadius: 999, fontSize: small ? 13 : 14.5, fontWeight: 700, cursor: 'pointer',
        border: on ? '2px solid var(--navy)' : '1px solid var(--border)',
        background: on ? 'var(--navy)' : '#fff',
        color: on ? '#fff' : 'var(--dark)',
      }}
    >
      {text}
    </button>
  );
}

export default function ApplyForm({ enrollItems = [], waitItems = [], kind, items, kakaoLink, onBack, onRestart }) {
  // 2026-09-25 통합 신청: 등록분·대기분을 한 폼으로. (예전 호출 방식 {kind, items}도 받는다)
  const enroll = enrollItems.length > 0 || waitItems.length > 0 ? enrollItems : (kind === '대기' ? [] : (items || []));
  const wait = enrollItems.length > 0 || waitItems.length > 0 ? waitItems : (kind === '대기' ? (items || []) : []);
  const hasEnroll = enroll.length > 0;
  const hasWait = wait.length > 0;
  const kindLabel = hasEnroll && hasWait ? '수업 신청' : hasEnroll ? '등록 신청' : '대기 신청';
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  const [studentName, setStudentName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [grade, setGrade] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [address, setAddress] = useState('');
  const [experience, setExperience] = useState('');
  const [prevMethods, setPrevMethods] = useState([]);
  const [areas, setAreas] = useState({}); // { phonics: '뗐어요', reading: '1~2년', ... }
  const [concerns, setConcerns] = useState([]);
  const [concernEtc, setConcernEtc] = useState('');
  const [channel, setChannel] = useState('');
  const [channelEtc, setChannelEtc] = useState('');
  const [payMethod, setPayMethod] = useState('계좌이체');

  const isEnroll = hasEnroll; // 결제 단계는 등록분이 있을 때만
  // 스텝: 0 학생 / 1 학부모 / 2 경력 / 3 걱정 / 4 경로 / 5 결제(등록분 있을 때만) / 6 확인
  const steps = isEnroll ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 6];
  const [partial, setPartial] = useState(null); // 통합 신청에서 한쪽만 실패했을 때 { okKinds, failedKinds }

  // "영어가 처음이에요" → 파닉스 '안 뗐어요' + 나머지 '안 해봄' 자동 (수정 가능)
  const fillNone = () => setAreas(Object.fromEntries(AREAS.map((a) => [a.key, a.none])));
  const pickExperience = (v) => { setExperience(v); setErr(''); if (v === FIRST) fillNone(); };
  const togglePrev = (m) => {
    const on = prevMethods.includes(m);
    setPrevMethods(on ? prevMethods.filter((x) => x !== m) : [...prevMethods, m]);
    if (m === FIRST && !on) fillNone();
  };
  const pos = steps.indexOf(step);
  const total = steps.length;

  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const phoneOk = /^010\d{8}$/.test(String(parentPhone).replace(/[^0-9]/g, ''));

  const next = () => {
    setErr('');
    if (step === 0) {
      if (!studentName.trim()) return setErr('학생 이름을 입력해주세요.');
      if (!grade.trim()) return setErr('학년을 입력해주세요.');
    }
    if (step === 1) {
      if (!parentName.trim()) return setErr('학부모 이름을 입력해주세요.');
      if (!phoneOk) return setErr('연락처를 정확히 입력해주세요. (010으로 시작하는 11자리)');
      if (!address.trim()) return setErr('집주소를 입력해주세요. (포인트 상품 배송에 쓰여요)');
    }
    if (step === 2) {
      if (!experience) return setErr('전체 학습 기간을 골라주세요.');
      const missing = AREAS.filter((a) => !areas[a.key]);
      if (missing.length > 0) return setErr(`영역별로 골라주세요: ${missing.map((a) => a.label).join(', ')}`);
    }
    if (step === 4 && !channel) return setErr('알게 된 경로를 선택해주세요.');
    setStep(steps[pos + 1]);
  };

  const back = () => {
    setErr('');
    if (pos === 0) onBack();
    else setStep(steps[pos - 1]);
  };

  const submit = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollItems: enroll,
          waitItems: wait,
          form: {
            studentName: studentName.trim(),
            englishName: englishName.trim(),
            grade: grade.trim(),
            parentName: parentName.trim(),
            parentPhone,
            studentPhone,
            address: address.trim(),
            experience: experience.trim(),
            prevMethods,
            areas,
            concerns: concernEtc.trim() ? [...concerns, `기타: ${concernEtc.trim()}`] : concerns,
            channel: channel === '기타' && channelEtc.trim() ? `기타: ${channelEtc.trim()}` : channel,
            payMethod: isEnroll ? payMethod : '',
          },
        }),
      });
      const json = await res.json();
      if (json.ok) setDone(true);
      else {
        const r = json.results || {};
        const okKinds = Object.keys(r).filter((k) => r[k]?.ok);
        const failedKinds = Object.keys(r).filter((k) => !r[k]?.ok);
        setPartial(okKinds.length > 0 ? { okKinds, failedKinds } : null);
        setFailed(true);
        setErr(json.error || '제출에 실패했습니다.');
      }
    } catch (e) {
      setFailed(true);
      setErr('제출에 실패했습니다: ' + e.message);
    }
    setLoading(false);
  };

  // ===== 완료 =====
  if (done) {
    return (
      <main className="container">
        <div style={{ textAlign: 'center', paddingTop: 70 }}>
          <div style={{ fontSize: 56, marginBottom: 22 }}>🎉</div>
          <h1 className="page-title" style={{ fontSize: 24 }}>신청이 접수되었어요!</h1>
          <div style={{ fontSize: 15.5, lineHeight: 1.9, color: 'var(--med)', marginTop: 16 }}>
            {hasEnroll && (
              <p style={{ margin: '0 0 10px' }}>
                {hasWait && <b style={{ color: 'var(--navy)' }}>등록 신청 ({enroll.map((i) => i.레벨).join(', ')})</b>}
                {hasWait && <br />}
                확인 후 <b>결제 안내를 카톡으로</b> 보내드릴게요.<br />입금이 확인되면 등록 확정과 함께 수업 안내를 보내드립니다.
              </p>
            )}
            {hasWait && (
              <p style={{ margin: 0 }}>
                {hasEnroll && <b style={{ color: 'var(--navy)' }}>대기 신청 ({wait.map((i) => i.레벨).join(', ')})</b>}
                {hasEnroll && <br />}
                자리가 열리면 <b>카톡으로 바로</b> 안내드릴게요.
              </p>
            )}
            <p style={{ marginTop: 12 }}>기다려주셔서 감사합니다!</p>
          </div>
          {onRestart && (
            <button className="btn btn-outline" style={{ marginTop: 26 }} onClick={onRestart}>
              처음으로 돌아가기
            </button>
          )}
        </div>
      </main>
    );
  }

  // ===== 실패 안전망 =====
  if (failed) {
    return (
      <main className="container">
        <button className="back-link" onClick={() => { setFailed(false); setErr(''); }}>← 다시 시도하기</button>
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 18 }}>😢</div>
          <h1 className="page-title" style={{ fontSize: 22 }}>{partial ? '일부만 접수됐어요' : '제출이 안 됐어요'}</h1>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--med)', marginTop: 12 }}>
            {partial ? (
              <><b>{partial.okKinds.join('·')} 신청은 접수됐고</b>, {partial.failedKinds.join('·')} 신청만 기록되지 않았어요.<br />카톡으로 남겨주시면 바로 처리해드릴게요.</>
            ) : (
              <>잠시 후 다시 시도해주시거나,<br />카톡으로 남겨주시면 바로 도와드릴게요.</>
            )}
          </p>
          {err && <div className="error-box" style={{ marginTop: 16, textAlign: 'left' }}>{err}</div>}
          {kakaoLink && (
            <a href={kakaoLink} target="_blank" rel="noopener noreferrer">
              <button className="btn" style={{ marginTop: 18, background: '#fee500', color: '#191919' }}>
                💬 카톡으로 신청 남기기
              </button>
            </a>
          )}
        </div>
      </main>
    );
  }

  const lineOf = (list) => list.map((i) => `${i.레벨} (${i.요일시간})`).join(', ');
  const areasLine = AREAS.map((a) => `${a.label} ${areas[a.key] || '-'}`).join(' · ');

  return (
    <main className="container">
      <button className="back-link" onClick={back}>← 이전으로</button>

      {/* 진행 표시 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 6, marginBottom: 18 }}>
        {steps.map((s, i) => (
          <span key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= pos ? 'var(--navy)' : 'var(--border)' }} />
        ))}
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--light)', marginBottom: 4 }}>
        {kindLabel} · {pos + 1}/{total}
      </div>

      {step === 0 && (
        <>
          <h1 className="page-title" style={{ fontSize: 21 }}>아이에 대해 알려주세요</h1>
          <div className="field" style={{ marginTop: 16 }}>
            <Label>학생 이름</Label>
            <input type="text" value={studentName} onChange={(e) => { setStudentName(e.target.value); setErr(''); }} placeholder="예: 김하늘" style={inputStyle} />
          </div>
          <div className="field">
            <Label optional>영어 이름</Label>
            <input type="text" value={englishName} onChange={(e) => setEnglishName(e.target.value)} placeholder="예: Sky" style={inputStyle} />
          </div>
          <div className="field">
            <Label>학년</Label>
            <input type="text" value={grade} onChange={(e) => { setGrade(e.target.value); setErr(''); }} placeholder="예: 초3" style={inputStyle} />
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h1 className="page-title" style={{ fontSize: 21 }}>연락받으실 정보를 알려주세요</h1>
          <div className="field" style={{ marginTop: 16 }}>
            <Label>학부모 이름</Label>
            <input type="text" value={parentName} onChange={(e) => { setParentName(e.target.value); setErr(''); }} placeholder="예: 김지현" style={inputStyle} />
          </div>
          <div className="field">
            <Label>학부모 연락처</Label>
            <input type="tel" value={parentPhone} onChange={(e) => { setParentPhone(e.target.value); setErr(''); }} placeholder="01012345678" style={inputStyle} />
          </div>
          <div className="field">
            <Label optional>학생 연락처</Label>
            <input type="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} placeholder="01012345678" style={inputStyle} />
          </div>
          <div className="field">
            <Label>집주소</Label>
            <input type="text" value={address} onChange={(e) => { setAddress(e.target.value); setErr(''); }} placeholder="예: 서울시 ○○구 ○○로 12, 101동 202호" style={inputStyle} />
            <p style={{ fontSize: 12, color: 'var(--light)', marginTop: 6 }}>포인트 마켓 상품을 보내드릴 때 쓰여요.</p>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="page-title" style={{ fontSize: 21 }}>영어 공부, 어떻게 해왔나요?</h1>
          <div className="field" style={{ marginTop: 16 }}>
            <Label>전체 학습 기간</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {EXP_OPTIONS.map((v) => (
                <Chip key={v} text={v} on={experience === v} onClick={() => pickExperience(v)} />
              ))}
            </div>
          </div>
          <div className="field">
            <Label optional>주로 어떻게 공부했나요? (여러 개 선택 가능)</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {PREV_METHODS.map((m) => (
                <Chip key={m} text={m} on={prevMethods.includes(m)} onClick={() => togglePrev(m)} />
              ))}
            </div>
          </div>
          <div className="field">
            <Label>영역별로 얼마나 해봤나요?</Label>
            <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
              {AREAS.map((a) => (
                <div key={a.key}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>{a.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {a.options.map((o) => (
                      <Chip key={o} text={o} small on={areas[a.key] === o}
                        onClick={() => { setAreas({ ...areas, [a.key]: o }); setErr(''); }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="page-title" style={{ fontSize: 21 }}>가장 걱정되는 점이 있나요?</h1>
          <p className="page-sub" style={{ fontSize: 14 }}>여러 개 선택하셔도 좋아요. 첫 수업 설계에 반영합니다.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {CONCERNS.map((c) => (
              <Chip key={c} text={c} on={concerns.includes(c)} onClick={() => toggle(concerns, setConcerns, c)} />
            ))}
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <Label optional>기타</Label>
            <input type="text" value={concernEtc} onChange={(e) => setConcernEtc(e.target.value)} placeholder="직접 적어주세요" style={inputStyle} />
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h1 className="page-title" style={{ fontSize: 21 }}>저희를 어떻게 알게 되셨나요?</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {CHANNELS.map((c) => (
              <Chip key={c} text={c} on={channel === c} onClick={() => { setChannel(c); setErr(''); }} />
            ))}
          </div>
          {channel === '기타' && (
            <div className="field" style={{ marginTop: 14 }}>
              <input type="text" value={channelEtc} onChange={(e) => setChannelEtc(e.target.value)} placeholder="직접 적어주세요" style={inputStyle} />
            </div>
          )}
        </>
      )}

      {step === 5 && isEnroll && (
        <>
          <h1 className="page-title" style={{ fontSize: 21 }}>결제 방법</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            <Chip text="계좌이체" on={payMethod === '계좌이체'} onClick={() => setPayMethod('계좌이체')} />
          </div>
          <div className="notice" style={{ marginTop: 16, fontSize: 14 }}>
            제출하시면 확인 후 <b>결제 안내를 카톡으로</b> 보내드려요. 입금이 확인되면 등록이 확정됩니다.
          </div>
        </>
      )}

      {step === 6 && (
        <>
          <h1 className="page-title" style={{ fontSize: 21 }}>이대로 신청할까요?</h1>
          <div className="card" style={{ display: 'block', cursor: 'default', marginTop: 16, lineHeight: 2 }}>
            <div style={{ fontSize: 14.5 }}>
              {hasEnroll && <><b>{hasWait ? '등록 신청' : '신청 수업'}</b> · {lineOf(enroll)}<br /></>}
              {hasWait && <><b>{hasEnroll ? '대기 신청' : '신청 수업'}</b> · {lineOf(wait)}<br /></>}
              <b>학생</b> · {studentName} {englishName && `(${englishName})`} · {grade}<br />
              <b>학부모</b> · {parentName} · {parentPhone}<br />
              {experience && <><b>학습 기간</b> · {experience}{prevMethods.length > 0 ? ` (${prevMethods.join(', ')})` : ''}<br /></>}
              <span style={{ fontSize: 13, color: 'var(--med)' }}>{areasLine}</span><br />
              {isEnroll && <><b>결제</b> · {payMethod}</>}
            </div>
          </div>
        </>
      )}

      {err && <div className="error-box" style={{ marginTop: 14 }}>{err}</div>}

      {step === 6 ? (
        <button className="btn btn-teal" style={{ marginTop: 18 }} onClick={submit} disabled={loading}>
          {loading ? '제출 중...' : hasEnroll && hasWait ? '신청하기' : hasEnroll ? '등록 신청하기' : '대기 신청하기'}
        </button>
      ) : (
        <button className="btn" style={{ marginTop: 18 }} onClick={next}>다음</button>
      )}
    </main>
  );
}
