import type { NextConfig } from "next";
import withPWAInit, { runtimeCaching } from "@ducanh2912/next-pwa";

const isStorybook = process.env.STORYBOOK === "true";
const isProduction = process.env.NODE_ENV === "production";
const customDistDir = process.env.NEXT_DIST_DIR?.trim();
const contentSecurityPolicy =
  "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https: wss:; worker-src 'self' blob:; manifest-src 'self';";
const contentSecurityPolicyReportOnly =
  "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https: wss:; worker-src 'self' blob:; manifest-src 'self';";
const securityRuntimeCaching = [
  {
    urlPattern: /^\/api\/.*/,
    handler: "NetworkOnly" as const,
    options: { cacheName: "no-cache-auth" },
  },
  {
    urlPattern: /^\/auth(\/.*)?$/,
    handler: "NetworkOnly" as const,
    method: "GET" as const,
    options: { cacheName: "no-cache-auth" },
  },
  {
    urlPattern: /^\/parent(\/.*)?$/,
    handler: "NetworkOnly" as const,
    method: "GET" as const,
    options: { cacheName: "no-cache-auth" },
  },
  {
    urlPattern: /^\/child(\/.*)?$/,
    handler: "NetworkOnly" as const,
    method: "GET" as const,
    options: { cacheName: "no-cache-auth" },
  },
  ...runtimeCaching,
];

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development" || isStorybook,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: { runtimeCaching: securityRuntimeCaching },
  fallbacks: { document: "/~offline" },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: contentSecurityPolicy,
      },
      {
        key: "Content-Security-Policy-Report-Only",
        value: contentSecurityPolicyReportOnly,
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
      },
      {
        key: "Cross-Origin-Resource-Policy",
        value: "same-site",
      },
      ...(isProduction
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains; preload",
            },
          ]
        : []),
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  ...(customDistDir ? { distDir: customDistDir } : {}),
};

export default isStorybook ? nextConfig : withPWA(nextConfig);
