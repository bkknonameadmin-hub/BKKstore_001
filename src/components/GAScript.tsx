import Script from "next/script";

/**
 * GA4 (Google Analytics 4) 스크립트 로더
 * - NEXT_PUBLIC_GA_ID 미설정시 아무것도 렌더하지 않음
 * - Next.js Script with strategy="afterInteractive" 로 최적 로딩
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function GAScript() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure',
            send_page_view: true,
          });
        `}
      </Script>
    </>
  );
}
