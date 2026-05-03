const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

const sentryEnabled = !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN;

const sentryBuildOptions = {
  // Sentry 콘솔에서 발급된 org/project (소스맵 업로드용 — 미설정시 업로드 스킵)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // 빌드 로그 최소화
  silent: !process.env.CI,

  // 소스맵: 운영 디버깅용 업로드 (auth token 있을때만)
  widenClientFileUpload: true,

  // /monitoring 이라는 리버스 프록시 라우트 자동 생성 (광고차단기 우회)
  tunnelRoute: "/monitoring",

  // 빌드 시 라이브러리 내부 console.log 제거
  disableLogger: true,

  // 자동 instrumentation (서버/엣지 라우트 트레이싱)
  automaticVercelMonitors: true,
};

module.exports = sentryEnabled
  ? withSentryConfig(nextConfig, sentryBuildOptions)
  : nextConfig;
