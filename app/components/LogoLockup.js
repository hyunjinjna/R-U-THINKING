'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 로고 + "알유띵킹 어학원" / "관리형 온라인 영어학원" 락업.
 * withSub=true면 윗줄 자간을 아랫줄 실제 폭에 맞게 자동 계산해
 * 두 줄의 양끝을 기기·글꼴과 무관하게 픽셀 단위로 맞춘다.
 */
export default function LogoLockup({ withSub = false }) {
  const topRef = useRef(null);
  const subRef = useRef(null);
  const [spacing, setSpacing] = useState(0);

  useLayoutEffect(() => {
    if (!withSub) return;

    const compute = () => {
      const top = topRef.current;
      const sub = subRef.current;
      if (!top || !sub) return;

      // 윗줄의 자간 0 상태 '글자만의' 자연 폭을 잰 뒤 원복.
      // (요소 폭을 재면 안 된다 — display:block이라 부모 폭(=아랫줄 폭)으로 늘어나 항상 같게 나옴)
      const prev = top.style.letterSpacing;
      top.style.letterSpacing = '0px';
      const range = document.createRange();
      range.selectNodeContents(top);
      const topW = range.getBoundingClientRect().width;
      top.style.letterSpacing = prev;

      const subW = sub.getBoundingClientRect().width;
      const chars = (top.textContent || '').length;
      // letter-spacing은 글자마다 뒤에 붙으므로, 눈에 보이는 마지막 글자 끝을 아랫줄 끝에
      // 맞추려면 (글자 수 − 1)개 간격으로 나눠야 한다. (chars로 나누면 한 칸만큼 짧게 끝남)
      if (chars > 1 && subW > topW + 0.5) {
        setSpacing((subW - topW) / (chars - 1));
      } else {
        setSpacing(0);
      }
    };

    compute();
    // 웹폰트(Pretendard) 로드가 끝나면 폭이 달라지므로 재계산 (+안전망으로 한 번 더)
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(compute).catch(() => {});
    }
    const t = setTimeout(compute, 800);
    return () => clearTimeout(t);
  }, [withSub]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'flex-start' }}>
      <img
        src="/logo.png"
        alt="알유띵킹 어학원"
        style={{ width: withSub ? 46 : 36, height: withSub ? 46 : 36, flex: 'none' }}
      />
      <span style={{ display: 'inline-block' }}>
        <span
          ref={topRef}
          style={{
            display: 'block',
            fontSize: withSub ? 17.5 : 15,
            fontWeight: 800,
            color: 'var(--navy)',
            letterSpacing: withSub ? `${spacing}px` : 0,
            marginRight: withSub ? `${-spacing}px` : 0, // 마지막 글자 뒤 여백 보정
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
          }}
        >
          알유띵킹 어학원
        </span>
        {withSub && (
          <span
            ref={subRef}
            style={{
              display: 'inline-block',
              fontSize: 13,
              color: 'var(--light)',
              marginTop: 2,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}
          >
            관리형 온라인 영어학원
          </span>
        )}
      </span>
    </div>
  );
}
