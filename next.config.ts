import type { NextConfig } from "next";
import withPWAInit, { runtimeCaching } from "@ducanh2912/next-pwa";

const isStorybook = process.env.STORYBOOK === "true";
const customDistDir = process.env.NEXT_DIST_DIR?.trim();

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development" || isStorybook,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: { runtimeCaching },
  fallbacks: { document: "/~offline" },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(customDistDir ? { distDir: customDistDir } : {}),
};

export default isStorybook ? nextConfig : withPWA(nextConfig);
