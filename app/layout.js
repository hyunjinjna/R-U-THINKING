import './globals.css';

export const metadata = {
  title: 'R U Thinking?',
  description: '온라인 관리형 영어학원',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
          crossOrigin="anonymous"
          async
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
